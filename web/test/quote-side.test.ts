import test from "node:test";
import assert from "node:assert/strict";
import { partyQuotes, partyRequests } from "../src/app/terminal-state.ts";
import type { QuoteRequest, RepoQuote } from "../src/ledger/symbolon.ts";

test("a party's received and sent quotes cannot mix its displayed APR or offer count",()=>{
  const quote=(id:string,borrower:string,dealer:string,rate:string)=>({contractId:id,templateId:"quote",payload:{borrower,dealer,rate} as RepoQuote});
  const book=[quote("received","alice","other","0.04"),quote("sent","bob","alice","0.08"),quote("foreign","bob","other","0.01")];
  assert.deepEqual(partyQuotes(book,"alice","borrow").map(q=>[q.contractId,q.payload.rate]),[["received","0.04"]]);
  assert.deepEqual(partyQuotes(book,"alice","lend").map(q=>[q.contractId,q.payload.rate]),[["sent","0.08"]]);
  assert.equal(partyQuotes(book,"unknown","borrow").length,0);
});

test("request guidance separates a dual-role party's outgoing requests from incoming requests",()=>{
  const request=(id:string,borrower:string,dealer:string)=>({contractId:id,templateId:"request",payload:{borrower,dealer} as QuoteRequest});
  const requests=[request("outgoing","alice","other"),request("incoming","bob","alice"),request("foreign","bob","other")];
  assert.deepEqual(partyRequests(requests,"alice","borrow").map(r=>r.contractId),["outgoing"]);
  assert.deepEqual(partyRequests(requests,"alice","lend").map(r=>r.contractId),["incoming"]);
  assert.equal(partyRequests(requests,"unknown","lend").length,0);
});
