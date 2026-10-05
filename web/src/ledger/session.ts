import type { PartyLayerClient, Session as WalletSession, WalletId } from "@partylayer/sdk";
import { LedgerApi, sandboxTransport, walletTransport, type Command, type SubmissionOptions } from "./api";
import { connectGrofty, GROFTY_WALLET_ID, WalletSessionChanged } from "./grofty";
import { partyLabel } from "./symbolon";
import { requireTradingRelease } from "./release";
import { deployment, deploymentSubmissionOptions, tradingBlocker } from "./deployment";

export interface Session {
  readonly kind: "browse" | "sandbox" | "wallet";
  readonly party: string;
  readonly label: string;
  readonly wallet?: string;
  readonly networkId?: string;
  readonly walletVersion?: string;
  read(): ReturnType<LedgerApi["activeContracts"]>;
  submit(commands: Command[], options?: SubmissionOptions): Promise<string>;
  onInvalidated?(listener: (reason: string) => void): () => void;
  /** Release local listeners without revoking the wallet's connection permission. */
  dispose?(): void;
  disconnect(): Promise<void>;
}

type Remembered = { kind: "sandbox"; party: string } | { kind: "wallet"; walletId: string; network: string };
// Only public connection preferences are stored; authority is revalidated with the wallet.
const storeKey = "symbolon.session.v3";
let currentSession: Session | null = null;
let connectionRevision = 0;
function requireCurrentConnection(revision: number, candidate?: Session) {
  if (revision !== connectionRevision) {
    candidate?.dispose?.();
    throw new WalletSessionChanged("A newer connection was selected. Use the current wallet session.");
  }
}
function activate(session: Session): Session {
  currentSession?.dispose?.();
  currentSession = session;
  return session;
}
function remember(value: Remembered | null) {
  try {
    if (value) localStorage.setItem(storeKey, JSON.stringify(value));
    else localStorage.removeItem(storeKey);
  } catch { /* Wallet operation remains available when browser storage is disabled. */ }
}

export class WalletRequired extends Error {
  constructor() { super("Connect a wallet to sign this."); this.name = "WalletRequired"; }
}
export const canTrade = (s: Session | null): boolean => s !== null &&
  (s.kind === "sandbox" ? sandboxModeEnabled() : s.kind === "wallet" && tradingBlocker(s.networkId) === null);

// A party picker is deliberately confined to a loopback development server.
// A deployed app must obtain authority through the connected wallet.
export function sandboxModeEnabled(): boolean {
  return typeof window !== "undefined" && ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)
    && (import.meta.env?.DEV || import.meta.env?.VITE_ENABLE_LOCAL_DEMO === "true");
}
function requireSandbox() {
  if (!sandboxModeEnabled()) throw new Error("The demo party picker is only available on a local demo server.");
}
export function sandboxApi() { return new LedgerApi(sandboxTransport(), "symbolon-local"); }

export function browseSession(readParty?: string): Session {
  return {
    kind: "browse", party: "", label: "Browsing",
    // Oracle marks are demo data, not a public read capability on a live participant.
    read: async () => readParty && sandboxModeEnabled() ? sandboxApi().activeContracts(readParty) : [],
    submit: () => Promise.reject(new WalletRequired()),
    async disconnect() {},
  };
}
export async function publicReadParty(): Promise<string | undefined> {
  if (!sandboxModeEnabled()) return undefined;
  try { return (await sandboxApi().parties()).find(p => p.startsWith("oracle")); }
  catch { return undefined; }
}
export async function listSandboxParties(): Promise<string[]> {
  requireSandbox();
  const all = await sandboxApi().parties();
  try {
    const response = await fetch("/demo-parties", { signal: AbortSignal.timeout(3000) });
    if (response.ok) {
      const seeded: unknown = await response.json();
      if (Array.isArray(seeded) && seeded.every(p => typeof p === "string")) {
        return seeded.filter(p => all.includes(p));
      }
    }
  } catch { /* A manually managed sandbox may not have a seed manifest. */ }
  return ["borrower", "dealer-a", "dealer-b", "oracle", "issuer", "outsider"]
    .flatMap(prefix => all.filter(p => p.startsWith(prefix)));
}
export function connectSandbox(party: string): Session {
  requireSandbox();
  if (!party.trim()) throw new Error("Select a local demo party.");
  connectionRevision++;
  const api = sandboxApi();
  remember({ kind: "sandbox", party });
  const session: Session = {
    kind: "sandbox", party, label: partyLabel(party), networkId: "local",
    read: () => { requireSandbox(); return api.activeContracts(party); },
    submit: (commands, options) => { requireSandbox(); return api.submit(party, commands, options); },
    async disconnect() { if (currentSession === session) remember(null); },
  };
  return activate(session);
}

let client: Promise<PartyLayerClient> | null = null;
let clientNetwork: string | null = null;
async function partyLayer(network: string): Promise<PartyLayerClient> {
  if (clientNetwork !== network || !client) {
    if (client) (await client).destroy();
    clientNetwork = network;
    client = import("@partylayer/sdk").then(mod => mod.createPartyLayer({
      network, networkEnforcement: "strict", app: { name: "Symbolon" },
    }));
  }
  return client;
}

export interface WalletOption {
  id: string; name: string; installed: boolean; icon?: string;
  network?: string; minimumVersion?: string; version?: string; unavailableReason?: string;
}
const SUPPORTED = ["console", "loop", "send"];
export async function listWalletOptions(network = walletNetwork()): Promise<WalletOption[]> {
  // Grofty bounty work is deferred. Keep the prototype adapter in source while
  // the submitted product exposes its configured development wallet path.
  return listSecondaryWallets(network);
}
async function listSecondaryWallets(network: string): Promise<WalletOption[]> {
  const c = await partyLayer(network);
  const wallets = (await c.listWallets())
    .filter(w => SUPPORTED.some(k => `${w.walletId} ${w.name}`.toLowerCase().includes(k)));
  return Promise.all(wallets.map(async w => {
    const detected = await c.getAdapter(w.walletId)?.detectInstalled().catch(() => undefined);
    return { id: w.walletId, name: w.name, network, installed: detected?.installed ?? false,
      icon: w.icons?.sm ?? w.icons?.md ?? w.icons?.lg };
  }));
}

function walletSession(c: PartyLayerClient, s: WalletSession, network: string): Session {
  if (s.networkMismatch) throw new Error(`Switch your wallet to ${network} before continuing.`);
  const api = new LedgerApi(walletTransport(c));
  let invalidReason: string | null = null;
  let disposed = false;
  const listeners = new Set<(reason: string) => void>();
  const subscriptions: Array<() => void> = [];
  const cleanup = () => { subscriptions.splice(0).forEach(off => off()); };
  const invalidate = (reason: string) => {
    if (invalidReason || disposed) return;
    invalidReason = reason; cleanup();
    if (currentSession === session) remember(null);
    listeners.forEach(listener => listener(reason)); listeners.clear();
  };
  const assertBound = () => {
    if (disposed || invalidReason) throw new WalletSessionChanged(invalidReason ?? "This wallet session was closed. Reconnect to continue.");
  };
  const verifyBound = async () => {
    assertBound();
    const active = await c.getActiveSession();
    if (!active || active.sessionId !== s.sessionId || active.partyId !== s.partyId
      || active.network !== s.network || active.networkMismatch) {
      invalidate("The wallet account or network changed. Reconnect to load the current party's book.");
    }
    assertBound();
  };
  subscriptions.push(c.on("session:connected", event => {
    if (event.type === "session:connected" && event.session.sessionId !== s.sessionId) invalidate("The wallet session changed. Reconnect to continue.");
  }));
  for (const eventName of ["session:disconnected", "session:expired", "session:networkMismatch"] as const) {
    subscriptions.push(c.on(eventName, event => {
      if ("sessionId" in event && event.sessionId === s.sessionId) invalidate("The wallet disconnected, expired, or changed network. Reconnect to continue.");
    }));
  }
  const session: Session = {
    kind: "wallet", party: s.partyId, label: partyLabel(s.partyId), wallet: s.walletId,
    networkId: s.network,
    async read() { await verifyBound(); const contracts = await api.activeContracts(s.partyId); assertBound(); return contracts; },
    async submit(commands, options) {
      requireTradingRelease(network);
      await verifyBound();
      // Once the ledger returns a committed receipt, preserve it even if the
      // wallet changed during approval. A changed session must never hide a
      // completed transaction and encourage an automatic retry.
      return api.submit(s.partyId, commands, { ...options, ...deploymentSubmissionOptions() });
    },
    onInvalidated(listener) { if (invalidReason) listener(invalidReason); else listeners.add(listener); return () => { listeners.delete(listener); }; },
    dispose() { disposed = true; cleanup(); listeners.clear(); },
    async disconnect() { session.dispose?.(); if (currentSession === session) remember(null); await c.disconnect(); },
  };
  remember({ kind: "wallet", walletId: s.walletId, network });
  return activate(session);
}
export async function connectWallet(walletId?: string, network = walletNetwork()): Promise<Session> {
  const revision = ++connectionRevision;
  if (walletId === GROFTY_WALLET_ID) {
    if (network !== "mainnet" && network !== "canton:da-mainnet") {
      throw new Error("Grofty Wallet supports MainNet only. Select the Grofty MainNet connection explicitly.");
    }
    return (await groftySession(true, revision))!;
  }
  const c = await partyLayer(network);
  requireCurrentConnection(revision);
  const connected = await c.connect(walletId ? { walletId: walletId as WalletId } : undefined);
  requireCurrentConnection(revision);
  return walletSession(c, connected, network);
}
async function groftySession(interactive: boolean, revision: number): Promise<Session | null> {
  const session = await connectGrofty(interactive, () => { if (currentSession === session) remember(null); });
  if (!session) return null;
  const submit = session.submit;
  session.submit = async (commands, options) => { requireTradingRelease(session.networkId); return submit(commands, options); };
  requireCurrentConnection(revision, session);
  remember({ kind: "wallet", walletId: GROFTY_WALLET_ID, network: "mainnet" });
  return activate(session);
}
export function walletNetwork(): string { return deployment().walletNetwork; }

export async function sandboxAvailable(): Promise<boolean> {
  if (!sandboxModeEnabled()) return false;
  try { await sandboxApi().ledgerEnd(); return true; } catch { return false; }
}
export function rememberedSession(): Remembered | null {
  try {
    const value = JSON.parse(localStorage.getItem(storeKey) ?? "null");
    if (value?.kind === "sandbox" && typeof value.party === "string" && sandboxModeEnabled()) return value;
    if (value?.kind === "wallet" && typeof value.walletId === "string" && typeof value.network === "string") {
      if (value.walletId === GROFTY_WALLET_ID && value.network !== "mainnet") return null;
      return { kind: "wallet", walletId: value.walletId, network: value.network };
    }
  } catch { /* Invalid or unavailable browser storage. */ }
  return null;
}

/** Restore cached authority without opening a wallet permission prompt. */
export async function restoreSession(): Promise<Session | null> {
  const saved = rememberedSession();
  if (!saved) return null;
  const revision = ++connectionRevision;
  try {
    if (saved.kind === "sandbox") {
      const parties = await listSandboxParties();
      requireCurrentConnection(revision);
      if (parties.includes(saved.party)) return connectSandbox(saved.party);
    } else {
      if (saved.network !== walletNetwork()) { remember(null); return null; }
      if (saved.walletId === GROFTY_WALLET_ID) {
        const restored = await groftySession(false, revision);
        if (restored) return restored;
      } else {
        const c = await partyLayer(saved.network);
        const active = await c.getActiveSession();
        requireCurrentConnection(revision);
        if (active && active.walletId === saved.walletId) return walletSession(c, active, saved.network);
      }
    }
  } catch { /* An expired session requires an explicit reconnect. */ }
  if (revision === connectionRevision) remember(null);
  return null;
}
