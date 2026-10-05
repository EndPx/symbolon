import {
  createGroftyClient, type CantonAccount, type GroftyClient, type StatusEvent,
} from "@groftylabs/dapp-sdk";
import { LedgerApi, LedgerError, parseResponse, type Method, type SubmissionOptions, type Transport } from "./api";
import type { Session } from "./session";
import { partyLabel } from "./symbolon";

export const GROFTY_WALLET_ID = "grofty";
export const GROFTY_NETWORK_ID = "canton:da-mainnet";
export const GROFTY_MIN_VERSION = "2.0.4";
export const GROFTY_APPROVAL_SECONDS = 180;
// The wallet owns its 180-second approval deadline. The SDK ceiling must not race it.
export const GROFTY_REQUEST_TIMEOUT_MS = 240_000;

export function supportedGroftyVersion(version: string): boolean {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:\+[\w.-]+)?$/.exec(version);
  if (!match) return false;
  const [major, minor, patch] = match.slice(1).map(Number);
  return major > 2 || (major === 2 && (minor > 0 || patch >= 4));
}

export class WalletSessionChanged extends Error {
  constructor(message = "The wallet account or network changed. Reconnect before continuing.") {
    super(message); this.name = "WalletSessionChanged";
  }
}

export class GroftyRequestError extends Error {
  constructor(message: string, readonly code: number) {
    super(message); this.name = "GroftyRequestError";
  }
}

/** Numeric codes distinguish a declined approval from an uncertain outcome. */
export function groftyError(error: unknown): Error {
  if (error instanceof WalletSessionChanged || error instanceof GroftyRequestError) return error;
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code !== "number") return error instanceof Error ? error : new Error("Grofty request failed.");
  const messages: Record<number, string> = {
    4001: "You declined the Grofty request. No approval was given.",
    4100: "Grofty is locked, signed out, or no longer connected. Unlock it and reconnect.",
    4900: "Grofty disconnected. Reconnect before continuing.",
    4901: "Grofty lost its MainNet connection. Reconnect before continuing.",
    [-32601]: "This Grofty capability is unavailable. Install Grofty Wallet 2.0.4 or newer.",
    [-32602]: "Grofty rejected the request parameters. Check the connected party, network and contract inputs.",
    [-32603]: "Grofty could not confirm the request. Approval may have expired after 3 minutes, or an internal error occurred. Check wallet history and refresh the book before retrying.",
  };
  return new GroftyRequestError(messages[code] ?? `Grofty request failed (code ${code}). Check the wallet before retrying.`, code);
}

function checkProvider(status: StatusEvent) {
  if (!status?.provider || !/grofty/i.test(status.provider.id)) {
    throw new Error("The discovered provider did not identify itself as Grofty.");
  }
  if (!supportedGroftyVersion(status.provider.version)) {
    throw new Error(`Grofty Wallet ${GROFTY_MIN_VERSION} or newer is required. Reported version: ${status.provider.version || "unknown"}.`);
  }
  if (status.network && status.network.networkId !== GROFTY_NETWORK_ID) {
    throw new WalletSessionChanged("Grofty must report Canton MainNet. This connection cannot use the DevNet or local desk.");
  }
}

function checkAccount(account: CantonAccount | null): asserts account is CantonAccount {
  if (!account?.primary || !account.partyId || account.status !== "allocated") {
    throw new WalletSessionChanged("Grofty needs an allocated primary Canton party before the desk can connect.");
  }
  if (account.networkId !== GROFTY_NETWORK_ID) {
    throw new WalletSessionChanged("The Grofty account is not on Canton MainNet.");
  }
}

export async function discoverGrofty() {
  const client = await createGroftyClient({ discoveryTimeoutMs: 700, timeoutMs: 5000 });
  if (!client) return { installed: false, unavailableReason: "Install Grofty Wallet 2.0.4 or newer." };
  try {
    const status = await client.status();
    checkProvider(status);
    return { installed: true, version: status.provider.version };
  } catch (error) {
    return { installed: true, unavailableReason: groftyError(error).message };
  }
}

/** Returns null only for a silent restore without a current wallet connection. */
export async function openGroftySession(
  client: GroftyClient,
  interactive: boolean,
  forget: () => void = () => {},
): Promise<Session | null> {
  try {
    const initial = await client.status();
    checkProvider(initial);
    if (!interactive && !initial.connection.isConnected) return null;
    if (interactive) {
      const connected = await client.connect();
      if (!connected.isConnected) throw new Error("Grofty did not authorize this connection.");
    }
    const [status, network, account] = await Promise.all([
      client.status(), client.getActiveNetwork(), client.getPrimaryAccount(),
    ]);
    checkProvider(status);
    checkAccount(account);
    if (!status.connection.isConnected || status.connection.isNetworkConnected === false
      || network.networkId !== GROFTY_NETWORK_ID) {
      throw new WalletSessionChanged("Grofty is not connected to Canton MainNet.");
    }
    return bindGroftySession(client, account, status.provider.version, forget);
  } catch (error) { throw groftyError(error); }
}

export async function connectGrofty(interactive: boolean, forget: () => void) {
  const client = await createGroftyClient({ discoveryTimeoutMs: 1000, timeoutMs: GROFTY_REQUEST_TIMEOUT_MS });
  if (!client) {
    if (!interactive) return null;
    throw new Error("Grofty Wallet was not found. Install version 2.0.4 or newer and reload this page.");
  }
  return openGroftySession(client, interactive, forget);
}

function validateOptions(options: SubmissionOptions) {
  // Runtime callers cannot smuggle authority into an otherwise typed envelope.
  const allowed = new Set(["disclosedContracts", "synchronizerId", "packageIdSelectionPreference"]);
  if (Object.keys(options).some(key => !allowed.has(key))) throw new Error("Unsupported Grofty submission option.");
  for (const contract of options.disclosedContracts ?? []) {
    if (![contract.templateId, contract.contractId, contract.createdEventBlob, contract.synchronizerId]
      .every(value => typeof value === "string" && value.length > 0)) {
      throw new Error("Each disclosed contract requires templateId, contractId, createdEventBlob and synchronizerId.");
    }
  }
}

function bindGroftySession(client: GroftyClient, account: CantonAccount, version: string, forget: () => void): Session {
  const party = account.partyId;
  const listeners = new Set<(reason: string) => void>();
  let invalidReason: string | null = null;
  let disposed = false;
  let submitting = false;
  const subscriptions: Array<() => void> = [];
  const cleanup = () => { for (const off of subscriptions.splice(0)) off(); };
  const invalidate = (reason: string) => {
    if (invalidReason || disposed) return;
    invalidReason = reason;
    cleanup();
    forget();
    for (const listener of listeners) listener(reason);
    listeners.clear();
  };
  const assertBound = () => {
    if (invalidReason || disposed) throw new WalletSessionChanged(invalidReason ?? "This wallet session was closed. Reconnect before continuing.");
  };
  const handle = (error: unknown): never => {
    const normalized = groftyError(error);
    if (normalized instanceof WalletSessionChanged
      || normalized instanceof GroftyRequestError && [4100, 4900, 4901].includes(normalized.code)) {
      invalidate(normalized.message);
    }
    throw normalized;
  };
  const verifyBound = async () => {
    assertBound();
    try {
      const [status, network, current] = await Promise.all([
        client.status(), client.getActiveNetwork(), client.getPrimaryAccount(),
      ]);
      try { checkProvider(status); }
      catch (error) { throw new WalletSessionChanged(groftyError(error).message); }
      checkAccount(current);
      if (!status.connection.isConnected || status.connection.isNetworkConnected === false
        || network.networkId !== GROFTY_NETWORK_ID || current.partyId !== party) {
        throw new WalletSessionChanged();
      }
      assertBound();
    } catch (error) { handle(error); }
  };
  subscriptions.push(client.on("accountsChanged", accounts => {
    const primary = accounts.find(candidate => candidate.primary);
    if (primary?.partyId !== party || primary.status !== "allocated" || primary.networkId !== GROFTY_NETWORK_ID) {
      invalidate("The Grofty account changed. Reconnect to load the new party's book.");
    }
  }));
  subscriptions.push(client.on("statusChanged", status => {
    try {
      checkProvider(status);
      if (!status.connection.isConnected || status.connection.isNetworkConnected === false) {
        invalidate("Grofty disconnected or lost MainNet connectivity. Reconnect to continue.");
      }
    } catch (error) { invalidate(groftyError(error).message); }
  }));
  subscriptions.push(client.on("connected", result => {
    if (!result.isConnected) invalidate("Grofty disconnected. Reconnect to continue.");
  }));

  const transport: Transport = {
    kind: "wallet",
    async request<T>(method: Method, resource: string, body?: unknown) {
      assertBound();
      try {
        let response: unknown;
        if (method === "GET" && resource === "/v2/state/ledger-end") {
          response = await client.ledgerApi({ resource });
        } else if (method === "POST" && resource === "/v2/state/active-contracts") {
          const input = body as { activeAtOffset: number; filter: { filtersByParty: Record<string, unknown> } };
          const parties = Object.keys(input.filter.filtersByParty);
          if (parties.length !== 1 || parties[0] !== party) throw new Error("Grofty can only read its connected party.");
          response = await client.getActiveContracts({ activeAtOffset: input.activeAtOffset, includeCreatedEventBlob: true });
        } else {
          throw new Error("Grofty only exposes the desk's own-party read surface here.");
        }
        assertBound();
        // CIP-0103 providers may return the body directly or in a response envelope.
        const wrapped = response as { response?: unknown } | null;
        return parseResponse(wrapped?.response ?? response) as T;
      } catch (error) { return handle(error); }
    },
    async submit(requestedParty, commands, options = {}) {
      assertBound();
      if (requestedParty !== party) throw new Error("Grofty can only submit for its connected party.");
      validateOptions(options);
      if (submitting) throw new Error("A Grofty approval is already pending. Finish it before submitting again.");
      submitting = true;
      try {
        await verifyBound();
        const commandId = `symbolon-${crypto.randomUUID()}`;
        // No actAs or userId: the wallet supplies its one signing party.
        const result = await client.prepareExecuteAndWait({ commands, commandId, readAs: [party], ...options });
        const tx = result?.tx;
        if (tx?.status !== "executed" || tx.commandId !== commandId
          || typeof tx.payload?.updateId !== "string" || !tx.payload.updateId
          || !Number.isSafeInteger(tx.payload.completionOffset) || tx.payload.completionOffset < 0) {
          throw new LedgerError("Grofty returned no matching committed transaction receipt. Check wallet history before retrying; Wallet 2.0.4 or newer is required.");
        }
        if (invalidReason || disposed) {
          throw new WalletSessionChanged(`The wallet session changed while submission was pending. Transaction ${tx.payload.updateId} committed for the previous party; reconnect and refresh before another action.`);
        }
        return tx.payload.updateId;
      } catch (error) { return handle(error); }
      finally { submitting = false; }
    },
  };
  const api = new LedgerApi(transport);
  return {
    kind: "wallet", party, label: partyLabel(party), wallet: GROFTY_WALLET_ID,
    networkId: GROFTY_NETWORK_ID, walletVersion: version,
    async read() { await verifyBound(); return api.activeContracts(party); },
    submit: (commands, options) => api.submit(party, commands, options),
    onInvalidated(listener) {
      if (invalidReason) listener(invalidReason);
      else listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() { disposed = true; cleanup(); listeners.clear(); },
    async disconnect() {
      disposed = true; cleanup(); listeners.clear(); forget();
      try { await client.disconnect(); } catch (error) { throw groftyError(error); }
    },
  };
}
