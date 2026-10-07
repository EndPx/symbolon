import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicAccess } from "../src/app/PublicAccess.tsx";
import { defaultDeployment, deployment, loadDeployment } from "../src/ledger/deployment.ts";
import type { Session } from "../src/ledger/session.ts";
import type { DeskState, PriceFeed } from "../src/ledger/symbolon.ts";

test("public Borrow onboarding appears for missing exact assets or usable marks and disappears when ready", async () => {
  const previous = deployment(), fetchBefore = globalThis.fetch, operator = "lender::public", party = "borrower::account", hash = "a".repeat(64);
  const profile = {...defaultDeployment,publicPackageId:hash,synchronizerId:"sync::test",
    assets:{collateral:{...defaultDeployment.assets.collateral,admin:operator,symbol:"cBTC-demo"},cash:{...defaultDeployment.assets.cash,admin:operator,symbol:"USDCx-demo"}},
    publicDesk:{operator,contractId:"desk",createdEventBlob:"blob",label:"Symbolon",referencePrice:"60000",rate:"0.052",maxPrincipal:"10000"}};
  const session: Session = {kind:"account",party,label:"Account",read:async()=>[],submit:async()=>"update",disconnect:async()=>{}};
  const empty: DeskState = {holdings:[],feeds:[],requests:[],quotes:[],positions:[],proposals:[],closed:[]};
  const mark: PriceFeed = {oracle:operator,instrumentIssuer:operator,instrument:"cBTC-demo",cashIssuer:operator,cashInstrument:"USDCx-demo",price:"60000",asOf:new Date().toISOString(),readers:[party]};
  const ready: DeskState = {...empty,holdings:[{contractId:"holding",templateId:"holding",payload:{issuer:operator,owner:party,instrument:"cBTC-demo",amount:"1",viewers:[],lockParties:[]}}],feeds:[{contractId:"mark",templateId:"feed",payload:mark}]};
  const render = (state: DeskState, busy = false) => renderToStaticMarkup(createElement(PublicAccess,{session,state,busy,borrowerMode:true,compact:true,run:async()=>true}));
  try {
    globalThis.fetch = async () => new Response(JSON.stringify(profile));
    await loadDeployment();
    assert.match(render(empty),/>Get DevNet assets<\/button>/);
    assert.doesNotMatch(render(empty),/public-access-title|Available collateral/);
    assert.equal(render(ready),"");
    const wrongIssuer = {...ready,holdings:ready.holdings.map(item => ({...item,payload:{...item.payload,issuer:"issuer::other"}}))};
    assert.match(render(wrongIssuer),/>Get DevNet assets<\/button>/);
    const wrongMark = {...ready,feeds:ready.feeds.map(item => ({...item,payload:{...item.payload,cashIssuer:"issuer::other"}}))};
    assert.match(render(wrongMark),/Prepare a simulated reference mark/);
    assert.doesNotMatch(render(wrongMark),/Refresh reference mark/);
    const stale = {...ready,feeds:ready.feeds.map(item => ({...item,payload:{...item.payload,asOf:new Date(Date.now()-7200_000).toISOString()}}))};
    assert.match(render(stale),/>Refresh reference mark<\/button>/);
    assert.match(render(stale,true),/disabled=""[^>]*>Get DevNet assets<\/button>/);
  } finally {
    globalThis.fetch = async () => new Response(JSON.stringify(previous));
    await loadDeployment();
    globalThis.fetch = fetchBefore;
  }
});
