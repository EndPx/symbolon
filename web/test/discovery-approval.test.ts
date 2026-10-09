import test from "node:test";
import assert from "node:assert/strict";
import profile from "../public/deployment.json";
import { createDiscoveryRequest, discoveryRequestProof, discoveryRequestTerms, matchesDiscoveryTerms } from "../src/app/discovery-approval";
import type { DiscoveryTerms } from "../src/ledger/discovery-model";
import type { LenderMarket } from "../src/ledger/lender-directory-model";
import type { Session } from "../src/ledger/session";
import type { CommittedReceipt } from "../src/ledger/canton-v2";

const issuer = profile.publicDesk.operator;
const market: LenderMarket = {network:"devnet",corePackageId:profile.corePackageId,synchronizerId:profile.synchronizerId,oracle:issuer,
  collateralIssuer:issuer,collateralInstrument:"cBTC-demo",cashIssuer:issuer,cashInstrument:"USDCx-demo"};
const terms: DiscoveryTerms = {oracle:issuer,collateralIssuer:issuer,collateralInstrument:market.collateralInstrument,collateralAmount:"0.0250000000",
  cashIssuer:issuer,cashInstrument:market.cashInstrument,cashAmount:"1000.0000000000",termDays:30,marginThresholdPct:"1.0500000000",cureSeconds:3600,maxPriceAgeSeconds:3600};
const borrower="alice::party", dealer="bob::party";
const event = {CreatedEvent:{templateId:`${market.corePackageId}:Symbolon.Repo:QuoteRequest`,contractId:"request-cid",createArgument:{...terms,borrower,dealer,termDays:"30",cureSeconds:"3600",maxPriceAgeSeconds:"3600"}}};
const receipt: CommittedReceipt = {commandId:"command",updateId:"real-update",offset:100,synchronizerId:market.synchronizerId,effectiveAt:"2026-10-10T00:00:00Z",recordTime:"2026-10-10T00:00:01Z",events:[event]};

test("approval keeps Numeric10 exact and rejects amounts that JS number conversion would change", () => {
  assert.equal(discoveryRequestTerms(terms,dealer).cashAmount,1000);
  assert.throws(()=>discoveryRequestTerms({...terms,cashAmount:"1000000000000000.0000000001"},dealer),/precision/);
});
test("approval proof binds committed creation to exact borrower, lender, market and terms", () => {
  assert.deepEqual(discoveryRequestProof(receipt,market,borrower,dealer,terms),{updateId:"real-update",contractId:"request-cid"});
  assert.equal(discoveryRequestProof(receipt,market,borrower,"outsider::party",terms),null);
  assert.equal(discoveryRequestProof(receipt,{...market,synchronizerId:"wrong"},borrower,dealer,terms),null);
  assert.equal(discoveryRequestProof(receipt,market,borrower,dealer,{...terms,cashAmount:"1001.0000000000"}),null);
  assert.equal(discoveryRequestProof({...receipt,events:[event,event]},market,borrower,dealer,terms),null);
});
test("duplicate detection still binds original terms after the lender quotes or financing settles", () => {
  assert.equal(matchesDiscoveryTerms({...event.CreatedEvent.createArgument,rate:"0.0520000000",reservedCashCid:"cash"},market,borrower,dealer,terms),true);
  assert.equal(matchesDiscoveryTerms({...event.CreatedEvent.createArgument,repurchasePrice:"1004.3333333333",pledgedCids:["holding"]},market,borrower,dealer,terms),true);
  assert.equal(matchesDiscoveryTerms({...event.CreatedEvent.createArgument,dealer:"other::party"},market,borrower,dealer,terms),false);
});
test("consent and unresolved command guard prevent a second financial submission", async () => {
  let submitted=0;
  const session={kind:"account",party:borrower,submit:async()=>{submitted++;return receipt.updateId;},lastReceipt:()=>receipt} as unknown as Session;
  await assert.rejects(()=>createDiscoveryRequest(session,market,dealer,terms,false),/Approve disclosure/);
  await assert.rejects(()=>createDiscoveryRequest({...session,pendingCommand:()=>({commandId:"pending",party:borrower,beginExclusive:100,synchronizerId:market.synchronizerId})},market,dealer,terms,true),/original pending/);
  assert.equal(submitted,0);
  assert.deepEqual(await createDiscoveryRequest(session,market,dealer,terms,true),{updateId:"real-update",contractId:"request-cid"});
  assert.equal(submitted,1);
});
test("committed request without its matching proof is never returned as approved", async () => {
  const session={kind:"account",party:borrower,submit:async()=>"real-update",lastReceipt:()=>({...receipt,events:[]})} as unknown as Session;
  await assert.rejects(()=>createDiscoveryRequest(session,market,dealer,terms,true),/may have committed/);
});
