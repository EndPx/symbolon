// One ledger client, two ways of reaching a participant.
//
// Canton's JSON Ledger API is the same whether the call goes out from this tab
// or from a user's wallet, so the difference is confined to a Transport: the
// sandbox one fetches through Vite's dev proxy, the wallet one hands the exact
// same resource + body to PartyLayer and lets the wallet sign and send it.
// Everything above this line is written once.

export type Method = "GET" | "POST";

export interface Transport {
  readonly kind: "sandbox" | "wallet";
  request<T>(method: Method, resource: string, body?: unknown): Promise<T>;
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
  import.meta.env.VITE_LEDGER_URL ?? "/ledger";

export function sandboxTransport(base = publicLedgerBase()): Transport {
  return {
    kind: "sandbox",
    async request<T>(method: Method, resource: string, body?: unknown) {
      const res = await fetch(base + resource, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) throw new LedgerError(describe(text, res.status));
      return (text ? JSON.parse(text) : {}) as T;
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
      const inner = raw?.result ?? raw?.data ?? raw?.body ?? raw;
      return (typeof inner === "string" ? JSON.parse(inner) : inner) as T;
    },
  };
}

export class LedgerError extends Error {}

function describe(text: string, status: number): string {
  try {
    const j = JSON.parse(text);
    return j.cause || j.error || j.code || `HTTP ${status}`;
  } catch {
    return text.slice(0, 200) || `HTTP ${status}`;
  }
}

/** A created contract, flattened to the two things callers actually use. */
export interface Contract<T = Record<string, unknown>> {
  contractId: string;
  templateId: string;
  payload: T;
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
    private readonly userId = "symbolon",
  ) {}

  get kind() {
    return this.transport.kind;
  }

  async ledgerEnd(): Promise<number> {
    const r = await this.transport.request<{ offset: number }>(
      "GET",
      "/v2/state/ledger-end",
    );
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
    return (rows ?? []).flatMap((row) => {
      const ev = (row as any)?.contractEntry?.JsActiveContract?.createdEvent;
      if (!ev?.contractId) return [];
      return [
        {
          contractId: ev.contractId as string,
          templateId: ev.templateId as string,
          payload: (ev.createArgument ?? {}) as Record<string, unknown>,
        },
      ];
    });
  }

  /** Submits and waits; returns the ledger's update id. */
  async submit(actAs: string, commands: Command[]): Promise<string> {
    const r = await this.transport.request<{ updateId: string }>(
      "POST",
      "/v2/commands/submit-and-wait",
      {
        commands,
        commandId: `symbolon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        actAs: [actAs],
        readAs: [actAs],
        userId: this.userId,
      },
    );
    return r.updateId;
  }
}

// Canton's JSON encoding takes Int64 as a STRING, not a number — sending 3600
// is rejected with "Expected ujson.Str". Decimals are strings for the same
// reason. These two helpers keep that fact in one place.
export const int = (n: number | string) => String(n);
export const dec = (n: number | string) =>
  typeof n === "string" ? n : n.toFixed(10);
