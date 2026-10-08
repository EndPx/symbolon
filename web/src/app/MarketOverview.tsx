import { useMemo, useState } from "react";
import type { Contract } from "../ledger/api";
import { deployment, networkLabel } from "../ledger/deployment";
import { DEFAULT_PRICE_AGE_SECONDS, fmtAmount, fmtPct, isFresh, type DeskState, type PriceFeed } from "../ledger/symbolon";
import { marketSummary } from "./market-summary";

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
  const publicPair:PriceFeed|null=d.publicDesk&&!connected?{oracle:d.publicDesk.operator,instrumentIssuer:d.assets.collateral.admin!,instrument:d.assets.collateral.symbol,cashIssuer:d.assets.cash.admin!,cashInstrument:d.assets.cash.symbol,price:d.publicDesk.referencePrice,asOf:"",readers:[]}:null;
  const rows=publicPair?[{contractId:"public-reference",payload:publicPair}]:pairs;
  const assets=[...new Set(rows.map(p=>p.payload.instrument))]; const currencies=[...new Set(rows.map(p=>p.payload.cashInstrument))];
  const filtered=rows.filter(p=>(!collateral||p.payload.instrument===collateral)&&(!cash||p.payload.cashInstrument===cash));
  const loading=connected&&!state&&!pauseReason;
  const open=(id:string)=>onSelectPair?onSelectPair(id):onRequestPair(id);
  const venue=(f:PriceFeed)=>f.instrumentIssuer===d.publicDesk?.operator?"Symbolon":f.instrumentIssuer.startsWith("issuer-symbolon")?"LocalNet market":`Issuer · ${f.instrumentIssuer.slice(-6)}`;
  return <section className="terminal-market-browser" id="markets" aria-labelledby="market-list-title">
    <h1 id="market-list-title" className="sr-only">Markets</h1>
    <div className="terminal-market-toolbar">{!!rows.length&&<div className="terminal-market-filters" aria-label="Market filters"><label><span className="sr-only">Collateral</span><select value={collateral} onChange={e=>setCollateral(e.target.value)}><option value="">All collateral</option>{assets.map(a=><option key={a}>{a}</option>)}</select></label><label><span className="sr-only">Loan token</span><select value={cash} onChange={e=>setCash(e.target.value)}><option value="">All loan tokens</option>{currencies.map(a=><option key={a}>{a}</option>)}</select></label></div>}
      <span className="terminal-status">Canton {networkLabel()}{d.network!=="mainnet"?" · Test assets":""}</span>{connected&&!tradingEnabled&&<span className="terminal-status readonly">{pauseReason?"Connection paused":"Connected in read-only mode"}</span>}
    </div>
    <div className="terminal-market-table" aria-label="Fixed-rate financing markets">
      <div className="terminal-market-columns" aria-hidden="true"><span>Market</span><span>Fixed APR</span><span>Term</span><span>Your open financing</span><span>Collateral mark</span><span>Status</span><span></span></div>
      {filtered.map(({contractId,payload:f})=>{
        const summary=marketSummary(f,connected?state:null,party,mode,d),fresh=isFresh(f,DEFAULT_PRICE_AGE_SECONDS),id=marketIdentity(f);
        const term=summary.terms.length?`${summary.terms[0]}${summary.terms.length>1?`–${summary.terms.at(-1)}`:""} days`:"Per request";
        return <button type="button" className={`terminal-market-row${selectedPairId===id?" selected":""}`} key={contractId} onClick={()=>open(id)}>
          <span className="terminal-market-pair"><TokenPair collateral={f.instrument} cash={f.cashInstrument}/><small>{venue(f)}</small></span>
          <span data-label="Fixed APR" className="terminal-market-rate" title="Annualized ACT/360. Review the lender's actual offer before settlement."><span className="sr-only terminal-market-label">Fixed APR </span><strong>{summary.minRate===null?"On request":`${fmtPct(summary.minRate)}${summary.maxRate!==summary.minRate?` – ${fmtPct(summary.maxRate!)}`:""}`}</strong>{summary.source&&<small>{summary.source}</small>}</span>
          <span data-label="Term"><span className="sr-only terminal-market-label">Term </span>{term}</span>
          <span data-label="Your open financing" className="terminal-market-amount"><span className="sr-only terminal-market-label">Your open financing </span>{summary.openPrincipal===null?"—":fmtAmount(summary.openPrincipal)}<small>{f.cashInstrument}</small></span>
          <span data-label="Collateral mark" className="terminal-market-amount"><span className="sr-only terminal-market-label">Collateral mark </span>{fmtAmount(f.price)}<small>{f.cashInstrument}</small></span>
          <span data-label="Status"><span className="sr-only terminal-market-label">Status </span><span className={`terminal-status ${publicPair?"":fresh?"fresh":"stale"}`}>{publicPair?"Reference":fresh?"Current":"Price stale"}</span></span>
          <span className="terminal-open"><span className="sr-only">Open market</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></span>
        </button>;
      })}
      {!filtered.length&&<div className="terminal-empty"><h2>{pauseReason?"Ledger view unavailable":loading?"Loading markets…":rows.length?"No matching markets":"No pair available yet"}</h2><p>{pauseReason??(loading?"Reading your account.":rows.length?"Change the filters to see more pairs.":connected?"Your account is connected. No market has been shared with this party yet.":"Connect to view your markets.")}</p>{!connected&&<button className="seal" onClick={onConnect}>Connect</button>}</div>}
    </div>
    {pauseReason&&!!filtered.length&&<p className="terminal-inline-error" role="status">{pauseReason}</p>}
  </section>;
}
