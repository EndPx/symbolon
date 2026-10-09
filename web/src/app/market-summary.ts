import type { Deployment } from "../ledger/deployment";
import { num, type DeskState, type PriceFeed, type QuoteRequest } from "../ledger/symbolon";

export function publicMarket(feed: PriceFeed, d: Deployment): boolean {
  return d.network === "devnet" && !!d.publicDesk && feed.oracle === d.publicDesk.operator
    && feed.instrumentIssuer === d.assets.collateral.admin && feed.instrument === d.assets.collateral.symbol
    && feed.cashIssuer === d.assets.cash.admin && feed.cashInstrument === d.assets.cash.symbol;
}

const matches = (q: QuoteRequest, feed: PriceFeed) => q.oracle === feed.oracle
  && q.collateralIssuer === feed.instrumentIssuer && q.collateralInstrument === feed.instrument
  && q.cashIssuer === feed.cashIssuer && q.cashInstrument === feed.cashInstrument;

export function marketSummary(feed: PriceFeed, state: DeskState | null, party: string,
  side: "borrow" | "lend" | "oracle", d: Deployment, now = Date.now()) {
  const quotes = state?.quotes.filter(({payload:q}) =>
    (side === "lend" ? q.dealer === party : q.borrower === party)
    && matches(q,feed) && Date.parse(q.validUntil) > now) ?? [];
  const rates = quotes.map(({payload:q})=>num(q.rate)).filter(rate=>Number.isFinite(rate)&&rate>=0);
  const reference = publicMarket(feed,d) ? num(d.publicDesk!.rate) : null;
  const minRate = rates.length ? Math.min(...rates) : reference;
  const maxRate = rates.length ? Math.max(...rates) : reference;
  const terms = [...new Set(quotes.map(({payload:q})=>num(q.termDays)))].sort((a,b)=>a-b);
  const openPrincipal = state ? state.positions.filter(({payload:p}) =>
    (p.borrower === party || p.dealer === party) && matches(p,feed))
    .reduce((sum,{payload:p})=>sum+num(p.cashAmount),0) : null;
  return {minRate,maxRate,source:rates.length?"Your offers":reference!==null?"Reference":null,terms,openPrincipal};
}
