import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "../ledger/session";
import { lenderMarket, lenderMarketKey } from "../ledger/lender-directory";
import { approveOpportunityAccess, closeOpportunity, readOpportunities, readOwnDiscovery, requestOpportunityAccess,
  type DiscoveryInterest, type OwnDiscovery, type OwnOpportunity, type PublicOpportunity } from "../ledger/discovery";
import { fmtAmount, fmtPct, fmtTime, type DeskState, type PriceFeed } from "../ledger/symbolon";
import { partyDisplayName } from "./market-label";
import { Dialog } from "./DeskDialog";
import { createDiscoveryRequest, discoveryRequestProof, matchesDiscoveryTerms, type RequestProof } from "./discovery-approval";

export function useDiscovery(feed: PriceFeed | undefined, session: Session) {
  const market = feed ? lenderMarket(feed) : null;
  const key = market ? lenderMarketKey(market) : "";
  const [version, setVersion] = useState(0);
  const [snapshot, setSnapshot] = useState<{key: string; public: PublicOpportunity[]; own: OwnDiscovery; error: string | null; ownError: string | null} | null>(null);
  useEffect(() => {
    if (!market) return;
    let active = true;
    const controller = new AbortController();
    let working = false;
    const load = async () => {
      if (working) return;
      working = true;
      try {
        const [board, own] = await Promise.allSettled([readOpportunities(market, controller.signal), session.kind === "account" ? readOwnDiscovery(market, session.party) : Promise.resolve({opportunities: [], outgoing: []})]);
        if (active) setSnapshot({key, public: board.status === "fulfilled" ? board.value : [], own: own.status === "fulfilled" ? own.value : {opportunities: [], outgoing: []},
          error: board.status === "rejected" ? String(board.reason.message) : null, ownError: own.status === "rejected" ? String(own.reason.message) : null});
      } finally { working = false; }
    };
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => { active = false; controller.abort(); window.clearInterval(timer); };
  }, [key, session, version]);
  const current = snapshot?.key === key ? snapshot : null;
  return {market, opportunities: current?.public ?? [], own: current?.own ?? {opportunities: [], outgoing: []}, loading: !!market && !current,
    error: current?.error ?? null, ownError: current?.ownError ?? null, refresh: useCallback(() => setVersion(value => value + 1), [])};
}
export type DiscoveryState = ReturnType<typeof useDiscovery>;
const proofKey = (party: string, opportunityId: string, interestId: string) => `symbolon.discovery-proof.v1.${party}.${opportunityId}.${interestId}`;
function savedProof(key: string): RequestProof | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? "null");
    return typeof value?.updateId === "string" && typeof value?.contractId === "string" ? {updateId: value.updateId, contractId: value.contractId} : null;
  } catch { return null; }
}

export function Discovery({session, state, discovery, side, busy, run, connect}: {
  session: Session; state: DeskState | null; discovery: DiscoveryState; side: "borrow" | "lend"; busy: boolean;
  run(label: string, action: () => Promise<string>): Promise<boolean>; connect(): void;
}) {
  const [requesting, setRequesting] = useState<PublicOpportunity | null>(null);
  const [approval, setApproval] = useState<{opportunity: OwnOpportunity; interest: DiscoveryInterest} | null>(null);
  const [closing, setClosing] = useState<OwnOpportunity | null>(null);
  const [name, setName] = useState(partyDisplayName(session.party).slice(0, 80));
  const [consent, setConsent] = useState(false), [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const proofs = useRef(new Map<string, RequestProof>());
  const lock = useRef(false);
  if (!discovery.market) return null;
  const market = discovery.market;
  const mutation = async (action: () => Promise<void>, message: string) => {
    if (lock.current) return;
    lock.current = true; setWorking(true); setError(null); setNotice(null);
    try { await action(); setNotice(message); setRequesting(null); setClosing(null); setConsent(false); }
    catch (cause) { setError((cause as Error).message); }
    finally { lock.current = false; setWorking(false); discovery.refresh(); }
  };
  const approve = async () => {
    if (!approval || !consent || busy || lock.current || session.kind !== "account") return;
    const {opportunity, interest} = approval;
    const key = proofKey(session.party, opportunity.id, interest.id);
    lock.current = true; setWorking(true); setError(null); setNotice(null);
    try {
      let proof = proofs.current.get(key) ?? savedProof(key);
      const receipt = session.lastReceipt?.();
      if (!proof && receipt && Date.parse(receipt.recordTime) >= Date.parse(opportunity.createdAt)) proof = discoveryRequestProof(receipt, market, session.party, interest.party, opportunity.terms);
      if (!proof) {
        if (opportunity.status === "closed") throw new Error("This listing is closed. Only an already committed request can be reconciled using its original receipt below.");
        const duplicate = [...(state?.requests ?? []), ...(state?.quotes ?? []), ...(state?.positions ?? [])].some(record =>
          matchesDiscoveryTerms(record.payload, market, session.party, interest.party, opportunity.terms));
        if (duplicate) throw new Error("A matching private request already exists. Recover its original update and request IDs below instead of sending a second request.");
        const succeeded = await run("Private request shared with lender", async () => {
          proof = await createDiscoveryRequest(session, market, interest.party, opportunity.terms, consent);
          proofs.current.set(key, proof);
          try { sessionStorage.setItem(key, JSON.stringify(proof)); } catch { /* Keep the confirmed proof in memory if storage is unavailable. */ }
          return proof.updateId;
        });
        if (!succeeded) return;
      }
      if (!proof) throw new Error("Check the original transaction before retrying approval.");
      proofs.current.set(key, proof);
      await approveOpportunityAccess(market, session.party, opportunity.id, interest.id, proof.updateId, proof.contractId);
      proofs.current.delete(key);
      try { sessionStorage.removeItem(key); } catch { /* Retaining a proof cannot grant access; the server verifies it. */ }
      setApproval(null); setConsent(false); setNotice("Access approved. The lender can review your private request and set an APR.");
    } catch (cause) { setError(`${(cause as Error).message} If the ledger request committed, its details are already shared with this lender. Retry approval using the original receipt.`); }
    finally { lock.current = false; setWorking(false); discovery.refresh(); }
  };
  const owners = new Set(discovery.own.opportunities.map(opportunity => opportunity.id));
  const available = discovery.opportunities.filter(opportunity => !owners.has(opportunity.id));
  return <section className="discovery-sheet" aria-label={side === "borrow" ? "Your opportunities" : "Open opportunities"}>
    <header className="discovery-heading"><div><h2>{side === "borrow" ? "Your opportunities" : "Open opportunities"}</h2><p className="sm">Open discovery. Financing details are shared after borrower approval.</p></div>
      <button type="button" className="ghost sm" onClick={discovery.refresh} disabled={working}>Refresh</button></header>
    {discovery.loading ? <p className="empty-state" role="status">Loading opportunities…</p> : discovery.error ? <p className="err" role="alert">{discovery.error}</p> : null}
    {discovery.ownError && <p className="err" role="alert">Your access records could not be loaded. {discovery.ownError}</p>}
    {notice && <p className="discovery-notice sm" role="status">{notice}</p>}
    {error && !approval && !requesting && !closing && <p className="err" role="alert">{error}</p>}
    {side === "borrow" ? <>
      {!discovery.loading && !discovery.ownError && !discovery.own.opportunities.length && <p className="empty-state">Publish an opportunity from Borrow. Lenders ask for access here before receiving your terms.</p>}
      {discovery.own.opportunities.map(opportunity => <article className="discovery-record" key={opportunity.id}>
        <div className="discovery-record-heading"><strong>Opportunity {opportunity.id.slice(0, 8)}</strong><span className="terminal-status">{opportunity.status === "open" ? "Open" : "Closed"}</span>
          {opportunity.status === "open" && <button type="button" className="ghost sm" disabled={busy || working} onClick={() => {setClosing(opportunity); setError(null);}}>Close listing</button>}</div>
        <dl className="discovery-metrics"><div><dt>Your requested cash</dt><dd>{fmtAmount(opportunity.terms.cashAmount)} {opportunity.terms.cashInstrument}</dd></div><div><dt>Duration</dt><dd>{opportunity.terms.termDays} days</dd></div><div><dt>Visibility</dt><dd>Details private</dd></div></dl>
        {!opportunity.incoming.length ? <p className="sm muted">{opportunity.status === "open" ? "Waiting for lenders to request access." : "No access requests received."}</p> : <ul className="discovery-interests">{opportunity.incoming.map(interest => <li key={interest.id}><div><strong>{interest.name}</strong><small>{partyDisplayName(interest.party)}</small></div>
          {interest.status === "approved" ? <span className="terminal-status">Access approved</span> : <button type="button" className="ghost sm" disabled={busy || working} onClick={() => {setApproval({opportunity, interest});setConsent(false);setError(null);}}>{opportunity.status === "closed" ? "Recover access status" : "Review access"}</button>}</li>)}</ul>}
      </article>)}
    </> : <>
      {!discovery.loading && !discovery.error && !available.length && <p className="empty-state">No open opportunities from other borrowers yet. A borrower can publish one from Borrow.</p>}
      {available.map(opportunity => {
        const interest = discovery.own.outgoing.find(item => item.opportunityId === opportunity.id);
        return <article className="discovery-record discovery-public-record" key={opportunity.id}><div><strong>Opportunity {opportunity.id.slice(0, 8)}</strong><p className="sm">{market.collateralInstrument} / {market.cashInstrument}</p><small className="muted">Listed {fmtTime(opportunity.createdAt)}</small></div>
          <div>{interest?.status === "approved" ? <span className="terminal-status">Access approved · Review in Lend</span> : interest ? <span className="terminal-status">Awaiting borrower approval</span> : <button className="ghost sm" type="button" disabled={working || !!discovery.ownError} onClick={() => {if (session.kind !== "account") {connect();return;}setRequesting(opportunity);setConsent(false);setError(null);}}>Request detail access</button>}</div>
        </article>;
      })}
      <p className="discovery-helper sm">No lender registration is required. Once approved, review the private request in Lend and set your own APR. A funded offer reserves cash only when you confirm it.</p>
    </>}
    <details className="terms-disclosure"><summary>What is visible?</summary><p className="sm">The board shows the market, an opportunity ID and listing time. Borrower identity, amount, collateral quantity and duration are withheld. The borrower sees each requesting lender's name and party ID. Approval shares full terms with that lender; their quote and position remain bilateral. The app's database operator can access stored discovery details.</p></details>
    {requesting && <Dialog title="Request private details" busy={working} close={() => setRequesting(null)}><p>The borrower reviews your request before sharing their identity, amount, collateral and duration.</p>
      <label className="desk-field"><span>Your lender name</span><input value={name} maxLength={80} onChange={event => setName(event.target.value)}/></label>
      <details className="party-detail"><summary>Your party shared with this borrower</summary><code>{session.party}</code></details>
      <label className="directory-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)}/><span>Share my lender name and party ID privately with this borrower.</span></label>
      {error && <p className="err" role="alert">{error}</p>}
      <button className="seal" disabled={working || !consent || !name.trim()} onClick={() => void mutation(async () => {await requestOpportunityAccess(market, session.party, requesting.id, name);}, "Access requested. Waiting for borrower approval.")}>{working ? "Requesting…" : "Request detail access"}</button>
      <p className="sm muted">This does not reserve cash or create a quote.</p>
    </Dialog>}
    {approval && <ApprovalDialog key={approval.interest.id} value={approval} consent={consent} setConsent={setConsent} busy={busy || working} error={error} close={() => setApproval(null)} approve={() => void approve()} recover={proof => {const key=proofKey(session.party,approval.opportunity.id,approval.interest.id);proofs.current.set(key,proof);try{sessionStorage.setItem(key,JSON.stringify(proof));}catch{/* Memory fallback. */}setError(null);setNotice("Original receipt retained. Approve access to verify it without creating another request.");}}/>}
    {closing && <Dialog title="Close opportunity listing" close={() => setClosing(null)} busy={working}><p>Remove opportunity {closing.id.slice(0,8)} from discovery and stop new access requests. Previously shared details remain available to approved lenders. Existing private requests, offers and positions remain active.</p>{error && <p className="err" role="alert">{error}</p>}<button className="seal" disabled={working} onClick={() => void mutation(() => closeOpportunity(market, session.party, closing.id), "Opportunity closed. Existing financing records remain active.")}>{working ? "Closing…" : "Close listing"}</button></Dialog>}
  </section>;
}

function ApprovalDialog({value, consent, setConsent, busy, error, close, approve, recover}: {value: {opportunity: OwnOpportunity; interest: DiscoveryInterest}; consent: boolean; setConsent(value: boolean): void; busy: boolean; error: string | null; close(): void; approve(): void; recover(proof: RequestProof): void}) {
  const [updateId, setUpdateId] = useState(""), [contractId, setContractId] = useState("");
  const {opportunity, interest} = value, terms = opportunity.terms;
  return <Dialog title={opportunity.status === "closed" ? "Recover lender access status" : "Approve lender access"} close={close} busy={busy}>
    <p>{opportunity.status === "closed" ? <>This listing is closed. Recover access status using an already committed private request to <strong>{interest.name}</strong>. No new request will be sent.</> : <>Create a private financing request for <strong>{interest.name}</strong>. This shares your identity and the full terms below with this lender.</>}</p>
    <dl className="discovery-approval-terms"><div><dt>Cash requested</dt><dd>{fmtAmount(terms.cashAmount,10)} {terms.cashInstrument}</dd></div><div><dt>Collateral</dt><dd>{fmtAmount(terms.collateralAmount,10)} {terms.collateralInstrument}</dd></div><div><dt>Duration</dt><dd>{terms.termDays} days from settlement</dd></div><div><dt>Maintenance margin</dt><dd>{fmtPct(Number(terms.marginThresholdPct),2)}</dd></div></dl>
    <details className="party-detail"><summary>Lender and full contract identities</summary><p>Lender<code>{interest.party}</code></p><p>Collateral issuer<code>{terms.collateralIssuer}</code></p><p>Cash issuer<code>{terms.cashIssuer}</code></p><p>Oracle<code>{terms.oracle}</code></p><p>Cure window: {terms.cureSeconds} seconds · Maximum mark age: {terms.maxPriceAgeSeconds} seconds</p></details>
    <label className="directory-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)}/><span>I approve sharing my identity, amount, collateral and full financing terms with this lender.</span></label>
    <p className="decision-note">Approval creates a bilateral request on Canton. It does not move assets, choose an APR or settle financing. The lender sends a funded offer for you to review separately.</p>
    {error && <p className="err" role="alert">{error}</p>}
    <button type="button" className="seal" disabled={busy || !consent} onClick={approve}>{busy ? "Confirming…" : opportunity.status === "closed" ? "Verify original request" : "Approve and share private request"}</button>
    <details className="terms-disclosure"><summary>Recover an already committed request</summary><p className="sm">If disclosure committed but access status did not update, use the update ID and QuoteRequest contract ID from the original ledger receipt. Recovery verifies that request; it does not submit another.</p><label className="desk-field"><span>Original update ID</span><input value={updateId} onChange={event => setUpdateId(event.target.value)}/></label><label className="desk-field"><span>QuoteRequest contract ID</span><input value={contractId} onChange={event => setContractId(event.target.value)}/></label><button type="button" className="ghost sm" disabled={busy || !updateId.trim() || !contractId.trim()} onClick={() => recover({updateId:updateId.trim(),contractId:contractId.trim()})}>Use original receipt</button></details>
  </Dialog>;
}
