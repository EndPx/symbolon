// Who you are on the ledger, and how your commands get there.
//
// Two ways in, one shape out. A real user connects a Canton wallet — Loop,
// Console, Cantor8, whatever they have — and the wallet holds the keys and
// makes the calls. A developer against a local sandbox picks a party from the
// ones the setup script allocated, and the browser talks through the dev proxy.
// The app above never learns which is in play.

import {
  LedgerApi,
  sandboxTransport,
  walletTransport,
  type Command,
} from "./api";
import { partyLabel } from "./symbolon";

export interface Session {
  readonly kind: "sandbox" | "wallet";
  readonly party: string;
  readonly label: string;
  /** Wallet name when connected through one. */
  readonly wallet?: string;
  read(): ReturnType<LedgerApi["activeContracts"]>;
  submit(commands: Command[]): Promise<string>;
  disconnect(): Promise<void>;
}

const STORE_KEY = "symbolon.session";

// ---------------------------------------------------------------- sandbox

export function sandboxApi() {
  return new LedgerApi(sandboxTransport());
}

/** Parties the local setup script allocated, in the order the desk reads. */
export async function listSandboxParties(): Promise<string[]> {
  const wanted = ["borrower", "dealer-a", "dealer-b", "oracle", "issuer"];
  const all = await sandboxApi().parties();
  return wanted.flatMap((w) => all.filter((p) => p.startsWith(w)));
}

export function connectSandbox(party: string): Session {
  const api = sandboxApi();
  localStorage.setItem(STORE_KEY, JSON.stringify({ kind: "sandbox", party }));
  return {
    kind: "sandbox",
    party,
    label: partyLabel(party),
    read: () => api.activeContracts(party),
    submit: (commands) => api.submit(party, commands),
    async disconnect() {
      localStorage.removeItem(STORE_KEY);
    },
  };
}

// ----------------------------------------------------------------- wallet

type PartyLayerClient = {
  listWallets(): Promise<{ id: string; name: string; installed?: boolean }[]>;
  connect(opts?: unknown): Promise<{ partyId: string; walletId: string }>;
  disconnect(): Promise<void>;
  ledgerApi(p: {
    requestMethod: "GET" | "POST";
    resource: string;
    body?: string | Record<string, unknown>;
  }): Promise<unknown>;
};

let client: PartyLayerClient | null = null;

/**
 * PartyLayer pulls in every wallet adapter, so it is loaded on demand — a
 * visitor who never opens the wallet picker never downloads it.
 */
async function partyLayer(network: string): Promise<PartyLayerClient> {
  if (client) return client;
  const mod = await import("@partylayer/sdk");
  client = mod.createPartyLayer({
    network: network as never,
    app: { name: "Symbolon" },
  } as never) as unknown as PartyLayerClient;
  return client;
}

export interface WalletOption {
  id: string;
  name: string;
  installed: boolean;
}

export async function listWalletOptions(
  network = walletNetwork(),
): Promise<WalletOption[]> {
  const c = await partyLayer(network);
  const ws = await c.listWallets();
  return ws.map((w) => ({
    id: w.id,
    name: w.name,
    installed: w.installed !== false,
  }));
}

export async function connectWallet(
  walletId?: string,
  network = walletNetwork(),
): Promise<Session> {
  const c = await partyLayer(network);
  const s = await c.connect(walletId ? { walletId } : undefined);
  const api = new LedgerApi(walletTransport(c));
  localStorage.setItem(
    STORE_KEY,
    JSON.stringify({ kind: "wallet", walletId: s.walletId }),
  );
  return {
    kind: "wallet",
    party: s.partyId,
    label: partyLabel(s.partyId),
    wallet: s.walletId,
    read: () => api.activeContracts(s.partyId),
    submit: (commands) => api.submit(s.partyId, commands),
    async disconnect() {
      localStorage.removeItem(STORE_KEY);
      await c.disconnect();
    },
  };
}

/**
 * Which Canton network the wallet should target. Configurable because the
 * hackathon participant is not known yet — set VITE_CANTON_NETWORK when it is.
 */
export function walletNetwork(): string {
  return import.meta.env.VITE_CANTON_NETWORK ?? "devnet";
}

/** Is a local sandbox answering? Decides which entry the app offers first. */
export async function sandboxAvailable(): Promise<boolean> {
  try {
    await sandboxApi().ledgerEnd();
    return true;
  } catch {
    return false;
  }
}

export function rememberedSession():
  | { kind: "sandbox"; party: string }
  | { kind: "wallet"; walletId?: string }
  | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
