import { normalizeNetwork, type Deployment } from "../ledger/deployment";
import type { Session } from "../ledger/session";
import type { PriceFeed } from "../ledger/symbolon";
import type { TradeSide } from "./terminal-state";

export type WorkspaceStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export interface BorrowDraft {
  amount: string;
  cushion: string;
  term: string;
  threshold: string;
  cure: string;
  maxAge: string;
  /** Counterparty input only; it cannot select or authorize the connected party. */
  dealersText?: string;
}
export interface BorrowDraftScope {
  party: string;
  network: string;
  deployment: string;
  market: string;
}

const sideKey = "symbolon.workspace-side.v1";
const draftKey = "symbolon.borrow-drafts.v1";
export const WORKSPACE_RETENTION_MS = 24 * 60 * 60 * 1000;
const maxDrafts = 6;
const maxStorageLength = 32768;
type DraftEntry = { scope: BorrowDraftScope; draft: BorrowDraft; savedAt: number };

function tabStorage(): WorkspaceStorage | undefined {
  try { return typeof window === "undefined" ? undefined : window.sessionStorage; }
  catch { return undefined; }
}
function remove(key: string, store?: WorkspaceStorage) {
  try { store?.removeItem(key); } catch { /* UI state works without browser storage. */ }
}
function persist(key: string, value: unknown, store?: WorkspaceStorage) {
  try { store?.setItem(key, JSON.stringify(value)); } catch { /* Optional tab-local recovery. */ }
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
function identity(value: unknown, limit: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= limit && value.trim() === value
    && !/[\u0000-\u001f\u007f]/.test(value);
}
function checkedScope(value: unknown): BorrowDraftScope | null {
  if (!object(value) || !exactKeys(value, ["party", "network", "deployment", "market"])
    || !identity(value.party, 512) || !value.party.includes("::") || !identity(value.network, 32)
    || !identity(value.deployment, 4096) || !identity(value.market, 2048)) return null;
  return { party: value.party, network: value.network, deployment: value.deployment, market: value.market };
}
const sameScope = (a: BorrowDraftScope, b: BorrowDraftScope) => a.party === b.party && a.network === b.network
  && a.deployment === b.deployment && a.market === b.market;

/** Identity is taken from the current connection and current market, never from a restored draft.
 * Public deployment references are included, but never event blobs, tokens or signing rights.
 */
export function createBorrowDraftScope(session: Pick<Session, "kind" | "party" | "networkId">, d: Deployment,
  market: Pick<PriceFeed, "oracle" | "instrumentIssuer" | "instrument" | "cashIssuer" | "cashInstrument">): BorrowDraftScope | null {
  if (!["sandbox", "wallet", "account"].includes(session.kind)) return null;
  const network = session.kind === "sandbox" && session.networkId === "local" ? "localnet" : normalizeNetwork(session.networkId);
  if (!network || network !== d.network) return null;
  const marketParts = [market.oracle, market.instrumentIssuer, market.instrument, market.cashIssuer, market.cashInstrument];
  if (!marketParts.every(part => identity(part, 512))) return null;
  const asset = (a: Deployment["assets"]["cash"]) => [a.symbol, a.admin, a.adapter, [...a.packageIds].sort()];
  return checkedScope({ party: session.party, network,
    deployment: JSON.stringify([d.network, d.walletNetwork, d.participant, d.synchronizerId, d.corePackageId, d.releaseEvidence,
      d.publicPackageId ?? null, d.publicDesk?.contractId ?? null, d.publicDesk?.operator ?? null,
      asset(d.assets.collateral), asset(d.assets.cash)]),
    market: JSON.stringify(marketParts),
  });
}

// These are storage limits, not approval of financing terms. The current form and
// ledger must still check policy, balances, oracle freshness and all relationships.
type NumericField = Exclude<keyof BorrowDraft, "dealersText">;
const limits: Record<NumericField, number> = {
  amount: 1e12, cushion: 10000, term: 365, threshold: 200, cure: 10080, maxAge: 1440,
};
function checkedDraft(value: unknown): BorrowDraft | null {
  if (!object(value)) return null;
  const result = {} as BorrowDraft;
  for (const field of Object.keys(limits) as NumericField[]) {
    const text = value[field];
    if (typeof text !== "string" || text.length > 32) return null;
    if (text !== "") {
      if (!(field === "term" ? /^\d+$/.test(text) : /^(?:\d+(?:\.\d{0,10})?|\.\d{1,10})$/.test(text))) return null;
      const [whole, fraction = ""] = text.split("."), bound = BigInt(limits[field]), integral = BigInt(whole || "0");
      if (integral > bound || integral === bound && /[1-9]/.test(fraction)) return null;
    }
    result[field] = text;
  }
  if (value.dealersText !== undefined) {
    if (typeof value.dealersText !== "string" || value.dealersText.length > 4096
      || value.dealersText.split(/\r\n|\r|\n/).length > 16 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value.dealersText)) return null;
    result.dealersText = value.dealersText;
  }
  return result;
}
function retained(savedAt: unknown, now: number): savedAt is number {
  return Number.isSafeInteger(savedAt) && (savedAt as number) >= 0 && (savedAt as number) <= now
    && now - (savedAt as number) < WORKSPACE_RETENTION_MS;
}
function readJson(key: string, store?: WorkspaceStorage): unknown {
  try {
    const text = store?.getItem(key);
    if (text == null) return null;
    if (text.length > maxStorageLength) throw new Error("Oversized UI state");
    return JSON.parse(text);
  } catch { remove(key, store); return null; }
}

/** The side is only a tab's UI preference. It never selects a party or signer. */
export function readTradeSide(store = tabStorage(), now = Date.now()): TradeSide | null {
  const value = readJson(sideKey, store);
  if (!object(value) || !exactKeys(value, ["version", "side", "savedAt"]) || value.version !== 1
    || !retained(value.savedAt, now) || !["borrow", "lend"].includes(value.side as string)) {
    remove(sideKey, store); return null;
  }
  return value.side as TradeSide;
}
export function writeTradeSide(side: TradeSide, store = tabStorage(), now = Date.now()) {
  if (!["borrow", "lend"].includes(side) || !retained(now, now)) { remove(sideKey, store); return; }
  persist(sideKey, { version: 1, side, savedAt: now }, store);
}

function saveDrafts(entries: DraftEntry[], store?: WorkspaceStorage) {
  // Keep a bounded number of scopes and a bounded record even for long public IDs.
  while (entries.length && JSON.stringify({ version: 1, entries }).length > maxStorageLength) entries.pop();
  if (entries.length) persist(draftKey, { version: 1, entries }, store);
  else remove(draftKey, store);
}
function readDrafts(store: WorkspaceStorage | undefined, now: number): DraftEntry[] {
  const value = readJson(draftKey, store);
  if (!object(value) || !exactKeys(value, ["version", "entries"]) || value.version !== 1
    || !Array.isArray(value.entries) || value.entries.length > maxDrafts) { remove(draftKey, store); return []; }
  const entries: DraftEntry[] = [];
  for (const entry of value.entries) {
    if (!object(entry) || !exactKeys(entry, ["scope", "draft", "savedAt"]) || !retained(entry.savedAt, now)) continue;
    const scope = checkedScope(entry.scope), draft = checkedDraft(entry.draft);
    if (!scope || !draft || !exactKeys(entry.draft as Record<string, unknown>,
      [...Object.keys(limits), ...(draft.dealersText === undefined ? [] : ["dealersText"])])) continue;
    if (!entries.some(previous => sameScope(previous.scope, scope))) entries.push({ scope, draft, savedAt: entry.savedAt });
  }
  saveDrafts(entries, store);
  return entries;
}
export function readBorrowDraft(scope: BorrowDraftScope | null, store = tabStorage(), now = Date.now()): BorrowDraft | null {
  const checked = checkedScope(scope);
  if (!checked) return null;
  return readDrafts(store, now).find(entry => sameScope(entry.scope, checked))?.draft ?? null;
}
/** Recover a draft's market only if that identity is present in the caller's current authorized read. */
export function readLastBorrowMarket<T extends Pick<PriceFeed,"oracle"|"instrumentIssuer"|"instrument"|"cashIssuer"|"cashInstrument">>(
  session: Pick<Session,"kind"|"party"|"networkId">, d:Deployment, authorizedFeeds:readonly T[], store=tabStorage(), now=Date.now(),
):T|null {
  const candidates=authorizedFeeds.map(feed=>({feed,scope:createBorrowDraftScope(session,d,feed)}));
  for(const entry of readDrafts(store,now).sort((a,b)=>b.savedAt-a.savedAt)) {
    const current=candidates.find(candidate=>candidate.scope&&sameScope(candidate.scope,entry.scope));
    if(current)return current.feed;
  }
  return null;
}
export function writeBorrowDraft(scope: BorrowDraftScope | null, draft: BorrowDraft, store = tabStorage(), now = Date.now()) {
  const checked = checkedScope(scope);
  if (!checked) return;
  const entries = readDrafts(store, now).filter(entry => !sameScope(entry.scope, checked));
  const value = checkedDraft(draft);
  if (value && retained(now, now)) entries.unshift({ scope: checked, draft: value, savedAt: now });
  saveDrafts(entries.slice(0, maxDrafts), store);
}
export function clearBorrowDraft(scope: BorrowDraftScope | null, store = tabStorage(), now = Date.now()) {
  const checked = checkedScope(scope);
  if (checked) saveDrafts(readDrafts(store, now).filter(entry => !sameScope(entry.scope, checked)), store);
}
