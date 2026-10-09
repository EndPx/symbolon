import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OpenRequests, OpenQuoteDialog, PendingOpenQuoteSync, availableOpenCash, openRate, saveOpenRfqProof, readOpenRfqProof, deleteOpenRfqProof,
  pendingOpenRfqProofs, subscribeOpenRfqProof, openRfqProofRevision, syncRetainedOpenQuote, type OpenRfqState } from "../src/app/OpenRequests.tsx";
import type { Session } from "../src/ledger/session.ts";
import type { DeskState } from "../src/ledger/symbolon.ts";
import type { OpenRfqRequest } from "../src/ledger/open-rfq.ts";
import type { LenderMarket } from "../src/ledger/lender-directory-model.ts";

const market: LenderMarket = {network: "devnet", synchronizerId: "domain::test", corePackageId: "a".repeat(64), oracle: "issuer::party",
  collateralIssuer: "issuer::party", collateralInstrument: "cBTC-demo", cashIssuer: "issuer::party", cashInstrument: "USDCx-demo"};
const request: OpenRfqRequest = {id: "a1e10165-6b77-4e6c-8edf-20a1a1bec2e8", market, status: "open", createdAt: "2026-10-10T00:00:00Z", borrower: "borrower::party",
  terms: {oracle: market.oracle, collateralIssuer: market.collateralIssuer, collateralInstrument: market.collateralInstrument, collateralAmount: "0.0250000000",
    cashIssuer: market.cashIssuer, cashInstrument: market.cashInstrument, cashAmount: "1000.0000000000", termDays: 30, marginThresholdPct: "1.0500000000", cureSeconds: 3600, maxPriceAgeSeconds: 3600},
  disclosure: {templateId: `${"b".repeat(64)}:Symbolon.OpenRequest:OpenRequest`, contractId: "private-request-contract", createdEventBlob: "cHJpdmF0ZQ==", synchronizerId: market.synchronizerId}, publishUpdateId: "creation-receipt"};
const session = (party = "lender::party") => ({kind: "account", party, label: party, read: async () => [], submit: async () => {throw new Error("No network submission allowed in rendering tests.");}, disconnect: async () => {}} as Session);
const state: DeskState = {holdings: [
  {contractId: "cash-1", templateId: "holding", payload: {issuer: "issuer::party", owner: "lender::party", instrument: "USDCx-demo", amount: "600.0000000000", viewers: [], lockParties: []}},
  {contractId: "cash-2", templateId: "holding", payload: {issuer: "issuer::party", owner: "lender::party", instrument: "USDCx-demo", amount: "400.0000000001", viewers: [], lockParties: []}},
  {contractId: "locked-cash", templateId: "holding", payload: {issuer: "issuer::party", owner: "lender::party", instrument: "USDCx-demo", amount: "100000.0000000000", viewers: [], lockParties: ["borrower::party"]}},
  {contractId: "other-issuer", templateId: "holding", payload: {issuer: "other::party", owner: "lender::party", instrument: "USDCx-demo", amount: "100000.0000000000", viewers: [], lockParties: []}},
], feeds: [], requests: [], quotes: [], positions: [], proposals: [], closed: []};
const book = (overrides: Partial<OpenRfqState> = {}): OpenRfqState => ({market, board: [request], publicRequests: [], own: {requests: [], quotes: []}, loading: false, error: null, ownError: null, refresh() {}, ...overrides});
const run = async () => {throw new Error("Rendering must not fabricate a ledger receipt.");};

test("direct pricing board exposes request terms without exposing competitor quote metadata", () => {
  const html = renderToStaticMarkup(createElement(OpenRequests, {session: session(), state, openRfq: book(), side: "lend", busy: false, run, connect() {}}));
  assert.match(html, /Open requests &amp; your offers/);
  assert.match(html, /1,000\.00 USDCx-demo/);
  assert.match(html, /0\.0250 cBTC-demo/);
  assert.match(html, /30 days/);
  assert.match(html, /Quote request/);
  assert.doesNotMatch(html, /Review access|Request detail access|Your lender name|private-request-contract|cHJpdmF0ZQ==|creation-receipt/);
  assert.doesNotMatch(html, /Confirmed|Funded offer sent/);
});

test("closed owned requests appear only inside a collapsed Archive and shared offers remain in the same sheet", () => {
  const closed = {...request, id: "b2e10165-6b77-4e6c-8edf-20a1a1bec2e8", status: "closed" as const, closedUpdateId: "closed", closedAt: "2026-10-10T01:00:00Z", quotes: []};
  const html = renderToStaticMarkup(createElement(OpenRequests, {session: session(request.borrower), state, openRfq: book({own: {requests: [closed], quotes: []}}), side: "borrow", busy: false, run, connect() {}, children: createElement("p", null, "Private offer cards here")}));
  assert.match(html, /No open requests/);
  const archive = html.indexOf('<details class="open-rfq-archive">');
  assert.ok(archive > html.indexOf("Private offer cards here"));
  assert.ok(html.indexOf("Your request · b2e10165") > archive);
  assert.doesNotMatch(html, /open-rfq-archive" open/);
  assert.doesNotMatch(html, /Close request/);
});

test("cash eligibility uses exact fragments for the lender and agreed issuer while APR conversion remains precise", () => {
  assert.equal(availableOpenCash(state, "lender::party", request), "1000.0000000001");
  assert.equal(availableOpenCash(state, "outsider::party", request), "0.0000000000");
  assert.equal(openRate("5.20"), "0.0520000000");
  assert.equal(openRate("0.00000001"), "0.0000000001");
  assert.equal(openRate("100.01"), null);
  assert.equal(openRate("-1"), null);
});

test("direct quote has one unchecked cash reservation consent and cannot send before consent", () => {
  const html = renderToStaticMarkup(createElement(OpenQuoteDialog, {request, session: session(), state, busy: false, run, close() {}, synced() {}}));
  assert.match(html, /Fixed APR \(%\)/);
  assert.doesNotMatch(html, /APY|Review access|name="lender/);
  assert.match(html, /1,004\.3333333333/);
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /type="checkbox" checked/);
  assert.match(html, /type="submit" class="seal" disabled=""/);
});

test("a retained funded quote proof offers sync only and never presents a second reservation form", () => {
  saveOpenRfqProof("quote", "lender::party", request.id, {updateId: "original-real-update", quoteContractId: "original-quote"});
  try {
    const html = renderToStaticMarkup(createElement(OpenQuoteDialog, {request, session: session(), state, busy: false, run, close() {}, synced() {}}));
    assert.match(html, /Retry quote sync/);
    assert.match(html, /does not reserve cash again/);
    assert.doesNotMatch(html, /type="checkbox"|Reserve cash and send quote|open-rfq-quote-form/);
  } finally {deleteOpenRfqProof("quote", "lender::party", request.id);}
});

test("a confirmed update with a missing quote contract ID locks funding and requires original contract recovery", () => {
  saveOpenRfqProof("quote", "lender::party", request.id, {updateId: "confirmed-original-update-with-incomplete-proof"});
  try {
    const html = renderToStaticMarkup(createElement(OpenQuoteDialog, {request, session: session(), state, busy: false, run, close() {}, synced() {}}));
    assert.match(html, /Original RepoQuote contract ID/);
    assert.match(html, /confirmed-original-update-with-incomplete-proof/);
    assert.match(html, /open=""/);
    assert.match(html, /class="seal" disabled="">Retry quote sync/);
    assert.doesNotMatch(html, /Reserve cash and send quote|open-rfq-quote-form|type="checkbox"/);
  } finally {deleteOpenRfqProof("quote", "lender::party", request.id);}
});

test("pending quote sync stays visible when the closed request disappears from the board", () => {
  saveOpenRfqProof("quote", "lender::party", request.id, {updateId: "confirmed-closed-request-quote", quoteContractId: "existing-funded-quote"});
  try {
    const html = renderToStaticMarkup(createElement(OpenRequests, {session: session(), state, openRfq: book({board: []}), side: "lend", busy: false, run, connect() {}}));
    assert.match(html, /Pending quote receipt sync/);
    assert.match(html, /Sync existing quote/);
    assert.doesNotMatch(html, /Quote request|Reserve cash and send quote|Fixed APR \(%\)/);
    const dialog = renderToStaticMarkup(createElement(PendingOpenQuoteSync, {market, session: session(), requestId: request.id, busy: false, close() {}, synced() {}}));
    assert.match(dialog, /including if its request is already closed/);
    assert.doesNotMatch(dialog, /type="checkbox"|Fixed APR \(%\)|Reserve cash and send quote/);
  } finally {deleteOpenRfqProof("quote", "lender::party", request.id);}
});

test("retained quote sync records only original IDs, then deletes the proof without requesting context or funding", async () => {
  const proof = {updateId: "confirmed-original-quote", quoteContractId: "existing-quote-contract"};
  saveOpenRfqProof("quote", "lender::party", request.id, proof);
  const calls: unknown[] = [];
  await syncRetainedOpenQuote(market, "lender::party", request.id, async (...args) => {calls.push(args);});
  assert.deepEqual(calls, [[market, "lender::party", request.id, proof]]);
  assert.equal(readOpenRfqProof("quote", "lender::party", request.id), null);
});

test("failed or incomplete record-only sync retains the proof and incomplete IDs never call the API", async () => {
  saveOpenRfqProof("quote", "lender::party", request.id, {updateId: "confirmed-incomplete-quote"});
  let calls = 0;
  try {
    await assert.rejects(syncRetainedOpenQuote(market, "lender::party", request.id, async () => {calls++;}), /original RepoQuote contract ID/);
    assert.equal(calls, 0);
    saveOpenRfqProof("quote", "lender::party", request.id, {updateId: "confirmed-complete-quote", quoteContractId: "existing-quote"});
    await assert.rejects(syncRetainedOpenQuote(market, "lender::party", request.id, async () => {throw new Error("index offline");}), /index offline/);
    assert.equal(readOpenRfqProof<{updateId: string}>("quote", "lender::party", request.id)?.updateId, "confirmed-complete-quote");
  } finally {deleteOpenRfqProof("quote", "lender::party", request.id);}
});

test("proof updates notify subscribers for reconciliation and pending quote IDs stay party and operation scoped", () => {
  const otherId = "c3e10165-6b77-4e6c-8edf-20a1a1bec2e8", before = openRfqProofRevision();
  let notifications = 0;
  const unsubscribe = subscribeOpenRfqProof(() => {notifications++;});
  try {
    saveOpenRfqProof("quote", "lender::party", request.id, {updateId: "current-party-update"});
    saveOpenRfqProof("quote", "outsider::party", otherId, {updateId: "other-party-update"});
    saveOpenRfqProof("publish", "lender::party", "scope", {updateId: "publication-update"});
    assert.equal(notifications, 3);
    assert.equal(openRfqProofRevision(), before + 3);
    assert.deepEqual(pendingOpenRfqProofs("quote", "lender::party").map(value => value.id), [request.id]);
    deleteOpenRfqProof("quote", "lender::party", request.id);
    assert.equal(notifications, 4);
    assert.deepEqual(pendingOpenRfqProofs("quote", "lender::party"), []);
  } finally {unsubscribe(); deleteOpenRfqProof("quote", "lender::party", request.id); deleteOpenRfqProof("quote", "outsider::party", otherId); deleteOpenRfqProof("publish", "lender::party", "scope");}
});
