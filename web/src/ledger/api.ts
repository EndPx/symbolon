// Shared ledger reads, with transport-specific signing. Local demo and compatible
// PartyLayer wallets use the JSON Ledger API; Grofty reads its narrow own-party
// surface and submits through native prepareExecuteAndWait.

export type Method = "GET" | "POST";

export interface Transport {
  readonly kind: "sandbox" | "wallet";
  request<T>(method: Method, resource: string, body?: unknown): Promise<T>;
  /** Wallet-native signing is separate from a wallet's read-only ledger surface. */
  submit?(party: string, commands: Command[], options?: SubmissionOptions): Promise<string>;
}

export interface DisclosedContract {
  templateId: string;
  contractId: string;
  createdEventBlob: string;
  synchronizerId: string;
}

export interface SubmissionOptions {
  disclosedContracts?: DisclosedContract[];
  synchronizerId?: string;
  packageIdSelectionPreference?: string[];
}

/** Talks to a local `dpm sandbox` through the dev proxy in vite.config.ts. */
/**
 * Where the app reads from when no wallet is connected.
 *
 * In dev that is the Vite proxy at /ledger. Deployed there is no proxy, so
 * this has to name a reachable Canton JSON API or the public side of the app
 * has nothing to show. Set VITE_LEDGER_URL to that origin.
 */
export const publicLedgerBase = (): string =>
  import.meta.env?.VITE_LEDGER_URL ?? "/ledger";

export function sandboxTransport(base = publicLedgerBase()): Transport {
  return {
    kind: "sandbox",
    async request<T>(method: Method, resource: string, body?: unknown) {
      const res = await fetch(base + resource, {
        method,
        signal: AbortSignal.timeout(30_000),
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) throw new LedgerError(describe(text, res.status));
      return parseResponse(text || "{}") as T;
    },
  };
}

/** Routes every call through the connected wallet (Loop, Console, …). */
export function walletTransport(client: {
  ledgerApi(p: {
    requestMethod: Method;
    resource: string;
    body?: string | Record<string, unknown>;
  }): Promise<unknown>;
}): Transport {
  return {
    kind: "wallet",
    async request<T>(method: Method, resource: string, body?: unknown) {
      const out = await client.ledgerApi({
        requestMethod: method,
        resource,
        body: body as Record<string, unknown> | undefined,
      });
      // Adapters differ on whether they hand back the parsed body or a wrapper
      // around it; unwrap the common shapes rather than trusting one.
      const raw = out as Record<string, unknown>;
      const inner = raw?.response ?? raw?.result ?? raw?.data ?? raw?.body ?? raw;
      return parseResponse(inner) as T;
    },
  };
}

export class LedgerError extends Error {}

export function parseResponse(value: unknown): unknown {
  let parsed: unknown;
  try {
    parsed = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    throw new LedgerError("The participant returned an invalid JSON response.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new LedgerError("The participant returned an empty response.");
  }
  const error = parsed as Record<string, unknown>;
  if (error.error || error.errors || (error.code && error.cause)) {
    throw new LedgerError(describe(JSON.stringify(error), 400));
  }
  return parsed;
}

function describe(text: string, status: number): string {
  try {
    const j = JSON.parse(text);
    const message = j.cause || j.error || j.errors || j.message || j.code;
    return typeof message === "string" ? message : message ? JSON.stringify(message) : `HTTP ${status}`;
  } catch {
    return text.slice(0, 200) || `HTTP ${status}`;
  }
}

/** A created contract, flattened to the two things callers actually use. */
export interface Contract<T = Record<string, unknown>> {
  contractId: string;
  templateId: string;
  payload: T;
  createdEventBlob?: string;
  synchronizerId?: string;
}

export type Command =
  | {
      CreateCommand: {
        templateId: string;
        createArguments: Record<string, unknown>;
      };
    }
  | {
      ExerciseCommand: {
        templateId: string;
        contractId: string;
        choice: string;
        choiceArgument: Record<string, unknown>;
      };
    };

export const create = (
  templateId: string,
  createArguments: Record<string, unknown>,
): Command => ({ CreateCommand: { templateId, createArguments } });

export const exercise = (
  templateId: string,
  contractId: string,
  choice: string,
  choiceArgument: Record<string, unknown> = {},
): Command => ({
  ExerciseCommand: { templateId, contractId, choice, choiceArgument },
});

export class LedgerApi {
  constructor(
    private readonly transport: Transport,
    // Authenticated wallets let the participant derive the user from its token.
    private readonly userId?: string,
  ) {}

  get kind() {
    return this.transport.kind;
  }

  async ledgerEnd(): Promise<number> {
    const r = await this.transport.request<{ offset: number }>(
      "GET",
      "/v2/state/ledger-end",
    );
    if (!Number.isSafeInteger(r.offset) || r.offset < 0) {
      throw new LedgerError("The participant did not return a valid ledger offset.");
    }
    return r.offset;
  }

  async parties(): Promise<string[]> {
    const r = await this.transport.request<{
      partyDetails: { party: string }[];
    }>("GET", "/v2/parties");
    return (r.partyDetails ?? []).map((p) => p.party);
  }

  /** Everything `party` can currently see. */
  async activeContracts(party: string): Promise<Contract[]> {
    const activeAtOffset = await this.ledgerEnd();
    const rows = await this.transport.request<unknown[]>(
      "POST",
      "/v2/state/active-contracts",
      {
        filter: {
          filtersByParty: {
            [party]: {
              cumulative: [
                {
                  identifierFilter: {
                    WildcardFilter: { value: { includeCreatedEventBlob: false } },
                  },
                },
              ],
            },
          },
        },
        verbose: false,
        activeAtOffset,
      },
    );
    if (!Array.isArray(rows)) throw new LedgerError("The participant did not return a contract list.");
    return rows.flatMap((row) => {
      const active = (row as { contractEntry?: { JsActiveContract?: { synchronizerId?: string; createdEvent?: {
        contractId: string; templateId: string; createArgument?: Record<string, unknown>;
        createdEventBlob?: string;
      } } } })?.contractEntry?.JsActiveContract;
      const ev = active?.createdEvent;
      if (!ev?.contractId) return [];
      return [
        {
          contractId: ev.contractId as string,
          templateId: ev.templateId as string,
          payload: (ev.createArgument ?? {}) as Record<string, unknown>,
          ...(ev.createdEventBlob ? { createdEventBlob: ev.createdEventBlob } : {}),
          ...(active?.synchronizerId ? { synchronizerId: active.synchronizerId } : {}),
        },
      ];
    });
  }

  /** Submits and waits; returns the ledger's update id. */
  async submit(actAs: string, commands: Command[], options: SubmissionOptions = {}): Promise<string> {
    if (!actAs || commands.length === 0) throw new LedgerError("A party and at least one command are required.");
    if (this.transport.submit) return this.transport.submit(actAs, commands, options);
    const r = await this.transport.request<{ updateId: string }>(
      "POST",
      "/v2/commands/submit-and-wait",
      {
        commands,
        commandId: `symbolon-${crypto.randomUUID()}`,
        actAs: [actAs],
        readAs: [actAs],
        ...(this.userId ? { userId: this.userId } : {}),
        ...options,
      },
    );
    if (typeof r.updateId !== "string" || !r.updateId) {
      throw new LedgerError("No transaction receipt was returned. Refresh the book before retrying.");
    }
    return r.updateId;
  }
}

// Canton's JSON encoding takes Int64 as a STRING, not a number — sending 3600
// is rejected with "Expected ujson.Str". Decimals are strings for the same
// reason. These two helpers keep that fact in one place.
export const int = (n: number | string) => String(n);
export const dec = (n: number | string) =>
  typeof n === "string" ? n : n.toFixed(10);
