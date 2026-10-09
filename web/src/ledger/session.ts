import type { PartyLayerClient, Session as WalletSession, WalletId } from "@partylayer/sdk";
import { LedgerApi, sandboxTransport, walletTransport, type Command, type SubmissionOptions } from "./api";
import { connectGrofty, discoverGrofty, GROFTY_WALLET_ID, GROFTY_MIN_VERSION, WalletSessionChanged } from "./grofty";
import { partyLabel } from "./symbolon";
import { requireTradingRelease } from "./release";
import { deployment, deploymentSubmissionOptions, tradingBlocker, normalizeNetwork } from "./deployment";
import { activeAccountContext, accountResumePreference, rememberAccountParty, disconnectAccount, finishAccountConnection, type AccountContext } from "./account";
import { resumedParty } from "./account-resume";
import { CantonV2Client, type CommittedReceipt, type PendingCommand } from "./canton-v2";
import type { WalletBalanceSnapshot } from "./wallet-balances";
import { attachSendLedger, attachSendReadOnly } from "./send-ledger";
import type { ParticipantProbe } from "./participant-probe";

export interface Session {
  readonly kind: "browse" | "sandbox" | "wallet" | "account";
  readonly party: string;
  readonly label: string;
  readonly wallet?: string;
  readonly networkId?: string;
  readonly walletVersion?: string;
  readonly ledgerRead?: boolean;
  readonly ownedParties?: string[];
  pendingCommand?(): PendingCommand | null;
  reconcilePending?(): Promise<{status: "pending" | "committed" | "failed";updateId?:string}>;
  lastReceipt?(): CommittedReceipt | null;
  walletBalances?(): Promise<WalletBalanceSnapshot>;
  inspectParticipant?(): Promise<ParticipantProbe>;
  tryInstallApplication?(): Promise<ParticipantProbe>;
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
  if (currentSession?.kind === "account" && session.kind !== "account") disconnectAccount();
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
  (s.kind === "sandbox" ? sandboxModeEnabled() : ["wallet", "account"].includes(s.kind) && tradingBlocker(s.networkId) === null);

// A party picker is deliberately confined to a loopback development server.
// A deployed app must obtain authority through a wallet or authenticated hosted account.
export function sandboxModeEnabled(): boolean {
  return typeof window !== "undefined" && ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)
    && !!import.meta.env?.DEV && !["mainnet", "testnet"].includes(deployment().network);
}
function requireSandbox() {
  if (!sandboxModeEnabled()) throw new Error("The demo party picker is only available on a local demo server.");
}
export function sandboxApi() {
  const userId = import.meta.env?.DEV ? import.meta.env.VITE_LOCAL_LEDGER_USER_ID ?? "symbolon-local" : "symbolon-local";
  return new LedgerApi(sandboxTransport(), userId);
}

export function browseSession(readParty?: string): Session {
  return {
    kind: "browse", party: "", label: "Browsing",
    ledgerRead: !!readParty && sandboxModeEnabled(),
    // Oracle marks are demo data, not a public read capability on a live participant.
    read: async () => readParty && sandboxModeEnabled() ? sandboxApi().activeContracts(readParty) : [],
    submit: () => Promise.reject(new WalletRequired()),
    async disconnect() {},
  };
}
export async function publicReadParty(): Promise<string | undefined> {
  if (!sandboxModeEnabled() || deployment().publicDesk) return undefined;
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
    kind: "sandbox", party, label: partyLabel(party), networkId: deployment().network === "localnet" ? "localnet" : "local",
    read: () => { requireSandbox(); return api.activeContracts(party); },
    submit: (commands, options) => { requireSandbox(); return api.submit(party, commands,
      deployment().network === "localnet" ? { ...options, ...deploymentSubmissionOptions() } : options); },
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
      adapters: [...mod.getBuiltinAdapters(), new mod.SendAdapter()],
    }));
  }
  return client;
}

export interface WalletOption {
  id: string; name: string; installed: boolean; icon?: string;
  network?: string; minimumVersion?: string; version?: string; unavailableReason?: string;
}
const SUPPORTED = ["console", "loop", "send"];
const walletMarks: Record<string, string> = {
  console: "/wallets/console.png", loop: "/wallets/loop.svg", send: "/wallets/send.jpg",
};
export async function listWalletOptions(network = walletNetwork()): Promise<WalletOption[]> {
  if (deployment().network === "localnet") return [];
  if (deployment().network === "testnet") {
    const grofty = await discoverGrofty(network);
    return [{
      id: GROFTY_WALLET_ID, name: "Grofty Wallet TestNet", network,
      minimumVersion: GROFTY_MIN_VERSION, ...grofty,
    }];
  }
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
      ...(String(w.walletId) === "loop" ? { unavailableReason: "Symbolon transactions are not supported by Loop yet." } : {}),
      icon: walletMarks[String(w.walletId)] ?? w.icons?.md ?? w.icons?.sm ?? w.icons?.lg };
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
  if (s.walletId === "send") {
    if (deployment().network === "testnet") attachSendReadOnly(session, verifyBound, invalidate);
    else attachSendLedger(session, verifyBound, invalidate);
  }
  return activate(session);
}
/** Ignore a late connection response without revoking the user's wallet permission. */
export function cancelWalletConnection() { connectionRevision++; }
export async function connectWallet(walletId?: string, network = walletNetwork()): Promise<Session> {
  if (deployment().network === "localnet") throw new Error("Use the LocalNet development party picker. Remote wallet connections are disabled in this profile.");
  const revision = ++connectionRevision;
  if (walletId === "send" && deployment().network === "testnet") {
    throw new Error("This TestNet app uses Grofty Wallet. Connect your Grofty TestNet account.");
  }
  if (walletId === "console") {
    const { openConsoleSession } = await import("./console");
    const session = await openConsoleSession(true);
    if (!session) throw new Error("Console Wallet did not approve this connection.");
    requireCurrentConnection(revision,session);
    remember({kind:"wallet",walletId:"console",network});
    return activate(session);
  }
  if (walletId === GROFTY_WALLET_ID) {
    if (!["mainnet", "testnet"].includes(normalizeNetwork(network) ?? "") || normalizeNetwork(network) !== deployment().network) {
      throw new Error("Grofty needs the matching MainNet or TestNet deployment. Select the configured wallet network.");
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
  const session = await connectGrofty(interactive, () => { if (currentSession === session) remember(null); }, walletNetwork());
  if (!session) return null;
  const submit = session.submit;
  session.submit = async (commands, options) => { requireTradingRelease(session.networkId); return submit(commands, options); };
  requireCurrentConnection(revision, session);
  remember({ kind: "wallet", walletId: GROFTY_WALLET_ID, network: walletNetwork() });
  return activate(session);
}
export function walletNetwork(): string { return deployment().walletNetwork; }

function bootstrapCommand(commands: Command[], party: string) {
  const d = deployment();
  if (commands.length !== 1 || !d.publicPackageId || !("CreateCommand" in commands[0])) return false;
  const create = commands[0].CreateCommand;
  return create.templateId === `${d.publicPackageId}:Symbolon.PublicDesk:PublicDesk`
    && create.createArguments.operator === party;
}
export async function connectAccount(party?: string): Promise<Session | null> {
  if (deployment().network !== "devnet") return null;
  const revision = ++connectionRevision;
  const account = activeAccountContext() ?? await finishAccountConnection();
  requireCurrentConnection(revision);
  if (!account) return null;
  const selected = party ?? resumedParty(accountResumePreference(), account.subject, account.parties) ?? account.primaryParty ?? account.parties[0];
  if (!account.parties.includes(selected)) throw new Error("Select an authorized account party.");
  const session = accountSession(account, selected);
  rememberAccountParty(account, selected);
  remember(null);
  return activate(session);
}
function accountSession(account: AccountContext, party: string): Session {
  const d = deployment();
  if (d.network !== "devnet" || !d.corePackageId || !d.synchronizerId || d.participant !== "https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services") {
    throw new Error("The HackCanton account connection needs the configured shared DevNet participant and synchronizer.");
  }
  const client = new CantonV2Client({ party, request: account.request, corePackageId: d.corePackageId,
    ...(d.publicPackageId ? { publicPackageId: d.publicPackageId } : {}), synchronizerId: d.synchronizerId,
    store: typeof sessionStorage === "undefined" ? undefined : sessionStorage });
  let disposed = false;
  const bound = () => {
    if (disposed || activeAccountContext() !== account) throw new WalletSessionChanged("This account session changed. Connect again.");
  };
  return {
    kind: "account", party, label: partyLabel(party), wallet: "HackCanton account", networkId: "devnet", ledgerRead: true,
    ownedParties: account.parties,
    async read() { bound(); return client.read(); },
    async submit(commands, options) {
      bound();
      if (!bootstrapCommand(commands,party)) requireTradingRelease("devnet");
      await client.preflight();
      return client.submit(commands, options);
    },
    pendingCommand: () => client.pendingCommand(),
    reconcilePending: () => { bound(); return client.reconcile(); },
    lastReceipt: () => client.lastReceipt,
    dispose() { disposed = true; },
    async disconnect() { disposed = true; disconnectAccount(); },
  };
}

export async function sandboxAvailable(): Promise<boolean> {
  if (!sandboxModeEnabled()) return false;
  try { await sandboxApi().ledgerEnd(); return true; } catch { return false; }
}
export function rememberedSession(): Remembered | null {
  try {
    const value = JSON.parse(localStorage.getItem(storeKey) ?? "null");
    if (value?.kind === "sandbox" && typeof value.party === "string" && sandboxModeEnabled()) return value;
    if (value?.kind === "wallet" && typeof value.walletId === "string" && typeof value.network === "string") {
      if (value.walletId === GROFTY_WALLET_ID && !["mainnet", "testnet"].includes(value.network)) return null;
      return { kind: "wallet", walletId: value.walletId, network: value.network };
    }
  } catch { /* Invalid or unavailable browser storage. */ }
  return null;
}

/** Restore cached authority without opening a wallet permission prompt. */
export async function restoreSession(): Promise<Session | null> {
  const account = await connectAccount();
  if (account) return account;
  const saved = rememberedSession();
  if (!saved) return null;
  const revision = ++connectionRevision;
  try {
    if (saved.kind === "sandbox") {
      const parties = await listSandboxParties();
      requireCurrentConnection(revision);
      if (parties.includes(saved.party)) return connectSandbox(saved.party);
    } else {
      if (deployment().network === "localnet") { remember(null); return null; }
      if (saved.network !== walletNetwork()) { remember(null); return null; }
      if (saved.walletId === "send" && deployment().network === "testnet") {
        remember(null);
        return null;
      }
      if(saved.walletId === "console") {
        const { openConsoleSession } = await import("./console");
        const restored = await openConsoleSession(false);
        requireCurrentConnection(revision,restored??undefined);
        if(restored)return activate(restored);
      }
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
