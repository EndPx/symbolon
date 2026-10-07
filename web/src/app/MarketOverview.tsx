import { useMemo, useState } from "react";
import type { Contract } from "../ledger/api";
import { deployment } from "../ledger/deployment";
import { DEFAULT_PRICE_AGE_SECONDS, fmtAmount, fmtPct, isFresh, num, type DeskState, type PriceFeed } from "../ledger/symbolon";

export const marketIdentity = (f: PriceFeed) => [f.oracle, f.instrumentIssuer, f.instrument, f.cashIssuer, f.cashInstrument].join("|");
export function latestPairs(feeds: Contract<PriceFeed>[]): Contract<PriceFeed>[] {
  const unique = new Map<string, Contract<PriceFeed>>();
  for (const feed of [...feeds].sort((a,b)=>Date.parse(b.payload.asOf)-Date.parse(a.payload.asOf))) {
    const key=marketIdentity(feed.payload); if(!unique.has(key)) unique.set(key,feed);
  }
  const d=deployment();
  const preferred=(f:PriceFeed)=>f.instrumentIssuer===d.assets.collateral.admin&&f.cashIssuer===d.assets.cash.admin;
  return [...unique.values()].sort((a,b)=>Number(preferred(b.payload))-Number(preferred(a.payload)) ||`${a.payload.instrument}/${a.payload.cashInstrument}`.localeCompare(`${b.payload.instrument}/${b.payload.cashInstrument}`));
}
export function TokenPair({collateral,cash}:{collateral:string;cash:string}) {
  return <span className="terminal-pair-icons"><span className="terminal-token collateral" aria-hidden="true">₿</span><span className="terminal-token cash" aria-hidden="true">$</span><span className="terminal-token-names">{collateral}<span>/ {cash}</span></span></span>;
}
export default function MarketOverview({state,party,connected,tradingEnabled=connected,pauseReason,mode,onConnect,onRequestPair,selectedPairId,onSelectPair}: {
  state:DeskState|null;party:string;connected:boolean;tradingEnabled?:boolean;pauseReason?:string;
  mode:"borrow"|"lend"|"oracle";onConnect():void;onRequestPair(pairId:string):void;selectedPairId?:string;onSelectPair?(pairId:string):void;
}) {
  const [collateral,setCollateral]=useState(""); const [cash,setCash]=useState("");
  const pairs=useMemo(()=>latestPairs(state?.feeds??[]),[state?.feeds]); const d=deployment();
  const assets=[...new Set(pairs.map(p=>p.payload.instrument))]; const currencies=[...new Set(pairs.map(p=>p.payload.cashInstrument))];
  const filtered=pairs.filter(p=>(!collateral||p.payload.instrument===collateral)&&(!cash||p.payload.cashInstrument===cash));
  const loading=connected&&!state&&!pauseReason;
  const open=(id:string)=>onSelectPair?onSelectPair(id):onRequestPair(id);
  const publicPair=d.publicDesk&&!connected?{oracle:d.publicDesk.operator,instrumentIssuer:d.assets.collateral.admin!,instrument:d.assets.collateral.symbol,cashIssuer:d.assets.cash.admin!,cashInstrument:d.assets.cash.symbol}:null;
  const venue=(f:PriceFeed)=>f.instrumentIssuer===d.publicDesk?.operator?"Symbolon":f.instrumentIssuer.startsWith("issuer-symbolon")?"LocalNet market":`Issuer · ${f.instrumentIssuer.slice(-6)}`;
  return <section className="terminal-market-browser" id="markets" aria-labelledby="market-list-title">
    <div className="terminal-page-heading"><div><h1 id="market-list-title">Fixed-rate markets</h1><p>Select a pair to borrow or lend.</p></div>{connected&&!tradingEnabled&&<span className="terminal-status readonly">{pauseReason?"Connection paused":"Connected in read-only mode"}</span>}</div>
    {!!pairs.length&&<div className="terminal-market-filters" aria-label="Market filters"><label>Collateral<select value={collateral} onChange={e=>setCollateral(e.target.value)}><option value="">All collateral</option>{assets.map(a=><option key={a}>{a}</option>)}</select></label><label>Loan token<select value={cash} onChange={e=>setCash(e.target.value)}><option value="">All loan tokens</option>{currencies.map(a=><option key={a}>{a}</option>)}</select></label></div>}
    <div className="terminal-market-table" aria-label="Fixed-rate financing markets">
      <div className="terminal-market-columns"><span>Market</span><span>Best offer</span><span>Collateral price</span><span>Status</span><span></span></div>
      {publicPair&&<button className="terminal-market-row" type="button" onClick={()=>open(marketIdentity({...publicPair,price:"0",asOf:"",readers:[]}))}><span className="terminal-market-pair"><TokenPair collateral={publicPair.instrument} cash={publicPair.cashInstrument}/><small>Symbolon</small></span><strong>On request</strong><span className="terminal-muted">Connect to view</span><span className="terminal-status">DevNet</span><span className="terminal-open">Open market</span></button>}
      {filtered.map(({contractId,payload:f})=>{
        const quotes=connected?(state?.quotes??[]).filter(({payload:q})=>(mode==="lend"?q.dealer===party:q.borrower===party)&&q.oracle===f.oracle&&q.collateralIssuer===f.instrumentIssuer&&q.collateralInstrument===f.instrument&&q.cashIssuer===f.cashIssuer&&q.cashInstrument===f.cashInstrument&&Date.parse(q.validUntil)>Date.now()):[];
        const best=quotes.length?Math.min(...quotes.map(q=>num(q.payload.rate))):null; const fresh=isFresh(f,DEFAULT_PRICE_AGE_SECONDS),id=marketIdentity(f);
        return <button type="button" className={`terminal-market-row${selectedPairId===id?" selected":""}`} key={contractId} onClick={()=>open(id)}><span className="terminal-market-pair"><TokenPair collateral={f.instrument} cash={f.cashInstrument}/><small>{venue(f)}</small></span><strong>{best===null?"On request":fmtPct(best)}</strong><span>{fmtAmount(f.price)} <small>{f.cashInstrument}</small></span><span className={`terminal-status ${fresh?"fresh":"stale"}`}>{fresh?"Current":"Price stale"}</span><span className="terminal-open">Open market</span></button>;
      })}
      {!filtered.length&&!publicPair&&<div className="terminal-empty"><h2>{pauseReason?"Ledger view unavailable":loading?"Loading markets…":pairs.length?"No matching markets":"No pair available yet"}</h2><p>{pauseReason??(loading?"Reading your account.":pairs.length?"Change the filters to see more pairs.":connected?"Your account is connected. No market has been shared with this party yet.":"Connect to view your markets.")}</p>{!connected&&<button className="seal" onClick={onConnect}>Connect</button>}</div>}
    </div>
    {pauseReason&&!!filtered.length&&<p className="terminal-inline-error" role="status">{pauseReason}</p>}
  </section>;
}
