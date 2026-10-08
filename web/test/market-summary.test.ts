import test from "node:test";
import assert from "node:assert/strict";
import { marketSummary, publicMarket } from "../src/app/market-summary.ts";
import type { Deployment } from "../src/ledger/deployment.ts";
import type { DeskState, PriceFeed, RepoQuote, RepoPosition } from "../src/ledger/symbolon.ts";

const d:Deployment = {schemaVersion:1,network:"devnet",walletNetwork:"devnet",participant:null,synchronizerId:null,corePackageId:null,tradingEnabled:false,releaseEvidence:null,
  publicDesk:{operator:"issuer",contractId:"public",createdEventBlob:"blob",label:"Public lender",referencePrice:"60000",rate:"0.052",maxPrincipal:"10000"},
  assets:{collateral:{admin:"issuer",symbol:"cBTC-demo",adapter:"demo-holding",packageIds:[]},cash:{admin:"issuer",symbol:"USDCx-demo",adapter:"demo-holding",packageIds:[]}}};
const feed:PriceFeed = {oracle:"issuer",instrumentIssuer:"issuer",instrument:"cBTC-demo",cashIssuer:"issuer",cashInstrument:"USDCx-demo",price:"60000",asOf:"",readers:[]};
const empty:DeskState = {holdings:[],feeds:[],requests:[],quotes:[],positions:[],proposals:[],closed:[]};
const now=Date.parse("2026-10-08T00:00:00Z");
const quote:RepoQuote = {borrower:"alice",dealer:"lender",oracle:"issuer",collateralIssuer:"issuer",collateralInstrument:"cBTC-demo",collateralAmount:"0.0025",cashIssuer:"issuer",cashInstrument:"USDCx-demo",cashAmount:"100",termDays:"7",marginThresholdPct:"1.05",cureSeconds:"3600",maxPriceAgeSeconds:"3600",rate:"0.052",cashCid:"reserved",validUntil:"2026-10-08T01:00:00Z"};
const contract = <T>(id:string,payload:T) => ({contractId:id,templateId:"test",payload});

test("published reference APR is limited to the exact public DevNet market identity",()=>{
  const result=marketSummary(feed,null,"","borrow",d,now);
  assert.equal(result.minRate,0.052);assert.equal(result.source,"Reference");
  assert.equal(result.openPrincipal,null);assert.deepEqual(result.terms,[]);
  for(const changes of [{oracle:"other"},{instrumentIssuer:"other"},{cashIssuer:"other"},{instrument:"cBTC-real"},{cashInstrument:"USD-other"}]) {
    assert.equal(publicMarket({...feed,...changes},d),false);
    assert.equal(marketSummary({...feed,...changes},null,"","borrow",d,now).minRate,null);
  }
  assert.equal(publicMarket(feed,{...d,network:"mainnet"}),false);
});

test("market rates, terms and open principal exclude expired, foreign-party and wrong-identity contracts",()=>{
  const state:DeskState={...empty,quotes:[contract("a",quote),contract("b",{...quote,rate:"0.058",termDays:"30"}),
    contract("expired",{...quote,rate:"0.9",validUntil:"2026-10-08T00:00:00Z"}),contract("foreign",{...quote,borrower:"bob",rate:"0.7"}),
    contract("fake-issuer",{...quote,collateralIssuer:"attacker",rate:"0.8"})],
    positions:[contract("own",{...quote,cashAmount:"100"} as RepoPosition),contract("foreign",{...quote,borrower:"bob",cashAmount:"9000"} as RepoPosition),contract("wrong-cash",{...quote,cashIssuer:"attacker",cashAmount:"500"} as RepoPosition)]};
  const own=marketSummary(feed,state,"alice","borrow",d,now);
  assert.equal(own.minRate,0.052);assert.equal(own.maxRate,0.058);assert.equal(own.source,"Your offers");
  assert.deepEqual(own.terms,[7,30]);assert.equal(own.openPrincipal,100);
  const lender=marketSummary(feed,state,"unrelated-lender","lend",{...d,publicDesk:null},now);
  assert.equal(lender.minRate,null);assert.equal(lender.openPrincipal,0);assert.deepEqual(lender.terms,[]);
});
