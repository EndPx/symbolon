import test from "node:test";
import assert from "node:assert/strict";
import { checkedCallback, pkceChallenge, accessClaims, ACCOUNT_ISSUER } from "../src/ledger/account.ts";
import { CantonV2Client, LedgerHttpError, SubmissionUncertain, checkedReceipt } from "../src/ledger/canton-v2.ts";
import { create, type Contract } from "../src/ledger/api.ts";

const core = "a".repeat(64), sync = "global-domain::test", party = "alice::party";
const attempt = { state:"nonce",verifier:"verifier",redirectUri:"https://symbolon.endpx.cloud/app",startedAt:100,returnHash:"" };
test("PKCE uses the RFC 7636 challenge and rejects stale, foreign-origin and mismatched callbacks", async () => {
  assert.equal(await pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  const params = new URLSearchParams({code:"one-use-code",state:"nonce"});
  assert.equal(checkedCallback(params,attempt,"https://symbolon.endpx.cloud",200).code,"one-use-code");
  assert.throws(()=>checkedCallback(params,attempt,"https://attacker.example",200));
  assert.throws(()=>checkedCallback(params,attempt,"https://symbolon.endpx.cloud",600101));
  assert.throws(()=>checkedCallback(new URLSearchParams({code:"code",state:"wrong"}),attempt,"https://symbolon.endpx.cloud",200));
});
test("a token from another issuer or an ID token cannot become a ledger connection", () => {
  const token = (payload:object) => `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
  assert.throws(()=>accessClaims(token({iss:"https://attacker.example",sub:"user",exp:99})));
  assert.throws(()=>accessClaims(token({iss:ACCOUNT_ISSUER,sub:"user",exp:99,typ:"ID"})));
});
const receipt = (commandId:string) => ({transaction:{commandId,updateId:"ledger-update",offset:123,synchronizerId:sync,
  effectiveAt:"2026-10-07T12:00:00Z",recordTime:"2026-10-07T12:00:01Z",events:[{CreatedEvent:{contractId:"created-cid"}}]}});
test("wallet hashes or a receipt for another command/synchronizer are not confirmations", () => {
  assert.throws(()=>checkedReceipt({transactionHash:"synthetic-hash"},"expected",sync));
  assert.throws(()=>checkedReceipt(receipt("another-command"),"expected",sync));
  assert.throws(()=>checkedReceipt(receipt("expected"),"expected","different-sync"));
});
test("Canton v3.5 reads use eventFormat and include only the authenticated party", async () => {
  let query:unknown;
  const client = new CantonV2Client({party,corePackageId:core,synchronizerId:sync,request:async(_method,path,body)=>{
    if(path.endsWith("ledger-end"))return {offset:122};
    query=body;
    return [{contractEntry:{JsActiveContract:{synchronizerId:sync,createdEvent:{contractId:"cid",templateId:`${core}:Symbolon.Repo:QuoteRequest`,createArgument:{borrower:party}}}}}];
  }});
  const contracts:Contract[] = await client.read();
  const body = query as {eventFormat:{filtersByParty:object};activeAtOffset:number;filter?:unknown};
  assert.deepEqual(Object.keys(body.eventFormat.filtersByParty),[party]);
  assert.equal(body.activeAtOffset,122); assert.equal(body.filter,undefined);
  assert.equal(contracts[0].payload.borrower,party);
});
test("public submission pins packages, scopes authority and waits for a correlated receipt", async () => {
  let posted:any;
  const client = new CantonV2Client({party,corePackageId:core,synchronizerId:sync,request:async(_method,path,body)=>{
    if(path.endsWith("ledger-end"))return {offset:122};
    posted=body;
    return receipt(posted.commands.commandId);
  }});
  assert.equal(await client.submit([create("#symbolon-v2:Symbolon.Repo:QuoteRequest",{borrower:party})]),"ledger-update");
  assert.deepEqual(posted.commands.actAs,[party]); assert.deepEqual(posted.commands.readAs,[party]);
  assert.equal("userId" in posted.commands,false);
  assert.equal(posted.commands.commands[0].CreateCommand.templateId,`${core}:Symbolon.Repo:QuoteRequest`);
  await assert.rejects(client.submit([create("foreign:Module:Template",{})]),/pinned/);
});
test("ambiguous submission survives reload and blocks another command until its original completion is verified", async () => {
  const saved = new Map<string,string>();
  const store={getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>{saved.set(key,value);},removeItem:(key:string)=>{saved.delete(key);}};
  let commandId="",postCount=0;
  const first = new CantonV2Client({party,corePackageId:core,synchronizerId:sync,store,request:async(_method,path,body:any)=>{
    if(path.endsWith("ledger-end"))return {offset:122};
    postCount++; commandId=body.commands.commandId; throw new Error("socket disconnected after submission");
  }});
  await assert.rejects(first.submit([create("#symbolon-v2:Symbolon.Repo:QuoteRequest",{})]),SubmissionUncertain);
  const restored=new CantonV2Client({party,corePackageId:core,synchronizerId:sync,store,request:async(_method,path)=>{
    if(path.includes("completions"))return [{completionResponse:{Completion:{value:{commandId,actAs:[party],updateId:"ledger-update"}}}}];
    if(path.includes("transaction-by-id"))return receipt(commandId);
    throw new Error("unexpected request");
  }});
  await assert.rejects(restored.submit([create("#symbolon-v2:Symbolon.Repo:QuoteRequest",{})]),SubmissionUncertain);
  assert.equal(postCount,1);
  assert.equal((await restored.reconcile()).status,"committed"); assert.equal(saved.size,0);
});
test("a definite rejection releases the submission guard without claiming a commit", async () => {
  const client=new CantonV2Client({party,corePackageId:core,synchronizerId:sync,request:async(_method,path)=>{
    if(path.endsWith("ledger-end"))return {offset:122};
    throw new LedgerHttpError("Daml rejected the command",400,true);
  }});
  await assert.rejects(client.submit([create("#symbolon-v2:Symbolon.Repo:QuoteRequest",{})]),/rejected/);
  assert.equal(client.pendingCommand(),null); assert.equal(client.lastReceipt,null);
});

test("an executed wallet update survives a failed receipt lookup and is reconciled without resubmission", async () => {
  const saved=new Map<string,string>();
  const store={getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>{saved.set(key,value);},removeItem:(key:string)=>{saved.delete(key);}};
  let commandId="",signatures=0;
  const first=new CantonV2Client({party,corePackageId:core,synchronizerId:sync,store,request:async(_method,path)=>{
    if(path.endsWith("ledger-end"))return {offset:122};
    throw new LedgerHttpError("Receipt is not visible yet",404,true);
  }});
  await assert.rejects(first.submit([create("#symbolon-v2:Symbolon.Repo:QuoteRequest",{})],{},async payload=>{
    commandId=payload.commandId;signatures++;
    return {tx:{commandId,status:"executed",payload:{updateId:"ledger-update",completionOffset:123}}};
  }),SubmissionUncertain);
  assert.equal(first.pendingCommand()?.updateId,"ledger-update");
  const restored=new CantonV2Client({party,corePackageId:core,synchronizerId:sync,store,request:async(_method,path,body:any)=>{
    assert.ok(path.includes("transaction-by-id"),"Reconciliation must use the known update, not the completion stream");
    assert.equal(body.updateId,"ledger-update");
    return receipt(commandId);
  }});
  await assert.rejects(restored.submit([create("#symbolon-v2:Symbolon.Repo:QuoteRequest",{})]),SubmissionUncertain);
  assert.equal((await restored.reconcile()).status,"committed");
  assert.equal(signatures,1);assert.equal(saved.size,0);
});
