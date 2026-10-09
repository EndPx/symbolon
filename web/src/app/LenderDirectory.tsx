import { useEffect, useState } from "react";
import type { Session } from "../ledger/session";
import type { PriceFeed } from "../ledger/symbolon";
import { partyDisplayName } from "./market-label";
import { eligibleLenders, lenderMarket, lenderMarketKey, readLenders, registerLender, type RegisteredLender } from "../ledger/lender-directory";

export function useLenderDirectory(feed: PriceFeed | undefined, party: string, sandboxParties?: string[]) {
  const market = feed ? lenderMarket(feed) : null;
  const key = market ? lenderMarketKey(market) : "";
  const [version, setVersion] = useState(0);
  const [snapshot, setSnapshot] = useState<{key: string; lenders: RegisteredLender[]; error: string | null} | null>(null);
  useEffect(() => {
    if (!market || sandboxParties) return;
    const controller = new AbortController();
    readLenders(market, controller.signal).then(lenders => setSnapshot({key, lenders, error: null}))
      .catch(error => {if (!controller.signal.aborted) setSnapshot({key, lenders: [], error: error.message});});
    return () => controller.abort();
  // The canonical key covers every market field; version is an explicit refresh.
  }, [key, version, !!sandboxParties]);
  const seeded = sandboxParties?.filter(candidate => candidate.startsWith("dealer")).map(candidate => ({party: candidate, name: candidate.split("::")[0], registeredAt: "2026-01-01T00:00:00Z"}));
  const current = snapshot?.key === key ? snapshot : null;
  const lenders = seeded ?? current?.lenders ?? [];
  return {market, lenders, recipients: eligibleLenders(lenders, party), loading: !sandboxParties && !!market && !current,
    error: current?.error ?? null, refresh: () => {setSnapshot(null); setVersion(value => value + 1);}};
}

export function LenderRegistration({session, feed}: {session: Session; feed: PriceFeed}) {
  const directory = useLenderDirectory(feed, session.party);
  const registered = directory.lenders.some(lender => lender.party === session.party);
  const [name, setName] = useState(partyDisplayName(session.party).slice(0, 80));
  const [consent, setConsent] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const update = async (active: boolean) => {
    if (busy || !directory.market || session.kind !== "account" || (active && (!consent || !name.trim()))) return;
    setBusy(true); setError(null);
    try {await registerLender(directory.market, session.party, name, active); setConsent(false); directory.refresh();}
    catch (cause) {setError((cause as Error).message); directory.refresh();}
    finally {setBusy(false);}
  };
  return <section className="lender-directory" aria-label="Lender registration">
    <h3>{registered ? "Registered for this market" : "Receive new borrow requests"}</h3>
    <p className="sm">{registered ? "New requests sent to all registered lenders include your party. Set your own APR before sending an offer." : "Register your party for this asset pair and price source. Registration does not reserve cash or create an offer."}</p>
    {session.kind !== "account" ? <p className="sm muted">Lender registration currently requires a connected HackCanton account.</p>
      : directory.loading ? <p className="sm" role="status">Loading lender registration…</p>
      : directory.error ? <><p className="err" role="alert">{directory.error}</p><button type="button" className="ghost sm" onClick={directory.refresh}>Retry directory</button></>
      : registered ? <button className="ghost sm" type="button" disabled={busy} onClick={() => void update(false)}>{busy ? "Updating…" : "Stop receiving new requests"}</button>
      : <><label className="desk-field"><span>Lender name</span><input maxLength={80} value={name} onChange={event => setName(event.target.value)} /></label>
        <label className="directory-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>List my party ID and lender name for this market so borrowers can send me requests.</span></label>
        <button className="ghost sm" type="button" disabled={busy || !consent || !name.trim() || !directory.market} onClick={() => void update(true)}>{busy ? "Registering…" : "Register as lender"}</button></>}
    {error && <p className="err" role="alert">{error}</p>}
    <p className="sm muted">Registration covers future requests. Cash availability is checked when you send a funded offer. Existing requests and offers remain until withdrawn, passed, declined or revoked.</p>
  </section>;
}
