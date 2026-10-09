import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import profile from "../public/deployment.json";
import { DiscoveryError, discoveryOperation, verifyQuoteRequest, type DiscoveryStore, type StoredInterest, type StoredOpportunity } from "../server/discovery.ts";
import { checkedDiscoveryTerms, checkedOwnDiscovery, checkedPublicOpportunities, numeric10, type DiscoveryTerms } from "../src/ledger/discovery-model.ts";
import { lenderMarketKey, type LenderMarket } from "../src/ledger/lender-directory-model.ts";

const operator = profile.publicDesk.operator;
const market: LenderMarket = {network: "devnet", synchronizerId: profile.synchronizerId, corePackageId: profile.corePackageId, oracle: operator,
  collateralIssuer: operator, collateralInstrument: profile.assets.collateral.symbol, cashIssuer: operator, cashInstrument: profile.assets.cash.symbol};
const borrower = "alice::party", lender = "bob::party", outsider = "carol::party";
const terms: DiscoveryTerms = {oracle: operator, collateralIssuer: operator, collateralInstrument: market.collateralInstrument, collateralAmount: "0.0250000000",
  cashIssuer: operator, cashInstrument: market.cashInstrument, cashAmount: "1000.0000000000", termDays: 30, marginThresholdPct: "1.0500000000", cureSeconds: 3600, maxPriceAgeSeconds: 3600};
const createdAt = "2026-10-10T00:00:00.000Z";
function memoryStore(): DiscoveryStore {
  const opportunities = new Map<string, StoredOpportunity>(), interests = new Map<string, StoredInterest>();
  return {
    async list(scope) { return [...opportunities.values()].filter(item => lenderMarketKey(item.market) === lenderMarketKey(scope) && item.status === "open"); },
    async mine(scope, party) { return {
      opportunities: [...opportunities.values()].filter(item => lenderMarketKey(item.market) === lenderMarketKey(scope) && item.borrower === party).map(item => ({...item, incoming: [...interests.values()].filter(i => i.opportunityId === item.id)})),
      outgoing: [...interests.values()].filter(item => item.party === party && lenderMarketKey(opportunities.get(item.opportunityId)!.market) === lenderMarketKey(scope)).map(interest => ({interest, opportunity: opportunities.get(interest.opportunityId)!})),
    }; },
    async get(scope, id) { const value = opportunities.get(id); return value && lenderMarketKey(value.market) === lenderMarketKey(scope) ? value : null; },
    async interest(opportunityId, id) { const value = interests.get(id); return value?.opportunityId === opportunityId ? value : null; },
    async publish(scope, party, terms) { const opportunity: StoredOpportunity = {id: randomUUID(), market: scope, borrower: party, terms, status: "open", createdAt}; opportunities.set(opportunity.id, opportunity); return opportunity; },
    async request(opportunity, party, name) {
      if (opportunities.get(opportunity.id)?.status !== "open") throw new DiscoveryError(409, "closed");
      const duplicate = [...interests.values()].find(item => item.opportunityId === opportunity.id && item.party === party);
      if (duplicate) return duplicate;
      const interest: StoredInterest = {id: randomUUID(), opportunityId: opportunity.id, party, name, status: "pending", createdAt}; interests.set(interest.id, interest); return interest;
    },
    async approve(opportunity, interest, updateId, contractId) {
      if (!opportunities.has(opportunity.id) || interest.status !== "pending") throw new DiscoveryError(409, "changed");
      if ([...interests.values()].some(item => item.requestContractId === contractId)) throw new DiscoveryError(409, "replayed");
      interests.set(interest.id, {...interest, status: "approved", approvedAt: "2026-10-10T01:00:00.000Z", requestUpdateId: updateId, requestContractId: contractId});
    },
    async close(opportunity) { opportunities.set(opportunity.id, {...opportunity, status: "closed"}); },
  };
}
const authority = async (token: string, party: string) => { if (token !== party.replace("::", "-")) throw new DiscoveryError(403, "not owned"); };
const auth = (party: string) => `Bearer ${party.replace("::", "-")}`;
const run = (store: DiscoveryStore, party: string, body: Record<string, unknown>, confirm?: typeof verifyQuoteRequest) => discoveryOperation("POST", {party, market, ...body}, auth(party), store, authority, confirm);
const mine = (store: DiscoveryStore, party: string) => discoveryOperation("GET", {market, scope: "mine", party}, auth(party), store, authority) as Promise<ReturnType<typeof checkedOwnDiscovery> & {market: LenderMarket}>;
async function setup() {
  const store = memoryStore();
  const publication = await run(store, borrower, {op: "publish", terms}) as {opportunity: {id: string}};
  const opportunityId = publication.opportunity.id;
  const access = await run(store, lender, {op: "request-access", opportunityId, name: "Lender B"}) as {interest: {id: string; status: string}};
  return {store, opportunityId, interestId: access.interest.id};
}
function receipt(opportunity: StoredOpportunity, interest: StoredInterest, updateId = "ledger-update", contractId = "ledger-contract") {
  return {transaction: {updateId, synchronizerId: market.synchronizerId, offset: 5, recordTime: "2026-10-10T01:00:00.000Z", events: [{CreatedEvent: {
    contractId, templateId: `${market.corePackageId}:Symbolon.Repo:QuoteRequest`, signatories: [opportunity.borrower], observers: [interest.party],
    createArgument: {...opportunity.terms, borrower: opportunity.borrower, dealer: interest.party, termDays: "30", cureSeconds: "3600", maxPriceAgeSeconds: "3600"},
  }}]}};
}
const confirmFromLedger: typeof verifyQuoteRequest = (token, opportunity, interest, updateId, contractId) => verifyQuoteRequest(token, opportunity, interest, updateId, contractId, async (url, options) => {
  assert.equal(String(url), `${profile.participant}/v2/updates/transaction-by-id`);
  assert.equal((options!.headers as Record<string, string>).Authorization, `Bearer ${token}`);
  const body = JSON.parse(options!.body as string);
  assert.deepEqual(Object.keys(body.transactionFormat.eventFormat.filtersByParty), [borrower]);
  assert.equal(body.updateId, updateId);
  return Response.json(receipt(opportunity, interest, updateId, contractId));
});

test("public discovery strips identities, exact terms, contract IDs, and interests", async () => {
  const {store, opportunityId} = await setup();
  const board = await discoveryOperation("GET", {market}, "", store) as {opportunities: unknown[]};
  const listings = checkedPublicOpportunities(board.opportunities, market);
  assert.equal(listings[0].id, opportunityId);
  assert.deepEqual(Object.keys(listings[0]).sort(), ["createdAt", "id", "market", "status"]);
  assert.doesNotMatch(JSON.stringify(board), /alice::party|bob::party|Lender B|cashAmount|collateralAmount|termDays|requestContractId|createdEventBlob|incoming/);
  assert.throws(() => checkedPublicOpportunities([{...listings[0], borrower}], market), /private fields/);
});

test("a newly connected lender can request access after publication without registering", async () => {
  const {store, opportunityId, interestId} = await setup();
  const duplicate = await run(store, lender, {op: "request-access", opportunityId, name: "Another name"}) as {interest: {id: string; status: string}};
  assert.equal(duplicate.interest.id, interestId);
  assert.equal(duplicate.interest.status, "pending");
  const fresh = await run(store, outsider, {op: "request-access", opportunityId, name: "Fresh user"}) as {interest: {status: string}};
  assert.equal(fresh.interest.status, "pending");
  const owner = await mine(store, borrower);
  assert.deepEqual(owner.opportunities[0].incoming.map(item => item.party), [lender, outsider]);
});

test("pending requester and unrelated own views cannot see borrower or financing terms", async () => {
  const {store} = await setup();
  const pending = await mine(store, lender), unrelated = await mine(store, outsider);
  assert.equal(pending.opportunities.length, 0);
  assert.equal(pending.outgoing.length, 1);
  assert.doesNotMatch(JSON.stringify(pending), /alice::party|cashAmount|collateralAmount|termDays|Lender B/);
  assert.deepEqual(unrelated.opportunities, []);
  assert.deepEqual(unrelated.outgoing, []);
  assert.equal(checkedOwnDiscovery(pending, market).outgoing[0].status, "pending");
  assert.throws(() => checkedOwnDiscovery({...pending, outgoing: [{...pending.outgoing[0], terms}]}, market), /private financing details/);
});

test("anonymous writes, spoofed owner/requester and unauthorized own views fail before persistence", async () => {
  const {store, opportunityId} = await setup();
  for (const input of [{op: "publish", party: borrower, terms}, {op: "request-access", party: borrower, opportunityId, name: "A"}, {op: "close", party: borrower, opportunityId}]) {
    await assert.rejects(discoveryOperation("POST", {...input, market}, auth(outsider), store, authority), error => error instanceof DiscoveryError && error.status === 403);
  }
  await assert.rejects(discoveryOperation("GET", {market, party: borrower, scope: "mine"}, auth(outsider), store, authority));
  await assert.rejects(discoveryOperation("POST", {op: "publish", party: borrower, market, terms}, "", store, authority));
  assert.equal((await store.list(market)).length, 1);
});

test("borrower cannot request own listing; another party cannot approve or close it", async () => {
  const {store, opportunityId, interestId} = await setup();
  await assert.rejects(run(store, borrower, {op: "request-access", opportunityId, name: "Own"}), /own opportunity/);
  await assert.rejects(run(store, outsider, {op: "close", opportunityId}), /Only the borrower/);
  await assert.rejects(run(store, outsider, {op: "approve", opportunityId, interestId, updateId: "u", contractId: "c"}), /Only the borrower/);
});

test("approval uses a participant-confirmed matching creation before releasing bilateral details", async () => {
  const {store, opportunityId, interestId} = await setup();
  await run(store, borrower, {op: "approve", opportunityId, interestId, updateId: "ledger-update", contractId: "ledger-contract"}, confirmFromLedger);
  const approved = await mine(store, lender);
  assert.equal(approved.outgoing[0].borrower, borrower);
  assert.deepEqual(approved.outgoing[0].terms, terms);
  assert.equal(approved.outgoing[0].requestContractId, "ledger-contract");
  assert.equal(checkedOwnDiscovery(approved, market).outgoing[0].status, "approved");
  assert.deepEqual((await mine(store, outsider)).outgoing, []);
  const idempotent = await run(store, borrower, {op: "approve", opportunityId, interestId, updateId: "ledger-update", contractId: "ledger-contract"}, async () => {throw new Error("must not recreate or reconfirm");});
  assert.deepEqual(idempotent, {approved: true, requestContractId: "ledger-contract", requestUpdateId: "ledger-update"});
});

test("fake or mismatched approval receipts cannot authorize off-ledger detail access", async () => {
  const {store, opportunityId, interestId} = await setup();
  await assert.rejects(run(store, borrower, {op: "approve", opportunityId, interestId, updateId: "fake", contractId: "fake"}, async () => {throw new DiscoveryError(409, "not confirmed");}));
  assert.equal((await mine(store, lender)).outgoing[0].status, "pending");
  assert.equal((await mine(store, lender)).outgoing[0].terms, undefined);
});

test("receipt verification rejects wrong template, owner, lender, terms, synchronizer and receipt identity", async () => {
  const {store, opportunityId, interestId} = await setup();
  const opportunity = (await store.get(market, opportunityId))!, interest = (await store.interest(opportunityId, interestId))!;
  const mutations = [
    (tx: ReturnType<typeof receipt>["transaction"]) => {tx.updateId = "other";},
    (tx: ReturnType<typeof receipt>["transaction"]) => {tx.synchronizerId = "different::sync";},
    (tx: ReturnType<typeof receipt>["transaction"]) => {tx.offset = 0;},
    (tx: ReturnType<typeof receipt>["transaction"]) => {tx.recordTime = "2026-10-09T23:00:00.000Z";},
    (tx: ReturnType<typeof receipt>["transaction"]) => {tx.events[0].CreatedEvent.contractId = "other";},
    (tx: ReturnType<typeof receipt>["transaction"]) => {tx.events[0].CreatedEvent.templateId = `${"b".repeat(64)}:Symbolon.Repo:QuoteRequest`;},
    (tx: ReturnType<typeof receipt>["transaction"]) => {tx.events[0].CreatedEvent.createArgument.borrower = outsider;},
    (tx: ReturnType<typeof receipt>["transaction"]) => {tx.events[0].CreatedEvent.createArgument.dealer = outsider;},
    (tx: ReturnType<typeof receipt>["transaction"]) => {tx.events[0].CreatedEvent.createArgument.cashAmount = "999.0000000000";},
    (tx: ReturnType<typeof receipt>["transaction"]) => {tx.events[0].CreatedEvent.observers = [outsider];},
    (tx: ReturnType<typeof receipt>["transaction"]) => {tx.events.push(tx.events[0]);},
  ];
  for (const mutate of mutations) {
    const value = receipt(opportunity, interest); mutate(value.transaction);
    await assert.rejects(verifyQuoteRequest("authenticated", opportunity, interest, "ledger-update", "ledger-contract", async () => Response.json(value)), error => error instanceof DiscoveryError && error.status === 409);
  }
  await assert.rejects(verifyQuoteRequest("rejected", opportunity, interest, "ledger-update", "ledger-contract", async () => new Response("", {status: 401})), error => error instanceof DiscoveryError && error.status === 401);
  await assert.rejects(verifyQuoteRequest("authenticated", opportunity, {...interest, createdAt: "2026-10-10T02:00:00.000Z"}, "ledger-update", "ledger-contract", async () => Response.json(receipt(opportunity, interest))), /access request/);
});

test("closed listings reject new access and retain previously disclosed ledger details", async () => {
  const {store, opportunityId, interestId} = await setup();
  await run(store, borrower, {op: "approve", opportunityId, interestId, updateId: "ledger-update", contractId: "ledger-contract"}, confirmFromLedger);
  await run(store, borrower, {op: "close", opportunityId});
  assert.equal((await store.list(market)).length, 0);
  await assert.rejects(run(store, outsider, {op: "request-access", opportunityId, name: "Too late"}), /closed/);
  const idempotent = await run(store, borrower, {op: "approve", opportunityId, interestId, updateId: "ledger-update", contractId: "ledger-contract"}, async () => {throw new Error("must not create or reconfirm");});
  assert.deepEqual(idempotent, {approved: true, requestContractId: "ledger-contract", requestUpdateId: "ledger-update"});
  const own = await mine(store, lender);
  assert.equal(own.outgoing[0].opportunityStatus, "closed");
  assert.deepEqual(own.outgoing[0].terms, terms);
});

test("closure between ledger commit and API confirmation still permits exact receipt reconciliation", async () => {
  const {store, opportunityId, interestId} = await setup();
  const opportunity = (await store.get(market, opportunityId))!, interest = (await store.interest(opportunityId, interestId))!;
  // The ledger receipt already exists before discovery closes. The API itself
  // never creates a new RFQ, and closing metadata cannot revoke disclosure.
  const committed = receipt(opportunity, interest);
  await run(store, borrower, {op: "close", opportunityId});
  assert.equal((await mine(store, lender)).outgoing[0].status, "pending");
  const reconcile: typeof verifyQuoteRequest = (token, opportunity, interest, updateId, contractId) => verifyQuoteRequest(token, opportunity, interest, updateId, contractId, async () => Response.json(committed));
  await run(store, borrower, {op: "approve", opportunityId, interestId, updateId: "ledger-update", contractId: "ledger-contract"}, reconcile);
  const own = await mine(store, lender);
  assert.equal(own.outgoing[0].status, "approved");
  assert.equal(own.outgoing[0].opportunityStatus, "closed");
  assert.deepEqual(own.outgoing[0].terms, terms);
  await assert.rejects(run(store, outsider, {op: "request-access", opportunityId, name: "Late lender"}), /closed/);
  await assert.rejects(run(store, borrower, {op: "approve", opportunityId, interestId, updateId: "different", contractId: "different"}, reconcile), /already approved/);
});

test("one ledger request contract cannot approve two different listing access records", async () => {
  const {store, opportunityId, interestId} = await setup();
  await run(store, borrower, {op: "approve", opportunityId, interestId, updateId: "ledger-update", contractId: "ledger-contract"}, confirmFromLedger);
  const second = await run(store, borrower, {op: "publish", terms}) as {opportunity: {id: string}};
  const access = await run(store, lender, {op: "request-access", opportunityId: second.opportunity.id, name: "B"}) as {interest: {id: string}};
  await assert.rejects(run(store, borrower, {op: "approve", opportunityId: second.opportunity.id, interestId: access.interest.id, updateId: "ledger-update", contractId: "ledger-contract"}, confirmFromLedger), /replayed/);
});

test("discovery uses canonical decimal strings and pinned market identities", async () => {
  assert.equal(numeric10("1000"), "1000.0000000000");
  assert.equal(numeric10("0.025"), "0.0250000000");
  assert.equal(numeric10("9999999999999999999999999.9999999999"), "9999999999999999999999999.9999999999");
  for (const value of [1000, "1e3", "NaN", "-1", "0.00000000001", "01", "10000000000000000000000000"]) assert.throws(() => numeric10(value));
  for (const value of [{...terms, termDays: 366}, {...terms, cashAmount: "0"}, {...terms, marginThresholdPct: "2.01"}, {...terms, oracle: outsider}, {...terms, borrower}, {...terms, maxPriceAgeSeconds: 86401}]) assert.throws(() => checkedDiscoveryTerms(value, market));
  const store = memoryStore();
  for (const value of [{...market, network: "testnet"}, {...market, oracle: outsider}, {...market, cashInstrument: "USDCx"}, {...market, corePackageId: "b".repeat(64)}]) {
    await assert.rejects(discoveryOperation("GET", {market: value}, "", store));
  }
});
