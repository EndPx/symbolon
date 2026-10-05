/**
 * Real local-ledger integration check using the SAME actions and JSON adapter
 * as the browser. Requires a running, uploaded demo from scripts/demo.ps1.
 * Run: node web/node_modules/tsx/dist/cli.mjs scripts/demo-http.mjs
 * Each run allocates six isolated http-demo-* parties; existing desks remain
 * untouched. Assets/marks are simulations. This is not a wallet/DevNet test.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { LedgerApi, sandboxTransport, create, exercise, dec } from "../web/src/ledger/api.ts";
import { TPL, deskState, balanceOf, num, health } from "../web/src/ledger/symbolon.ts";
import {
  requestQuotes, sendQuote, acceptQuote, rejectQuote, issueMarginCall,
  topUp, proposeSubstitution, acceptSubstitution, repay, setPrice,
} from "../web/src/app/actions.ts";

if (process.argv.includes("--help")) {
  console.log("Run: node web/node_modules/tsx/dist/cli.mjs scripts/demo-http.mjs\nRequires local Canton JSON API on port 6864 and uploaded Symbolon DARs.\nAllocates six isolated http-demo-* parties and exercises the actual frontend adapter.");
  process.exit(0);
}

const base = process.env.SYMBOLON_LEDGER_URL ?? "http://127.0.0.1:6864";
const endpoint = new URL(base);
assert.ok(endpoint.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname)
  && endpoint.port === "6864" && endpoint.pathname === "/" && !endpoint.username && !endpoint.password
  && !endpoint.search && !endpoint.hash,
"This integration check only runs against a loopback HTTP ledger on port 6864.");

const transport = sandboxTransport(endpoint.origin);
// Deliberately match the browser's local sandbox userId and adapter behavior.
const api = new LedgerApi(transport, "symbolon-local");
const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const updateIds = [];
const step = message => console.log(`[http-demo] ${message}`);
const session = party => ({
  kind: "sandbox", party, label: party,
  read: () => api.activeContracts(party),
  submit: async commands => {
    const updateId = await api.submit(party, commands);
    updateIds.push(updateId);
    return updateId;
  },
  disconnect: async () => {},
});
const state = async s => deskState(await s.read());
const only = (items, label) => {
  assert.equal(items.length, 1, `${label}: expected exactly one contract`);
  return items[0];
};
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-7,
  `${label}: expected ${expected}, got ${actual}`);

async function run() {
  const before = await api.ledgerEnd();
  step(`Allocating an isolated six-party desk (${runId}).`);
  const parties = {};
  // Schema verified against the running Canton 3.5.6 /docs/openapi:
  // POST /v2/parties accepts AllocatePartyRequest.partyIdHint and returns
  // AllocatePartyResponse.partyDetails.party. No existing party is selected.
  for (const role of ["issuer", "oracle", "borrower", "dealerA", "dealerB", "outsider"]) {
    const result = await transport.request("POST", "/v2/parties", {
      partyIdHint: `http-demo-${role}-${runId}`,
    });
    assert.equal(typeof result.partyDetails?.party, "string", "Party allocation response shape");
    parties[role] = result.partyDetails.party;
  }
  const [issuer, oracle, borrower, dealerA, dealerB, outsider] =
    ["issuer", "oracle", "borrower", "dealerA", "dealerB", "outsider"].map(role => session(parties[role]));
  const holdings = [
    [borrower.party, "CETH", 40], [borrower.party, "TBILL", 3000], [borrower.party, "CUSD", 5000],
    [dealerA.party, "CUSD", 100000], [dealerB.party, "CUSD", 100000],
  ];
  await issuer.submit(holdings.map(([owner, instrument, amount]) => create(TPL.Holding, {
    issuer: issuer.party, owner, instrument, amount: dec(amount), viewers: [], lockParties: [],
  })));
  await oracle.submit([["CETH", 100], ["TBILL", 1]].map(([instrument, price]) => create(TPL.PriceFeed, {
    oracle: oracle.party, instrumentIssuer: issuer.party, instrument,
    cashIssuer: issuer.party, cashInstrument: "CUSD", price: dec(price),
    asOf: new Date().toISOString(), readers: [borrower.party, dealerA.party, dealerB.party],
  })));
  assert.equal((await outsider.read()).length, 0, "Outsider must have no fixture visibility");
  step("Seeded simulated assets and marks. Sending a separate private RFQ to each dealer.");
  await requestQuotes(borrower, {
    dealers: [dealerA.party, dealerB.party], oracle: oracle.party,
    collateralIssuer: issuer.party, collateralInstrument: "CETH", collateralAmount: 15,
    cashIssuer: issuer.party, cashInstrument: "CUSD", cashAmount: 1000,
    termDays: 30, marginThresholdPct: 1.05, cureSeconds: 300, maxPriceAgeSeconds: 3600,
  });
  assert.equal((await state(borrower)).requests.length, 2);
  const requestA = only((await state(dealerA)).requests, "Dealer A private request");
  const requestB = only((await state(dealerB)).requests, "Dealer B private request");
  assert.equal(requestA.payload.dealer, dealerA.party);
  assert.equal(requestB.payload.dealer, dealerB.party);
  await sendQuote(dealerA, requestA, 0.052, 3600);
  await sendQuote(dealerB, requestB, 0.056, 3600);
  const aQuote = only((await state(dealerA)).quotes, "Dealer A quote");
  const bQuote = only((await state(dealerB)).quotes, "Dealer B quote");
  assert.equal(num(aQuote.payload.rate), 0.052);
  assert.equal(num(bQuote.payload.rate), 0.056);
  const bBook = await state(borrower);
  assert.equal(bBook.quotes.length, 2, "Only borrower compares both quotes");
  const sharedFunding = bBook.holdings.filter(h => [dealerA.party, dealerB.party].includes(h.payload.owner));
  assert.equal(sharedFunding.length, 2);
  assert.ok(sharedFunding.every(h => num(h.payload.amount) === 1000
    && h.payload.lockParties.length === 1 && h.payload.lockParties[0] === borrower.party),
  "Borrower must see exact reserved cash, not unreserved dealer balances");
  await assert.rejects(dealerA.submit([exercise(TPL.Holding, aQuote.payload.cashCid, "Transfer", {
    to: dealerA.party, qty: dec(1000), newViewers: [],
  })]), /authoriz|permission|requires|missing/i, "Dealer cannot unilaterally spend reserved funding");
  assert.equal((await state(dealerA)).quotes.length, 1, "Rejected spend must preserve quote");
  step("Both private quotes and exact cash reservations verified; unauthorized spend rejected.");
  const cethFeed = only(bBook.feeds.filter(f => f.payload.instrument === "CETH"), "CETH feed");
  await acceptQuote(borrower, aQuote, cethFeed.contractId);
  await rejectQuote(borrower, bQuote.contractId);
  let pos = only((await state(borrower)).positions, "Accepted position");
  near(num(pos.payload.repurchasePrice), 1000 + 1000 * 0.052 * 30 / 360, "ACT/360 fixed repurchase price");
  assert.equal((await state(dealerB)).positions.length, 0, "Losing dealer must see no position");
  near(balanceOf((await state(dealerB)).holdings, dealerB.party, "CUSD", issuer.party), 100000, "Losing quote refund");
  assert.equal((await outsider.read()).length, 0, "Outsider after settlement");
  const pledged = only((await state(dealerA)).holdings.filter(h => h.payload.instrument === "CETH"), "Pledged CETH");
  assert.deepEqual(pledged.payload.lockParties, [borrower.party]);
  step("Accepted 5.2% quote atomically; losing dealer stays private. Moving the simulated mark to 63.");
  await setPrice(oracle, cethFeed, 63);
  const lowFeed = only((await state(borrower)).feeds.filter(f => f.payload.instrument === "CETH"), "Updated CETH feed");
  assert.equal(health(pos.payload, (await state(borrower)).feeds).healthy, false);
  await issueMarginCall(dealerA, pos.contractId, lowFeed.contractId);
  pos = only((await state(borrower)).positions, "Called position");
  assert.equal(pos.payload.status.tag, "UnderCall", "Daml variant JSON decoding");
  await topUp(borrower, pos, 3, lowFeed.contractId);
  pos = only((await state(borrower)).positions, "Cured position");
  assert.equal(pos.payload.status.tag, "Active");
  assert.equal(num(pos.payload.collateralAmount), 18);
  assert.equal(health(pos.payload, (await state(borrower)).feeds).healthy, true);
  step("Margin call cured by 3 CETH. Proposing and accepting 1,200 simulated TBILL collateral.");
  const tbillFeed = only((await state(borrower)).feeds.filter(f => f.payload.instrument === "TBILL"), "TBILL feed");
  await proposeSubstitution(borrower, pos.contractId, tbillFeed, 1200);
  const proposal = only((await state(dealerA)).proposals, "Substitution proposal");
  await acceptSubstitution(dealerA, proposal.contractId);
  pos = only((await state(borrower)).positions, "Substituted position");
  assert.equal(pos.payload.collateralInstrument, "TBILL");
  near(balanceOf((await state(borrower)).holdings, borrower.party, "CETH", issuer.party), 40, "All CETH returned");
  assert.equal((await state(dealerB)).proposals.length, 0);
  assert.equal((await state(dealerB)).positions.length, 0);
  const repayment = num(pos.payload.repurchasePrice);
  await repay(borrower, pos);
  const finalBorrower = await state(borrower);
  const finalDealer = await state(dealerA);
  const receipt = only(finalBorrower.closed, "Repurchase receipt");
  // Daml may compile an all-nullary type to an enum (JSON string), unlike the
  // payload-carrying PositionStatus variant. Preserve this wire shape in output.
  const outcome = typeof receipt.payload.outcome === "string"
    ? receipt.payload.outcome : receipt.payload.outcome.tag;
  assert.equal(outcome, "Repurchased");
  assert.equal(finalBorrower.positions.length, 0);
  assert.equal(finalDealer.positions.length, 0);
  near(balanceOf(finalBorrower.holdings, borrower.party, "TBILL", issuer.party), 3000, "All TBILL returned");
  near(balanceOf(finalBorrower.holdings, borrower.party, "CUSD", issuer.party), 6000 - repayment, "Borrower final cash");
  near(balanceOf(finalDealer.holdings, dealerA.party, "CUSD", issuer.party), 99000 + repayment, "Dealer final cash");
  assert.equal((await state(dealerB)).closed.length, 0, "Losing dealer must see no receipt");
  assert.equal((await outsider.read()).length, 0, "Outsider after the full lifecycle");
  assert.ok(finalBorrower.holdings.every(h => h.payload.owner !== borrower.party || h.payload.lockParties.length === 0));
  assert.equal(new Set(updateIds).size, updateIds.length, "Each submission must return a unique update receipt");
  console.log(JSON.stringify({
    result: "passed", runId, endpoint: endpoint.origin, ledgerOffsetBefore: before,
    ledgerOffsetAfter: await api.ledgerEnd(), successfulSubmissions: updateIds.length,
    checked: ["actual frontend actions", "JSON v2 encoding", "two-dealer RFQ privacy", "exact reservations",
      "unauthorized funding spend", "atomic settlement", "ACT/360", "margin call", "top-up",
      "substitution", "repurchase", "issuer-qualified balances", "losing-dealer and outsider isolation"],
    repurchasePrice: receipt.payload.repurchasePrice, outcomeWireValue: receipt.payload.outcome,
    parties,
  }, null, 2));
}

run().catch(error => {
  console.error(`[http-demo] FAILED: ${error.stack ?? error}`);
  process.exitCode = 1;
});
