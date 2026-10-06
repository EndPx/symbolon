import { useMemo, useState } from "react";
import type { Contract } from "../ledger/api";
import {
  balanceOf, DEFAULT_PRICE_AGE_SECONDS, fmtAmount, fmtPct, fmtTime, isFresh,
  num, partyLabel, type DeskState, type PriceFeed,
} from "../ledger/symbolon";

type Pair = Contract<PriceFeed>;
const identity = ({ payload: f }: Pair) =>
  [f.oracle, f.instrumentIssuer, f.instrument, f.cashIssuer, f.cashInstrument].join("|");

function latestPairs(feeds: Pair[]): Pair[] {
  const pairs = new Map<string, Pair>();
  for (const feed of [...feeds].sort((a, b) => Date.parse(b.payload.asOf) - Date.parse(a.payload.asOf))) {
    const key = identity(feed);
    if (!pairs.has(key)) pairs.set(key, feed);
  }
  return [...pairs.values()].sort((a, b) =>
    `${a.payload.instrument}/${a.payload.cashInstrument}`.localeCompare(`${b.payload.instrument}/${b.payload.cashInstrument}`));
}

export default function MarketOverview({ state, party, connected, mode, onConnect, onRequestPair }: {
  state: DeskState | null;
  party: string;
  connected: boolean;
  mode: "borrow" | "lend" | "oracle";
  onConnect(): void;
  onRequestPair(pairId: string): void;
}) {
  const [collateral, setCollateral] = useState("");
  const [cash, setCash] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const pairs = useMemo(() => latestPairs(state?.feeds ?? []), [state?.feeds]);
  const assets = [...new Set(pairs.map(({ payload }) => payload.instrument))].sort();
  const currencies = [...new Set(pairs.map(({ payload }) => payload.cashInstrument))].sort();
  const filtered = pairs.filter(({ payload }) =>
    (!collateral || payload.instrument === collateral) && (!cash || payload.cashInstrument === cash));
  const selected = filtered.find(pair => identity(pair) === selectedId) ?? filtered[0];
  const feed = selected?.payload;
  const partyRequests = connected ? (state?.requests ?? []).filter(({ payload }) => payload.borrower === party || payload.dealer === party).length : 0;
  const partyQuotes = connected ? (state?.quotes ?? []).filter(({ payload }) => (payload.borrower === party || payload.dealer === party) && Date.parse(payload.validUntil) > Date.now()).length : 0;
  const partyPositions = connected ? (state?.positions ?? []).filter(({ payload }) => payload.borrower === party || payload.dealer === party).length : 0;
  const quotes = feed && connected ? (state?.quotes ?? []).filter(({ payload: q }) =>
    (mode === "lend" ? q.dealer === party : q.borrower === party) && q.collateralIssuer === feed.instrumentIssuer &&
    q.collateralInstrument === feed.instrument && q.cashIssuer === feed.cashIssuer &&
    q.cashInstrument === feed.cashInstrument && q.oracle === feed.oracle &&
    Date.parse(q.validUntil) > Date.now()).sort((a, b) => num(a.payload.rate) - num(b.payload.rate)) : [];
  const fresh = feed ? isFresh(feed, DEFAULT_PRICE_AGE_SECONDS) : false;

  return <section className="market-overview" id="markets" aria-labelledby="financing-pairs-title">
    <div className="market-heading">
      <div><p className="market-eyebrow">Symbolon private desk</p><h1 id="financing-pairs-title">Fixed-rate financing</h1>
        <p>{mode === "borrow" ? "Explore collateral pairs, then request private quotes from your dealers. Rates are agreed per deal."
          : mode === "lend" ? "Review visible collateral pairs and price the private RFQs addressed to your party."
          : "Review visible pairs and publish current marks for the parties that depend on them."}</p></div>
      <span className="market-private-label">Bilateral repo on Canton</span>
    </div>
    <div className="market-filterbar" aria-label="Financing pair filters">
      <label>Collateral<select value={collateral} onChange={e => setCollateral(e.target.value)}>
        <option value="">All visible assets</option>{assets.map(asset => <option key={asset}>{asset}</option>)}
      </select></label>
      <label>Cash denomination<select value={cash} onChange={e => setCash(e.target.value)}>
        <option value="">All visible cash</option>{currencies.map(currency => <option key={currency}>{currency}</option>)}
      </select></label>
      <span className="market-count">{filtered.length} visible {filtered.length === 1 ? "pair" : "pairs"}</span>
    </div>
    <div className="market-layout">
      <div className="market-list" aria-label="Visible financing pairs">
      <div className="market-list-head"><span>Collateral / cash</span><span>Oracle mark</span><span>Mark status</span><span>{mode === "oracle" ? "Funding rate" : "Your best quote"}</span></div>
        {filtered.length === 0 && <div className="market-empty"><strong>No visible financing pairs</strong><p>{pairs.length ? "Try a different filter." : connected ? "Ask an agreed oracle to publish a price feed visible to your party." : "Connect a wallet to see your authorized financing pairs."}</p></div>}
        {filtered.map(pair => {
          const f = pair.payload;
          const pairQuotes = connected ? (state?.quotes ?? []).filter(({ payload: q }) =>
            (mode === "lend" ? q.dealer === party : q.borrower === party) && q.collateralIssuer === f.instrumentIssuer &&
            q.collateralInstrument === f.instrument && q.cashIssuer === f.cashIssuer &&
            q.cashInstrument === f.cashInstrument && q.oracle === f.oracle && Date.parse(q.validUntil) > Date.now()) : [];
          const best = pairQuotes.length ? Math.min(...pairQuotes.map(q => num(q.payload.rate))) : null;
          return <button type="button" className={`market-row${selected?.contractId === pair.contractId ? " active" : ""}`}
            aria-pressed={selected?.contractId === pair.contractId} onClick={() => setSelectedId(identity(pair))} key={identity(pair)}>
            <span className="market-pair"><strong>{f.instrument} <span aria-hidden="true">/</span> {f.cashInstrument}</strong><small>Issuer {partyLabel(f.instrumentIssuer)}</small></span>
            <span className="market-number">{fmtAmount(f.price)} {f.cashInstrument}</span>
            <span className={`market-state${isFresh(f, DEFAULT_PRICE_AGE_SECONDS) ? "" : " stale"}`}>{isFresh(f, DEFAULT_PRICE_AGE_SECONDS) ? "Current" : "Stale"}</span>
            <span className="market-number">{best === null ? "—" : fmtPct(best)}</span>
          </button>;
        })}
        {connected && <div className="market-list-summary" aria-label="Your ledger activity">
          <div><span>Open RFQs</span><strong>{partyRequests}</strong></div>
          <div><span>Live quotes</span><strong>{partyQuotes}</strong></div>
          <div><span>Open repos</span><strong>{partyPositions}</strong></div>
        </div>}
      </div>
      <aside className="market-detail" aria-label="Selected financing pair">
        {feed ? <>
          <p className="market-eyebrow">PAIR DETAIL</p>
          <h2>{feed.instrument} <span aria-hidden="true">/</span> {feed.cashInstrument}</h2>
          <p className="market-detail-copy">Dealer quotes set the fixed rate. Oracle marks check collateral health.</p>
          {mode !== "oracle" && <div className="market-quote-focus">
            <span>{mode === "lend" ? "Your quoted fixed rate" : "Your best private quote"}</span>
            <strong>{quotes.length ? fmtPct(num(quotes[0].payload.rate)) : "Awaiting quote"}</strong>
            <small>{quotes.length ? `${quotes.length} visible to your party` : "Rates are agreed with a dealer, per deal"}</small>
          </div>}
          <dl className="market-facts">
            <div><dt>Latest oracle mark</dt><dd>{fmtAmount(feed.price)} {feed.cashInstrument}</dd></div>
            <div><dt>Mark status</dt><dd className={fresh ? "" : "market-alert"}>{fresh ? "Current" : "Stale — request a refresh"}</dd></div>
            <div><dt>Published</dt><dd>{fmtTime(feed.asOf)}</dd></div>
            {mode === "borrow" && <div><dt>Available collateral</dt><dd>{connected ? `${fmtAmount(balanceOf(state?.holdings ?? [], party, feed.instrument, feed.instrumentIssuer), 4)} ${feed.instrument}` : "Connect to view"}</dd></div>}
          </dl>
          <details className="party-detail"><summary>Issuer and oracle party IDs</summary><p>Collateral issuer <code>{feed.instrumentIssuer}</code></p><p>Cash issuer <code>{feed.cashIssuer}</code></p><p>Oracle <code>{feed.oracle}</code></p></details>
          {connected ? <a className="seal market-action" href={mode === "oracle" ? "#oracle-marks" : mode === "lend" ? "#dealer-requests" : quotes.length ? "#private-quotes" : "#request-repo"}
              onClick={() => { if (mode === "borrow") onRequestPair(identity(selected)); }}>
              {mode === "oracle" ? "Manage oracle marks" : mode === "lend" ? "View incoming RFQs" : quotes.length ? "Review private quotes" : "Request a quote"}</a>
            : <button className="seal market-action" onClick={onConnect}>Connect wallet</button>}
          <p className="market-disclosure">{fresh ? "Rate and repayment amount are confirmed only in a dealer quote." : "A fresh oracle mark is required before settlement."}</p>
        </> : <div className="market-detail-empty"><p className="market-eyebrow">PAIR DETAIL</p><h2>Select a visible pair</h2><p>Private quotes and holdings appear only in an authorized party view.</p>{!connected && <button className="seal market-action" onClick={onConnect}>Connect wallet</button>}</div>}
      </aside>
    </div>
  </section>;
}
