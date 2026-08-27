// Who you are on the ledger, and how your commands get there.
//
// Three ways in, one shape out. A real user connects a Canton wallet — Loop,
// Console, Cantor8, whatever they have — and the wallet holds the keys and
// makes the calls. A developer against a local sandbox picks a party from the
// ones the setup script allocated. A visitor who has connected nothing gets a
// browse session: it can read what the ledger shows the public, and it cannot
// write at all. The app above never learns which is in play.

import {
  LedgerApi,
  sandboxTransport,
  walletTransport,
  type Command,
} from "./api";
import { partyLabel } from "./symbolon";

export interface Session {
  readonly kind: "browse" | "sandbox" | "wallet";
  /**
   * The party whose book this session owns. Empty while browsing — a visitor
   * owns nothing, and every "is this mine?" test in the app is a comparison
   * against this, so an empty value correctly matches nothing.
   */
  readonly party: string;
  readonly label: string;
  /** Wallet name when connected through one. */
  readonly wallet?: string;
  read(): ReturnType<LedgerApi["activeContracts"]>;
  submit(commands: Command[]): Promise<string>;
  disconnect(): Promise<void>;
}

const STORE_KEY = "symbolon.session";

/** Thrown instead of submitting when nothing is connected to sign with. */
export class WalletRequired extends Error {
  constructor() {
    super("Connect a wallet to sign this.");
    this.name = "WalletRequired";
  }
}

/** Can this session actually put a command on the ledger? */
export const canTrade = (s: Session | null): boolean =>
  s !== null && s.kind !== "browse";

// ----------------------------------------------------------------- browse

/**
 * Read-only, no keys, nothing signed.
 *
 * Canton scopes every read to a party, so there is no such thing as querying
 * "the ledger" — a visitor is not entitled to anyone's contracts and the API
 * will not invent a view for them. What a browser gets is the public tape: the
 * oracle's price feeds, which everyone prices against by design. Their own
 * book stays empty until they connect, because that is the ledger's answer,
 * not a screen we are withholding.
 */
export function browseSession(readParty?: string): Session {
  const api = sandboxApi();
  return {
    kind: "browse",
    party: "",
    label: "Browsing",
    read: async () => (readParty ? api.activeContracts(readParty) : []),
    submit: () => Promise.reject(new WalletRequired()),
    async disconnect() {},
  };
}

/**
 * A party whose reads show only public data. The oracle publishes the marks
 * and holds no book of its own, which makes it exactly the right lens for
 * someone who has connected nothing.
 */
export async function publicReadParty(): Promise<string | undefined> {
  try {
    const all = await sandboxApi().parties();
    return all.find((p) => p.startsWith("oracle"));
  } catch {
    return undefined;
  }
}

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
  listWallets(): Promise<
    {
      id: string;
      name: string;
      installed?: boolean;
      icon?: string;
      icons?: Record<string, string>;
    }[]
  >;
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
 *
 * Console is registered explicitly. The SDK dropped it from the defaults on
 * the assumption that the extension announces itself over CIP-0103 and the
 * registry fills in the rest; both of those are someone else's uptime, and a
 * judge whose Console does not appear in the list has simply been told our
 * app does not support their wallet. Registering the adapter makes it appear
 * whether or not the registry answers, and an announced Console still maps
 * onto this same adapter rather than showing up twice.
 */
async function partyLayer(network: string): Promise<PartyLayerClient> {
  if (client) return client;
  const mod = await import("@partylayer/sdk");
  client = mod.createPartyLayer({
    network: network as never,
    app: { name: "Symbolon" },
    adapters: [...mod.getBuiltinAdapters(), new mod.ConsoleAdapter()],
  } as never) as unknown as PartyLayerClient;
  return client;
}

export interface WalletOption {
  id: string;
  name: string;
  installed: boolean;
  /** The wallet's own mark, when it ships one. */
  icon?: string;
}

/**
 * The wallets this desk supports. A picker is a promise: every row on it is
 * a route we have thought about. Listing whatever a registry happens to
 * return makes that promise on behalf of wallets nobody here has tried.
 */
const SUPPORTED = ["console", "loop", "send"];

const supported = (w: { id: string; name: string }) => {
  const hay = `${w.id} ${w.name}`.toLowerCase();
  return SUPPORTED.some((k) => hay.includes(k));
};

export async function listWalletOptions(
  network = walletNetwork(),
): Promise<WalletOption[]> {
  const c = await partyLayer(network);
  const ws = (await c.listWallets()).filter(supported);
  return ws.map((w) => ({
    id: w.id,
    name: w.name,
    installed: w.installed !== false,
    // Registries carry the mark under either key, at whatever size they had.
    icon: w.icon ?? Object.values(w.icons ?? {})[0],
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
