import test from "node:test";
import assert from "node:assert/strict";
import profile from "../public/deployment.json";
import { loadDeployment } from "../src/ledger/deployment";
import { createOpenRequest, sendOpenQuote, acceptOpenRfqQuote, OpenRfqProofError } from "../src/app/open-rfq-actions";
import type { Session } from "../src/ledger/session";
import type { CommittedReceipt } from "../src/ledger/canton-v2";
import type { Contract, Command } from "../src/ledger/api";
import type { RepoQuote } from "../src/ledger/symbolon";
import type { DiscoveryTerms, OwnedOpenRequest } from "../src/ledger/open-rfq-model";

test.before(async()=>{const previous=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify(profile));try{await loadDeployment();}finally{globalThis.fetch=previous;}});
const borrower="alice::party",dealer="bob::party",issuer=profile.publicDesk.operator;
const template=`${profile.openRfqPackageId}:Symbolon.OpenRequest:OpenRequest`;
const coreQuote=`${profile.corePackageId}:Symbolon.Repo:RepoQuote`;
const terms:DiscoveryTerms={oracle:issuer,collateralIssuer:issuer,collateralInstrument:"cBTC-demo",collateralAmount:"0.0250000000",cashIssuer:issuer,cashInstrument:"USDCx-demo",cashAmount:"1000.0000000000",termDays:30,marginThresholdPct:"1.0500000000",cureSeconds:3600,maxPriceAgeSeconds:3600};
const market={network:"devnet" as const,synchronizerId:profile.synchronizerId,corePackageId:profile.corePackageId,oracle:issuer,collateralIssuer:issuer,collateralInstrument:"cBTC-demo",cashIssuer:issuer,cashInstrument:"USDCx-demo"};
const request:OwnedOpenRequest={id:"a1e10165-6b77-4e6c-8edf-20a1a1bec2e8",market,borrower,terms,status:"open",createdAt:"2026-10-10T00:00:00Z",publishUpdateId:"pub",disclosure:{templateId:template,contractId:"open-request",createdEventBlob:"YWJj",synchronizerId:profile.synchronizerId},quotes:[{requestId:"a1e10165-6b77-4e6c-8edf-20a1a1bec2e8",dealer,rate:"0.07",validUntil:"2026-11-10T00:00:00Z",quoteContractId:"selected",updateId:"quote1",createdAt:"2026-10-10T00:00:00Z"},{requestId:"a1e10165-6b77-4e6c-8edf-20a1a1bec2e8",dealer:"casey::party",rate:"0.075",validUntil:"2026-11-10T00:00:00Z",quoteContractId:"alternative",updateId:"quote2",createdAt:"2026-10-10T00:00:00Z"}]};
const receipt=(events:unknown[]):CommittedReceipt=>({commandId:"command",updateId:"committed",offset:100,synchronizerId:profile.synchronizerId,effectiveAt:"2026-10-10T00:00:00Z",recordTime:"2026-10-10T00:00:00Z",events});
const payload={...terms,borrower,dealer,termDays:"30",cureSeconds:"3600",maxPriceAgeSeconds:"3600",rate:"0.0700000000",repurchasePrice:"1005.8333333333",reservedCashCid:"reserved",validUntil:"2026-11-10T00:00:00Z"};
const quote:Contract<RepoQuote>={contractId:"selected",templateId:coreQuote,payload};
const holding=(owner:string,instrument:string,amount:string)=>({contractId:"exact",templateId:`${profile.corePackageId}:Symbolon.DemoAsset:Holding`,payload:{issuer,owner,instrument,amount,viewers:[],lockParties:[]}});

test("publication creates only one borrower-signed OpenRequest and carries its exact immutable terms",async()=>{
  let commands:Command[]=[];
  const s={kind:"account",party:borrower,submit:async(value:Command[])=>{commands=value;return "committed";},lastReceipt:()=>receipt([{CreatedEvent:{contractId:"open-request",templateId:template,createArgument:{...terms,borrower,termDays:"30",cureSeconds:"3600",maxPriceAgeSeconds:"3600"}}}])} as unknown as Session;
  assert.deepEqual(await createOpenRequest(s,terms),{updateId:"committed",contractId:"open-request"});
  assert.equal(commands.length,1);assert.equal((commands[0] as any).CreateCommand.createArguments.borrower,borrower);
  assert.equal((commands[0] as any).CreateCommand.createArguments.collateralAmount,"0.0250000000");
});
test("funded quote preserves exact annual rate and consumes only the lender's matching available cash",async()=>{
  let posted:any;
  const s={kind:"account",party:dealer,read:async()=>[holding(dealer,"USDCx-demo","1000.0000000000")],submit:async(commands:Command[],options:unknown)=>{posted={commands,options};return "committed";},lastReceipt:()=>receipt([{CreatedEvent:{contractId:"selected",templateId:coreQuote,createArgument:payload}}])} as unknown as Session;
  assert.deepEqual(await sendOpenQuote(s,request,"0.0700000000",3600),{updateId:"committed",quoteContractId:"selected"});
  assert.equal(posted.commands[0].ExerciseCommand.choice,"SubmitOpenQuote");
  assert.equal(posted.commands[0].ExerciseCommand.choiceArgument.rate,"0.0700000000");
  assert.equal(posted.commands[0].ExerciseCommand.choiceArgument.cashCid,"exact");
  assert.deepEqual(posted.options.disclosedContracts,[request.disclosure]);
});
test("committed proof parsing failure carries original receipt identifiers for recovery",async()=>{
  const s={kind:"account",party:borrower,submit:async()=>"committed",lastReceipt:()=>receipt([])} as unknown as Session;
  await assert.rejects(()=>createOpenRequest(s,terms),error=>error instanceof OpenRfqProofError&&error.kind==="publish"&&error.updateId==="committed"&&error.contractId===undefined);
});
test("acceptance closes only the linked open request and declines known active alternatives atomically",async()=>{
  let posted:any;
  const s={kind:"account",party:borrower,read:async()=>[holding(borrower,"cBTC-demo","0.0250000000"),quote,{...quote,contractId:"alternative",payload:{...payload,dealer:"casey::party"}},{...quote,contractId:"unrelated"},{contractId:"open-request",templateId:template,payload:{borrower,...terms}}],submit:async(commands:Command[])=>{posted=commands;return "settled";}} as unknown as Session;
  assert.equal(await acceptOpenRfqQuote(s,quote,"feed",request),"settled");
  assert.deepEqual(posted.map((command:any)=>[command.ExerciseCommand.choice,command.ExerciseCommand.contractId]),[["AcceptQuote","selected"],["WithdrawOpenRequest","open-request"],["RejectQuote","alternative"]]);
});
