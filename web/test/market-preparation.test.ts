import test from "node:test";
import assert from "node:assert/strict";
import { canPrepareReference, preparedReference } from "../src/app/market-preparation.ts";
import { defaultDeployment, type Deployment } from "../src/ledger/deployment.ts";
import type { Session } from "../src/ledger/session.ts";
import type { DeskState, PriceFeed } from "../src/ledger/symbolon.ts";

const operator = "operator::a", party = "borrower::b";
const profile: Deployment = {...defaultDeployment,publicDesk:{operator,contractId:"desk",createdEventBlob:"blob",label:"Desk",referencePrice:"60000",rate:"0.052",maxPrincipal:"10000"}};
const session: Session = {kind:"account",party,networkId:"devnet",label:"Account",read:async()=>[],submit:async()=>"update",disconnect:async()=>{}};
const expired: PriceFeed = {oracle:operator,instrumentIssuer:operator,instrument:"cBTC-demo",cashIssuer:operator,cashInstrument:"USDCx-demo",price:"60000",asOf:new Date(Date.now()-7200_000).toISOString(),readers:[party]};

test("automatic preparation is confined to the caller's exact public DevNet reference", () => {
  assert.equal(canPrepareReference(session,expired,profile),true);
  for (const changed of [{...expired,oracle:"committee::a"},{...expired,instrumentIssuer:"issuer::other"},{...expired,cashIssuer:"cash::other"},{...expired,readers:[]},{...expired,asOf:new Date(Date.now()+60_000).toISOString()}]) {
    assert.equal(canPrepareReference(session,changed,profile),false);
  }
  assert.equal(canPrepareReference(session,expired,{...profile,network:"mainnet"}),false);
  assert.equal(canPrepareReference(session,expired,{...profile,network:"localnet"}),false);
  assert.equal(canPrepareReference({...session,kind:"browse"},expired,profile),false);
  assert.equal(canPrepareReference({...session,party:operator},expired,profile),false);
});

test("review preparation requires a fresh confirmed replacement with the same complete market identity", () => {
  const current = {...expired,asOf:new Date().toISOString()};
  const make = (contractId:string,payload:PriceFeed) => ({contractId,payload,templateId:"feed"});
  const state: DeskState = {holdings:[],requests:[],quotes:[],positions:[],proposals:[],closed:[],feeds:[make("expired",expired),make("foreign",{...current,cashIssuer:"cash::other"}),make("future",{...current,asOf:new Date(Date.now()+60_000).toISOString()})]};
  assert.equal(preparedReference(state,expired,3600),undefined);
  state.feeds.push(make("confirmed",current));
  assert.equal(preparedReference(state,expired,3600)?.contractId,"confirmed");
});
