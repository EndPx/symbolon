import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Session } from "../ledger/session";
import { deployment } from "../ledger/deployment";
import { lenderMarket, lenderMarketKey, type LenderMarket } from "../ledger/lender-directory";
import { closeOpenRfq, readOpenQuoteContext, readOpenRequests, readOpenRfqBoard, readOwnOpenRfq, recordOpenRfqQuote,
  type OpenRfqPublishProof, type OpenRfqQuoteProof, type OpenRfqRequest, type OwnOpenRfq, type OwnedOpenRequest, type PricingOpenRequest, type PublicOpenRequest } from "../ledger/open-rfq";
import { decimalUnits, fmtDuration, fmtPct, fmtTime, type DeskState, type PriceFeed } from "../ledger/symbolon";
import { displayDecimal, offerAmounts } from "./financing-display";
import { partyDisplayName } from "./market-label";
import { Dialog } from "./DeskDialog";
import { OpenRfqProofError, sendOpenQuote, withdrawOpenRequest } from "./open-rfq-actions";
import { checkedOpenRfqReceiptId } from "../ledger/open-rfq-model";

const emptyOwn = (): OwnOpenRfq => ({requests: [], quotes: []});
export function useOpenRfq(feed: PriceFeed | undefined, session: Session) {
  const configured = !!deployment().openRfqPackageId;
  const market = configured && feed ? lenderMarket(feed) : null;
  const key = market ? `${lenderMarketKey(market)}|${session.kind}|${session.party}` : "";
  const [version, setVersion] = useState(0);
  const [snapshot, setSnapshot] = useState<{key: string; board: PricingOpenRequest[]; publicRequests: PublicOpenRequest[]; own: OwnOpenRfq; error: string | null; ownError: string | null} | null>(null);
  useEffect(() => {
    if (!market) return;
    let active = true, working = false;
    const abort = new AbortController();
    const load = async () => {
      if (working) return;
      working = true;
      try {
        const [board, own, publicBoard] = await Promise.allSettled([
          session.kind === "account" ? readOpenRfqBoard(market, session.party) : Promise.resolve([]),
          session.kind === "account" ? readOwnOpenRfq(market, session.party) : Promise.resolve(emptyOwn()),
          session.kind === "account" ? Promise.resolve([]) : readOpenRequests(market, abort.signal),
        ]);
        if (active) setSnapshot({key, board: board.status === "fulfilled" ? board.value : [], own: own.status === "fulfilled" ? own.value : emptyOwn(),
          publicRequests: publicBoard.status === "fulfilled" ? publicBoard.value : [],
          error: board.status === "rejected" ? String(board.reason.message) : publicBoard.status === "rejected" ? String(publicBoard.reason.message) : null,
          ownError: own.status === "rejected" ? String(own.reason.message) : null});
      } finally { working = false; }
    };
    void load();
    const interval = window.setInterval(() => void load(), 15000);
    return () => {active = false; abort.abort(); window.clearInterval(interval);};
  }, [key, version, session]);
  const current = snapshot?.key === key ? snapshot : null;
  return {market, board: current?.board ?? [], publicRequests: current?.publicRequests ?? [], own: current?.own ?? emptyOwn(),
    loading: !!market && !current, error: current?.error ?? null, ownError: current?.ownError ?? null,
    refresh: useCallback(() => setVersion(value => value + 1), [])};
}
export type OpenRfqState = ReturnType<typeof useOpenRfq>;

type Proof = OpenRfqPublishProof | OpenRfqQuoteProof | {updateId: string};
const retainedProofs = new Map<string, Proof>();
const proofKey = (kind: string, party: string, id: string) => `symbolon.open-rfq-proof.v1.${kind}.${party}.${id}`;
let proofRevision = 0;
const proofListeners = new Set<() => void>();
export function subscribeOpenRfqProof(listener: () => void) {proofListeners.add(listener); return () => {proofListeners.delete(listener);};}
export const openRfqProofRevision = () => proofRevision;
function notifyProof() {proofRevision++; for (const listener of proofListeners) listener();}
export function useOpenRfqProofRevision() {return useSyncExternalStore(subscribeOpenRfqProof, openRfqProofRevision, () => 0);}
/** Retain only original ledger identifiers, never credentials or contract blobs. */
export function saveOpenRfqProof(kind: string, party: string, id: string, proof: Proof) {
  const key = proofKey(kind, party, id);
  retainedProofs.set(key, proof);
  try {sessionStorage.setItem(key, JSON.stringify(proof));} catch {/* Memory fallback. */}
  notifyProof();
}
export function readOpenRfqProof<T extends Proof>(kind: string, party: string, id: string): T | null {
  const key = proofKey(kind, party, id);
  let value: unknown = retainedProofs.get(key);
  if (!value) try {value = JSON.parse(sessionStorage.getItem(key) ?? "null");} catch {return null;}
  if (!value || typeof value !== "object" || typeof (value as Proof).updateId !== "string") return null;
  return value as T;
}
export function deleteOpenRfqProof(kind: string, party: string, id: string) {
  const key = proofKey(kind, party, id);
  retainedProofs.delete(key);
  try {sessionStorage.removeItem(key);} catch {/* Memory fallback. */}
  notifyProof();
}

export function pendingOpenRfqProofs(kind: "quote", party: string): Array<{id: string; proof: Proof}> {
  const prefix = proofKey(kind, party, ""), keys = new Set([...retainedProofs.keys()].filter(key => key.startsWith(prefix)));
  try {for (let index = 0; index < sessionStorage.length; index++) {const key = sessionStorage.key(index); if (key?.startsWith(prefix)) keys.add(key);}} catch {/* Memory fallback. */}
  return [...keys].flatMap(key => {
    const id = key.slice(prefix.length);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return [];
    const proof = readOpenRfqProof<Proof>(kind, party, id);
    return proof ? [{id, proof}] : [];
  });
}

export function OpenProofRecovery({kind, party, id, busy, onRecovered}: {kind: "publish" | "quote"; party: string; id: string; busy: boolean; onRecovered(): void}) {
  useOpenRfqProofRevision();
  const proof = readOpenRfqProof<{updateId: string; contractId?: string; quoteContractId?: string}>(kind, party, id);
  const savedId = kind === "publish" ? proof?.contractId : proof?.quoteContractId;
  const [contractId, setContractId] = useState(savedId ?? ""), [error, setError] = useState<string | null>(null);
  if (!proof) return null;
  const recover = () => {
    try {
      const value = checkedOpenRfqReceiptId(contractId.trim());
      saveOpenRfqProof(kind, party, id, {updateId: proof.updateId, ...(kind === "publish" ? {contractId: value} : {quoteContractId: value})});
      setError(null); onRecovered();
    } catch (cause) {setError((cause as Error).message);}
  };
  return <details className="open-rfq-recovery terms-disclosure" open={!savedId}><summary>Recover the original contract ID</summary>
    <p className="sm">This ledger update is retained. Find its created {kind === "publish" ? "OpenRequest" : "RepoQuote"} contract ID in the original receipt. The server verifies that it belongs to this exact action before recording it.</p>
    <p className="sm">Original update ID<code>{proof.updateId}</code></p>
    <label className="desk-field"><span>Original {kind === "publish" ? "OpenRequest" : "RepoQuote"} contract ID</span><input value={contractId} onChange={event => setContractId(event.target.value)} disabled={busy}/></label>
    {error && <p className="err" role="alert">{error}</p>}<button type="button" className="ghost sm" disabled={busy || !contractId.trim()} onClick={recover}>Use original contract ID</button>
  </details>;
}

export function availableOpenCash(state: DeskState | null, party: string, request: PricingOpenRequest | OpenRfqRequest): string {
  const amount = (state?.holdings ?? []).filter(({payload}) => payload.owner === party && payload.instrument === request.terms.cashInstrument
    && payload.issuer === request.terms.cashIssuer && payload.lockParties?.length === 0).reduce((total, holding) => total + decimalUnits(holding.payload.amount), 0n);
  return `${amount / 10000000000n}.${(amount % 10000000000n).toString().padStart(10, "0")}`;
}
export function openRate(percent: string): string | null {
  if (!/^\d+(?:\.\d{1,8})?$/.test(percent)) return null;
  const units = decimalUnits(percent);
  if (units > 100n * 10000000000n) return null;
  const rate = units / 100n;
  return `${rate / 10000000000n}.${(rate % 10000000000n).toString().padStart(10, "0")}`;
}

function RequestTerms({request}: {request: PricingOpenRequest | OpenRfqRequest}) {
  const t = request.terms;
  return <dl className="open-rfq-metrics"><div><dt>Cash requested</dt><dd>{displayDecimal(t.cashAmount, 2)} {t.cashInstrument}</dd></div>
    <div><dt>Collateral</dt><dd>{displayDecimal(t.collateralAmount, 4)} {t.collateralInstrument}</dd></div><div><dt>Duration</dt><dd>{t.termDays} days</dd></div></dl>;
}

export function OpenRequests({session, state, openRfq, side, busy, run, connect, children}: {
  session: Session; state: DeskState | null; openRfq: OpenRfqState; side: "borrow" | "lend"; busy: boolean;
  run(label: string, action: () => Promise<string>): Promise<boolean>; connect(): void; children?: ReactNode;
}) {
  const [quoting, setQuoting] = useState<OpenRfqRequest | null>(null), [closing, setClosing] = useState<OwnedOpenRequest | null>(null);
  const [syncingQuote, setSyncingQuote] = useState<string | null>(null);
  useOpenRfqProofRevision();
  const [working, setWorking] = useState(false), [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const lock = useRef(false);
  const market = openRfq.market;
  if (!market) return <>{children}</>;
  const open = openRfq.own.requests.filter(request => request.status === "open");
  const archived = openRfq.own.requests.filter(request => request.status === "closed");
  const quoteHistory = side === "lend" ? openRfq.own.quotes.filter(item => !state?.quotes.some(contract => contract.contractId === item.quote.quoteContractId && contract.payload.dealer === session.party)) : [];
  const board = openRfq.board.filter(request => request.borrower !== session.party);
  const pendingQuotes = pendingOpenRfqProofs("quote", session.party);
  const selectQuote = async (request: PricingOpenRequest) => {
    if (lock.current || busy) return;
    if (session.kind !== "account") {connect(); return;}
    if (readOpenRfqProof("quote", session.party, request.id)) {setSyncingQuote(request.id); setError(null); return;}
    lock.current = true; setWorking(true); setError(null);
    try {setQuoting(await readOpenQuoteContext(market, session.party, request.id));}
    catch (cause) {setError((cause as Error).message); openRfq.refresh();}
    finally {lock.current = false; setWorking(false);}
  };
  const close = async () => {
    if (!closing || lock.current) return;
    lock.current = true; setWorking(true); setError(null);
    const request = closing;
    try {
      let proof = readOpenRfqProof<{updateId: string}>("close", session.party, request.id);
      if (!proof) {
        const confirmed = await run("Open request withdrawn", async () => {
          const updateId = await withdrawOpenRequest(session, request);
          proof = {updateId}; saveOpenRfqProof("close", session.party, request.id, proof);
          return updateId;
        });
        if (!confirmed || !proof) return;
      }
      await closeOpenRfq(market, session.party, request.id, proof.updateId);
      deleteOpenRfqProof("close", session.party, request.id); setClosing(null);
      setNotice("Request closed. Existing funded offers remain in your private offer list until accepted, declined or revoked.");
    } catch (cause) {setError(`${(cause as Error).message} The original withdrawal receipt is retained; retry sync rather than submitting another withdrawal.`);}
    finally {lock.current = false; setWorking(false); openRfq.refresh();}
  };
  const ownCard = (request: OwnedOpenRequest) => {
    const active = request.quotes.filter(quote => state?.quotes.some(contract => contract.contractId === quote.quoteContractId && contract.payload.borrower === session.party));
    return <article className="open-rfq-record" key={request.id}><header className="open-rfq-record-heading"><div><h3>Your request · {request.id.slice(0, 8)}</h3><p className="sm muted">{request.status === "closed" ? "Closed" : `${active.length} active funded offer${active.length === 1 ? "" : "s"}`}</p></div>
      {request.status === "open" && <button type="button" className="ghost sm" disabled={busy || working} onClick={() => {setClosing(request); setError(null);}}>{readOpenRfqProof("close", session.party, request.id) ? "Retry closure sync" : "Close request"}</button>}</header><RequestTerms request={request}/></article>;
  };
  return <section className="open-rfq-sheet" aria-label="Requests and private offers"><header className="open-rfq-header"><div><h2>{side === "borrow" ? "Your requests & offers" : "Open requests & your offers"}</h2>
    <p className="sm">{side === "borrow" ? "Publish once. Lenders quote directly; compare their private fixed APRs below." : "Review an open request and send your fixed APR directly. Your funded quote stays between you and the borrower."}</p></div>
    <button type="button" className="ghost sm" disabled={working} onClick={openRfq.refresh}>Refresh</button></header>
    {openRfq.loading && <p className="empty-state" role="status">Loading open requests…</p>}
    {openRfq.error && <p className="err" role="alert">{openRfq.error}</p>}{openRfq.ownError && <p className="err" role="alert">Your own request and quote records could not be loaded. {openRfq.ownError}</p>}
    {error && !quoting && !closing && <p className="err" role="alert">{error}</p>}{notice && <p className="open-rfq-notice sm" role="status">{notice}</p>}
    {side === "borrow" ? <div className="open-rfq-list">{open.map(ownCard)}
      {!openRfq.loading && !openRfq.ownError && !open.length && <p className="empty-state">No open requests. Publish a request from Borrow to receive offers.</p>}</div>
      : session.kind !== "account" ? <div className="empty-state"><p>Sign in with your HackCanton account to review open request terms and quote directly.</p><button type="button" className="ghost" onClick={connect}>Connect account</button></div> : <div className="open-rfq-list">{board.map(request => {
        const indexed = openRfq.own.quotes.filter(item => item.request.id === request.id);
        const active = indexed.some(item => state?.quotes.some(contract => contract.contractId === item.quote.quoteContractId && contract.payload.dealer === session.party));
        const retained = readOpenRfqProof<OpenRfqQuoteProof>("quote", session.party, request.id);
        return <article className="open-rfq-record" key={request.id}><header className="open-rfq-record-heading"><div><h3>{partyDisplayName(request.borrower)}</h3><p className="sm muted">Request {request.id.slice(0, 8)} · {fmtTime(request.createdAt)}</p></div>
          {active ? <span className="terminal-status">Your offer active</span> : <button type="button" className="seal sm" disabled={busy || working || !!openRfq.ownError} onClick={() => void selectQuote(request)}>{retained ? "Sync existing quote" : "Quote request"}</button>}</header><RequestTerms request={request}/></article>;
      })}{!openRfq.loading && !openRfq.error && !board.length && <p className="empty-state">No open requests from other borrowers yet.</p>}</div>}
    <div className="open-rfq-private-offers">{children}</div>
    {pendingQuotes.length > 0 && <section className="open-rfq-recovery" aria-label="Pending quote receipt sync"><h3>Pending quote receipt sync</h3><p className="sm">These original ledger updates need recording. Sync remains available after a request closes and never reserves cash again.</p>
      {pendingQuotes.map(({id}) => <div className="open-rfq-record-heading" key={id}><span>Request {id.slice(0,8)}</span><button type="button" className="ghost sm" disabled={busy || working} onClick={() => setSyncingQuote(id)}>Sync existing quote</button></div>)}</section>}
    {(archived.length > 0 || quoteHistory.length > 0) && <details className="open-rfq-archive"><summary>Archive · {archived.length} closed request{archived.length === 1 ? "" : "s"}{quoteHistory.length > 0 && ` · ${quoteHistory.length} recorded offer${quoteHistory.length === 1 ? "" : "s"}`}</summary>{archived.map(ownCard)}
      {quoteHistory.map(({request, quote}) => <article className="open-rfq-record" key={quote.quoteContractId}><header className="open-rfq-record-heading"><div><h3>Your recorded offer · {partyDisplayName(request.borrower)}</h3><p className="sm muted">{fmtPct(Number(quote.rate))} APR · {fmtTime(quote.createdAt)}</p></div><span className="terminal-status">Not in active ledger view</span></header><RequestTerms request={request}/><p className="sm muted">The receipt index records this offer's creation. Check Positions or Activity for the authoritative financing outcome.</p></article>)}</details>}
    <details className="open-rfq-private-note"><summary>Who can see this?</summary><p className="sm">Connected Symbolon users see the open request's borrower, cash amount, collateral and duration after the borrower consents to publish. Each lender's APR, funded quote and accepted position stay bilateral. The application and participant operators remain trust dependencies. Closing a request does not revoke previously disclosed information or release outstanding offers.</p></details>
    {quoting && <OpenQuoteDialog request={quoting} session={session} state={state} busy={busy || working} run={run} close={() => {setQuoting(null); setError(null);}}
      synced={() => {setQuoting(null); setNotice("Funded offer sent. Your cash is reserved and your offer is visible privately to the borrower."); openRfq.refresh();}}/>}
    {syncingQuote && <PendingOpenQuoteSync key={syncingQuote} market={market} session={session} requestId={syncingQuote} busy={busy || working} close={() => setSyncingQuote(null)} synced={() => {setSyncingQuote(null); setNotice("Original quote receipt recorded. Check your active ledger offers and positions for its current state."); openRfq.refresh();}}/>}
    {closing && <Dialog title="Close open request" close={() => setClosing(null)} busy={busy || working}><p>Stop new quotes for request {closing.id.slice(0,8)}. Existing private funded offers remain active and cash stays reserved until an offer is accepted, declined or revoked.</p>
      {error && <p className="err" role="alert">{error}</p>}<button className="seal" disabled={busy || working} onClick={() => void close()}>{working ? "Closing…" : readOpenRfqProof("close", session.party, closing.id) ? "Retry closure sync" : "Close request"}</button></Dialog>}
  </section>;
}

export async function syncRetainedOpenQuote(market: LenderMarket, party: string, requestId: string,
  record: (market: LenderMarket, party: string, id: string, proof: OpenRfqQuoteProof) => Promise<unknown> = recordOpenRfqQuote) {
  const proof = readOpenRfqProof<OpenRfqQuoteProof>("quote", party, requestId);
  if (!proof) throw new Error("No original quote receipt is retained for this party and request.");
  if (!proof.quoteContractId) throw new Error("Recover the original RepoQuote contract ID before syncing this receipt.");
  checkedOpenRfqReceiptId(proof.updateId); checkedOpenRfqReceiptId(proof.quoteContractId);
  await record(market, party, requestId, proof);
  deleteOpenRfqProof("quote", party, requestId);
}

export function PendingOpenQuoteSync({market, session, requestId, busy, close, synced}: {market: LenderMarket; session: Session; requestId: string; busy: boolean; close(): void; synced(): void}) {
  useOpenRfqProofRevision();
  const proof = readOpenRfqProof<OpenRfqQuoteProof>("quote", session.party, requestId);
  const [working, setWorking] = useState(false), [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const sync = async () => {
    if (lock.current || busy) return;
    lock.current = true; setWorking(true); setError(null);
    try {await syncRetainedOpenQuote(market, session.party, requestId); synced();}
    catch (cause) {setError((cause as Error).message);}
    finally {lock.current = false; setWorking(false);}
  };
  return <Dialog title="Sync the original quote receipt" close={close} busy={busy || working}><p>Verify and record the existing quote for request {requestId.slice(0,8)}, including if its request is already closed. This does not request access, submit a quote or reserve cash.</p>
    <OpenProofRecovery kind="quote" party={session.party} id={requestId} busy={busy || working} onRecovered={() => setError(null)}/>
    {error && <p className="err" role="alert">{error}</p>}<button type="button" className="seal" disabled={busy || working || !proof?.quoteContractId} onClick={() => void sync()}>{working ? "Syncing…" : "Sync original quote"}</button>
  </Dialog>;
}

export function OpenQuoteDialog({request, session, state, busy, run, close, synced}: {request: OpenRfqRequest; session: Session; state: DeskState | null; busy: boolean;
  run(label: string, action: () => Promise<string>): Promise<boolean>; close(): void; synced(): void}) {
  const [rate, setRate] = useState("5.20"), [validity, setValidity] = useState("60"), [consent, setConsent] = useState(false);
  const [working, setWorking] = useState(false), [error, setError] = useState<string | null>(null);
  useOpenRfqProofRevision();
  const hasProof = !!readOpenRfqProof("quote", session.party, request.id);
  const lock = useRef(false);
  const annual = openRate(rate), seconds = Number(validity) * 60;
  const valid = annual !== null && Number.isInteger(seconds) && seconds >= 1 && seconds <= 86400;
  const available = availableOpenCash(state, session.party, request);
  const funded = decimalUnits(available) >= decimalUnits(request.terms.cashAmount);
  const amounts = annual ? offerAmounts({cashAmount: request.terms.cashAmount, rate: annual, termDays: String(request.terms.termDays)}) : null;
  const submit = async () => {
    if (lock.current || busy || !hasProof && (!consent || !valid || !funded || !annual)) return;
    lock.current = true; setWorking(true); setError(null);
    try {
      let proof = readOpenRfqProof<OpenRfqQuoteProof>("quote", session.party, request.id);
      if (!proof) {
        const confirmed = await run("Funded offer sent", async () => {
          try {proof = await sendOpenQuote(session, request, annual!, seconds);}
          catch (cause) {
            if (cause instanceof OpenRfqProofError && cause.kind === "quote") {
              saveOpenRfqProof("quote", session.party, request.id, {updateId: cause.updateId, ...(cause.quoteContractId ? {quoteContractId: cause.quoteContractId} : {})});
              setError("The funded quote's ledger update committed, but its complete contract proof could not be read. Recover its original contract ID below; no additional cash will be reserved.");
            }
            throw cause;
          }
          saveOpenRfqProof("quote", session.party, request.id, proof);
          return proof.updateId;
        });
        if (!confirmed || !proof) return;
      }
      await syncRetainedOpenQuote(request.market, session.party, request.id); synced();
    } catch (cause) {setError(`${(cause as Error).message} Check the original ledger receipt. If a quote committed, retry its sync; do not reserve cash again.`);}
    finally {lock.current = false; setWorking(false);}
  };
  return <Dialog title={hasProof ? "Sync your funded quote" : "Send a funded quote"} busy={busy || working} close={close}>
    <p>Quote privately to <strong>{partyDisplayName(request.borrower)}</strong>. Other lenders cannot see your APR or offer.</p><RequestTerms request={request}/>
    {!hasProof && <form className="open-rfq-quote-form desk-form" onSubmit={event => {event.preventDefault(); void submit();}}>
      <div className="field-pair"><label className="desk-field"><span>Fixed APR (%)</span><input type="number" required min="0" max="100" step="0.01" value={rate} onChange={event => setRate(event.target.value)}/><small>Simple annual interest · ACT/360</small></label>
        <label className="desk-field"><span>Offer valid (minutes)</span><input type="number" required min="1" max="1440" step="1" value={validity} onChange={event => setValidity(event.target.value)}/></label></div>
      <dl className="open-rfq-metrics"><div><dt>Available cash</dt><dd>{displayDecimal(available, 2)} {request.terms.cashInstrument}</dd></div>
        <div><dt>Fixed interest</dt><dd>{amounts ? displayDecimal(amounts.interest, 10) : "—"}</dd></div><div><dt>Borrower repayment</dt><dd>{amounts ? displayDecimal(amounts.repayment, 10) : "—"} {request.terms.cashInstrument}</dd></div></dl>
      <details className="terms-disclosure"><summary>Full financing terms and identities</summary><p>Maintenance margin {fmtPct(Number(request.terms.marginThresholdPct))} · Cure window {fmtDuration(request.terms.cureSeconds)} · Maximum mark age {fmtDuration(request.terms.maxPriceAgeSeconds)}</p>
        <p>Borrower<code>{request.borrower}</code></p><p>Lender<code>{session.party}</code></p><p>Cash issuer<code>{request.terms.cashIssuer}</code></p><p>Collateral issuer<code>{request.terms.collateralIssuer}</code></p><p>Oracle<code>{request.terms.oracle}</code></p></details>
      <label className="directory-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)}/><span>Reserve {displayDecimal(request.terms.cashAmount, 2)} {request.terms.cashInstrument} for this private funded offer. Cash remains reserved until acceptance, decline or revocation; expiry alone does not release it.</span></label>
      {!funded && <p className="err">Not enough available cash from the agreed issuer. Get test assets from Faucet.</p>}{error && <p className="err" role="alert">{error}</p>}
      <button type="submit" className="seal" disabled={busy || working || !consent || !valid || !funded}>{working || busy ? "Awaiting ledger…" : "Reserve cash and send quote"}</button>
    </form>}
    {hasProof && <div className="open-rfq-recovery"><p>The original quote receipt is retained. This action only verifies and records it; it does not reserve cash again.</p>
      <OpenProofRecovery kind="quote" party={session.party} id={request.id} busy={busy || working} onRecovered={() => setError(null)}/>
      {error && <p className="err" role="alert">{error}</p>}<button className="seal" disabled={busy || working || !readOpenRfqProof<OpenRfqQuoteProof>("quote", session.party, request.id)?.quoteContractId} onClick={() => void submit()}>{working ? "Syncing…" : "Retry quote sync"}</button></div>}
  </Dialog>;
}
