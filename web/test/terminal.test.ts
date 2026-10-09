import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TerminalPanels, TerminalTabs } from "../src/app/TerminalTabs.tsx";
import { marketDesk, tabForKey } from "../src/app/terminal-state.ts";
import type { Contract } from "../src/ledger/api.ts";
import type { DeskState, PriceFeed, QuoteRequest, RepoPosition } from "../src/ledger/symbolon.ts";

const pair: PriceFeed = {oracle:"oracle::a",instrumentIssuer:"issuer::a",instrument:"cBTC-demo",cashIssuer:"cash::a",cashInstrument:"USDCx-demo",price:"60000",asOf:new Date().toISOString(),readers:["borrower::a"]};
const request: QuoteRequest = {borrower:"borrower::a",dealer:"lender::a",oracle:pair.oracle,collateralIssuer:pair.instrumentIssuer,collateralInstrument:pair.instrument,collateralAmount:"1",cashIssuer:pair.cashIssuer,cashInstrument:pair.cashInstrument,cashAmount:"1000",termDays:"30",marginThresholdPct:"1.05",cureSeconds:"3600",maxPriceAgeSeconds:"3600"};
const contract = <T,>(id: string, payload: T): Contract<T> => ({contractId:id,templateId:"test",payload});

test("market records are isolated by both issuers and the agreed oracle", () => {
  const position: RepoPosition = {...request,repurchasePrice:"1001",rate:"0.01",pledgedCids:["holding"],startTime:new Date().toISOString(),maturity:new Date().toISOString(),status:{tag:"Active",value:{}}};
  const requests = [contract("exact",request),contract("other-collateral-issuer",{...request,collateralIssuer:"issuer::b"}),contract("other-cash-issuer",{...request,cashIssuer:"cash::b"}),contract("other-oracle",{...request,oracle:"oracle::b"})];
  const state: DeskState = {
    holdings:[contract("holding",{issuer:"issuer::b",owner:"borrower::a",instrument:"cBTC-demo",amount:"4",viewers:[],lockParties:[]})],
    feeds:[contract("feed",pair)], requests,
    quotes:requests.map(item => contract(`quote-${item.contractId}`,{...item.payload,rate:"0.01",cashCid:"cash-holding",validUntil:new Date().toISOString()})),
    positions:[contract("position",position),contract("other-position",{...position,oracle:"oracle::b"})],
    proposals:[contract("proposal",{borrower:request.borrower,dealer:request.dealer,posCid:"position",newInstrument:"ETH-demo",newIssuer:"issuer::b",newQty:"1",newHoldingCid:"replacement",newFeedCid:"replacement-feed"}),contract("other-proposal",{borrower:request.borrower,dealer:request.dealer,posCid:"other-position",newInstrument:"ETH-demo",newIssuer:"issuer::b",newQty:"1",newHoldingCid:"replacement",newFeedCid:"replacement-feed"})],
    closed:[],
  };
  const scoped = marketDesk(state,pair);
  assert.deepEqual(scoped.requests.map(item => item.contractId),["exact"]);
  assert.deepEqual(scoped.quotes.map(item => item.contractId),["quote-exact"]);
  assert.deepEqual(scoped.positions.map(item => item.contractId),["position"]);
  assert.deepEqual(scoped.proposals.map(item => item.contractId),["proposal"]);
  assert.equal(scoped.holdings,state.holdings,"substitution must retain access to issuer-separated alternative holdings");
  assert.equal(scoped.feeds,state.feeds,"substitution and health checks need all authorized feeds");
  assert.equal(state.requests.length,4,"portfolio retains the complete authorized state");
});

test("tabs support wrapping Arrow keys, Home and End without treating unrelated keys as navigation", () => {
  const tabs = ["overview","offers","positions","activity"] as const;
  assert.equal(tabForKey("ArrowLeft","overview",tabs),"activity");
  assert.equal(tabForKey("ArrowRight","activity",tabs),"overview");
  assert.equal(tabForKey("Home","positions",tabs),"overview");
  assert.equal(tabForKey("End","offers",tabs),"activity");
  assert.equal(tabForKey("Tab","offers",tabs),null);
  assert.equal(tabForKey("Enter","offers",tabs),null);
});

test("each content tab has a labelled panel and only the active panel exposes content", () => {
  const options = [{value:"overview",label:"Overview"},{value:"offers",label:"Offers",count:2}];
  const tabs = renderToStaticMarkup(createElement(TerminalTabs,{id:"market",label:"Market content",value:"offers",options,onChange:() => {}}));
  const panels = renderToStaticMarkup(createElement(TerminalPanels,{id:"market",value:"offers",values:options.map(item => item.value)},createElement("p",null,"Private offers")));
  assert.match(tabs,/role="tablist" aria-label="Market content"/);
  assert.match(tabs,/id="market-tab-overview" aria-controls="market-panel-overview" aria-selected="false" tabindex="-1"/);
  assert.match(tabs,/id="market-tab-offers" aria-controls="market-panel-offers" aria-selected="true" tabindex="0"/);
  assert.match(panels,/id="market-panel-overview" aria-labelledby="market-tab-overview" hidden="" tabindex="-1"><\/div>/);
  assert.match(panels,/id="market-panel-offers" aria-labelledby="market-tab-offers" tabindex="0"><p>Private offers<\/p>/);
  assert.equal((panels.match(/Private offers/g) ?? []).length,1);
});
