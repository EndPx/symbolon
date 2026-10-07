import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import MarketOverview from "../src/app/MarketOverview.tsx";
import type { DeskState } from "../src/ledger/symbolon.ts";

const empty: DeskState = {holdings:[],feeds:[],requests:[],quotes:[],positions:[],proposals:[],closed:[]};
const props = {state:empty,party:"borrower::test",mode:"borrow" as const,onConnect:()=>{},onRequestPair:()=>{}};
test("a signed-in read-only borrower with no market is never asked to connect again",()=>{
  const html=renderToStaticMarkup(createElement(MarketOverview,{...props,connected:true,tradingEnabled:false}));
  assert.match(html,/Your account is connected/);
  assert.match(html,/No pair available yet/);
  assert.doesNotMatch(html,/>Connect(?: wallet)?<|href="#request-repo"/);
});
test("an unconnected visitor receives an explicit connection action",()=>{
  const html=renderToStaticMarkup(createElement(MarketOverview,{...props,connected:false,tradingEnabled:false}));
  assert.match(html,/>Connect<\/button>/);
  assert.doesNotMatch(html,/Your account is connected/);
});
test("a connected read-only borrower sees an authorized pair without an enabled borrowing action",()=>{
  const state:DeskState={...empty,feeds:[{contractId:"feed",templateId:"package:Symbolon.Repo:PriceFeed",payload:{
    oracle:"oracle::test",instrumentIssuer:"issuer::test",instrument:"cBTC-demo",cashIssuer:"issuer::test",cashInstrument:"USDCx-demo",price:"60000",asOf:new Date().toISOString(),readers:[props.party],
  }}]};
  const html=renderToStaticMarkup(createElement(MarketOverview,{...props,state,connected:true,tradingEnabled:false}));
  assert.match(html,/cBTC-demo/);assert.match(html,/Connected in read-only mode/);
  assert.doesNotMatch(html,/>Connect(?: wallet)?<|href="#request-repo"/);
});
test("a ledger outage pauses an enabled account without presenting a deployment-policy restriction",()=>{
  const state:DeskState={...empty,feeds:[{contractId:"feed",templateId:"package:Symbolon.Repo:PriceFeed",payload:{
    oracle:"oracle::test",instrumentIssuer:"issuer::test",instrument:"cBTC-demo",cashIssuer:"issuer::test",cashInstrument:"USDCx-demo",price:"60000",asOf:new Date().toISOString(),readers:[props.party],
  }}]};
  const html=renderToStaticMarkup(createElement(MarketOverview,{...props,state,connected:true,tradingEnabled:false,pauseReason:"Trading paused until the ledger connection recovers."}));
  assert.match(html,/Trading paused until the ledger connection recovers/);
  assert.doesNotMatch(html,/Trading is not enabled for this deployment/);
});
test("a failed first ledger read is not reported as continuing to load or missing provisioning",()=>{
  const html=renderToStaticMarkup(createElement(MarketOverview,{...props,state:null,connected:true,tradingEnabled:false,pauseReason:"Trading paused until the ledger connection recovers."}));
  assert.match(html,/Ledger view unavailable/);
  assert.doesNotMatch(html,/Loading financing pairs|Waiting for the ledger read|No financing pair has been provisioned/);
});
