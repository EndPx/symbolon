import test from "node:test";
import assert from "node:assert/strict";
import profile from "../public/deployment.json";
import { retainOpenRfqIntent, recoverOpenRfqIntent, clearOpenRfqIntent, type OpenRfqIntentDraft } from "../src/app/open-rfq-intents";
import type { Session } from "../src/ledger/session";
import type { CommittedReceipt } from "../src/ledger/canton-v2";

const party="lender::test",borrower="borrower::test",issuer=profile.publicDesk.operator;
const market={network:"devnet" as const,synchronizerId:profile.synchronizerId,corePackageId:profile.corePackageId,oracle:issuer,collateralIssuer:issuer,collateralInstrument:"cBTC-demo",cashIssuer:issuer,cashInstrument:"USDCx-demo"};
const terms={oracle:issuer,collateralIssuer:issuer,collateralInstrument:"cBTC-demo",collateralAmount:"0.0250000000",cashIssuer:issuer,cashInstrument:"USDCx-demo",cashAmount:"1000.0000000000",termDays:30,marginThresholdPct:"1.0500000000",cureSeconds:3600,maxPriceAgeSeconds:3600};
const template=`${profile.openRfqPackageId}:Symbolon.OpenRequest:OpenRequest`;
const session=(name=party)=>({kind:"account",party:name,pendingCommand:()=>({commandId:"original-final-command",party:name,beginExclusive:50,synchronizerId:market.synchronizerId})} as unknown as Session);
const receipt=(events:unknown[]):CommittedReceipt=>({commandId:"original-final-command",updateId:"actual-committed-update",offset:60,synchronizerId:market.synchronizerId,effectiveAt:"2026-10-10T00:00:00Z",recordTime:"2026-10-10T00:00:00Z",events});
const quoteIntent:OpenRfqIntentDraft={kind:"quote",scopeKey:"request-id",market,openTemplate:template,terms,borrower,requestContractId:"request-cid",rate:"0.0700000000"};

test("confirmed reconciliation restores the original funded quote proof once without submitting another command",()=>{
  const s=session(),saved:unknown[]=[];
  retainOpenRfqIntent(s,quoteIntent);
  const tx=receipt([{ExercisedEvent:{templateId:template,contractId:"request-cid",choice:"SubmitOpenQuote"}},{CreatedEvent:{templateId:`${market.corePackageId}:Symbolon.Repo:RepoQuote`,contractId:"original-funded-cid",createArgument:{...terms,borrower,dealer:party,rate:"0.07",termDays:"30",cureSeconds:"3600",maxPriceAgeSeconds:"3600"}}}]);
  assert.equal(recoverOpenRfqIntent(s,tx,(...args)=>saved.push(args)),true);
  assert.deepEqual(saved,[["quote",party,"request-id",{updateId:"actual-committed-update",quoteContractId:"original-funded-cid"}]]);
  assert.equal(recoverOpenRfqIntent(s,tx,()=>assert.fail("Already recovered intent reused")),false);
});
test("another command, party or synchronizer cannot turn a holding preparation receipt into RFQ proof",()=>{
  const s=session();retainOpenRfqIntent(s,quoteIntent);
  assert.equal(recoverOpenRfqIntent(s,{...receipt([]),commandId:"holding-split"},()=>assert.fail()),false);
  assert.equal(recoverOpenRfqIntent(session("other::test"),receipt([]),()=>assert.fail()),false);
  assert.equal(recoverOpenRfqIntent(s,{...receipt([]),synchronizerId:"wrong::domain"},()=>assert.fail()),false);
  clearOpenRfqIntent(s);
});
test("publication and withdrawal recover only their bound original operation identifiers",()=>{
  const s=session(borrower);const pub:OpenRfqIntentDraft={kind:"publish",scopeKey:"selected-market",market,openTemplate:template,terms};
  retainOpenRfqIntent(s,pub);let proof:any;
  assert.equal(recoverOpenRfqIntent(s,receipt([{CreatedEvent:{templateId:template,contractId:"published-cid",createArgument:{...terms,borrower}}}]),(_kind,_party,_key,value)=>{proof=value;}),true);
  assert.equal(proof.contractId,"published-cid");
  retainOpenRfqIntent(s,{kind:"close",scopeKey:"request-id",market,openTemplate:template,requestContractId:"published-cid"});
  assert.equal(recoverOpenRfqIntent(s,receipt([{ExercisedEvent:{templateId:template,contractId:"different-cid",choice:"WithdrawOpenRequest",consuming:true}}]),()=>assert.fail()),false);
  assert.equal(recoverOpenRfqIntent(s,receipt([{ExercisedEvent:{templateId:template,contractId:"published-cid",choice:"WithdrawOpenRequest",consuming:true}}]),(_kind,_party,_key,value)=>{proof=value;}),true);
  assert.deepEqual(proof,{updateId:"actual-committed-update"});
});
test("a known committed but locally unparsed quote stores only its real update and keeps funding locked to recovery",()=>{
  const s=session();retainOpenRfqIntent(s,quoteIntent);let proof:any;
  assert.equal(recoverOpenRfqIntent(s,receipt([]),(_kind,_party,_key,value)=>{proof=value;}),true);
  assert.deepEqual(proof,{updateId:"actual-committed-update"});
  assert.equal(proof.quoteContractId,undefined);
});
