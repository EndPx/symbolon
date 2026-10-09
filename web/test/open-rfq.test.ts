import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import profile from "../public/deployment.json";
import { OpenRfqError, openRfqActiveQuery, openRfqOperation, openRfqReceiptQuery, openRfqTemplate, type OpenRfqConfig, type OpenRfqStore } from "../server/open-rfq.ts";
import { partyEventFormat } from "../src/ledger/canton-v2.ts";
import { checkedOpenRfqPricing, checkedOpenRfqPublic, checkedOwnOpenRfq, type OpenRfqQuote, type OpenRfqRequest, type OwnOpenRfq } from "../src/ledger/open-rfq-model.ts";
import { sameDiscoveryTerms, type DiscoveryTerms } from "../src/ledger/discovery-model.ts";
import { lenderMarketKey, type LenderMarket } from "../src/ledger/lender-directory-model.ts";

const config: OpenRfqConfig = {...profile, openRfqPackageId: "53e322d473cb992c4d38889869bc7b4e0a814cc6e10af3492aa126a24735c882"};
const operator = profile.publicDesk.operator;
const market: LenderMarket = {network: "devnet", synchronizerId: profile.synchronizerId, corePackageId: profile.corePackageId,
  oracle: operator, collateralIssuer: operator, collateralInstrument: profile.assets.collateral.symbol, cashIssuer: operator, cashInstrument: profile.assets.cash.symbol};
const terms: DiscoveryTerms = {oracle: operator, collateralIssuer: operator, collateralInstrument: market.collateralInstrument, collateralAmount: "0.0250000000", cashIssuer: operator,
  cashInstrument: market.cashInstrument, cashAmount: "1000.0000000000", termDays: 30, marginThresholdPct: "1.0500000000", cureSeconds: 3600, maxPriceAgeSeconds: 3600};
const borrower = "alice::party", lender = "bob::party", other = "carol::party";
const authoritativeBlob = "YXV0aG9yaXRhdGl2ZS1ibG9i";
const permission = async (token: string, party: string) => {if (token !== party.replace("::", "-")) throw new OpenRfqError(403, "not owned");};
const auth = (party: string) => `Bearer ${party.replace("::", "-")}`;
type FixtureTx = {updateId: string; synchronizerId: string; offset: number; recordTime: string; effectiveAt: string; events: Array<Record<string, Record<string, unknown>>>};
const tx = (updateId: string, time: string, events: FixtureTx["events"]): FixtureTx => ({updateId, synchronizerId: market.synchronizerId, offset: 10, recordTime: time, effectiveAt: time, events});
const payload = () => ({...terms, borrower, termDays: "30", cureSeconds: "3600", maxPriceAgeSeconds: "3600"});
const publishTx = () => tx("publish-update", "2026-10-10T00:00:01.000Z", [{CreatedEvent: {nodeId: 0, contractId: "open-request", templateId: openRfqTemplate(config),
  createArgument: payload(), signatories: [borrower], observers: [], createdEventBlob: authoritativeBlob}}]);
function quoteTx(party = lender, requestCid = "open-request", quoteCid = `quote-${party.split("::")[0]}`): FixtureTx {
  const reservedCid = `reserved-${party.split("::")[0]}`, availableCid = `available-${party.split("::")[0]}`;
  return tx(`quote-update-${party.split("::")[0]}`, "2026-10-10T00:05:00.000Z", [
    {ExercisedEvent: {nodeId: 0, lastDescendantNodeId: 5, contractId: requestCid, templateId: openRfqTemplate(config), choice: "SubmitOpenQuote", consuming: false,
      choiceArgument: {dealer: party, rate: "0.0700000000", validSeconds: "3600", cashCid: availableCid}, actingParties: [party], exerciseResult: quoteCid}},
    {CreatedEvent: {nodeId: 1, contractId: `transient-${party}`, templateId: `${market.corePackageId}:Symbolon.Repo:QuoteRequest`, createArgument: {...payload(), dealer: party}}},
    {ExercisedEvent: {nodeId: 2, contractId: `transient-${party}`, templateId: `${market.corePackageId}:Symbolon.Repo:QuoteRequest`, choice: "SubmitQuote", consuming: true}},
    {ExercisedEvent: {nodeId: 3, contractId: availableCid, templateId: `${market.corePackageId}:Symbolon.DemoAsset:Holding`, choice: "Reserve", consuming: true,
      actingParties: [party], choiceArgument: {to: party, qty: terms.cashAmount, lockParty: borrower}}},
    {CreatedEvent: {nodeId: 4, contractId: reservedCid, templateId: `${market.corePackageId}:Symbolon.DemoAsset:Holding`, createArgument: {
      issuer: market.cashIssuer, owner: party, instrument: market.cashInstrument, amount: terms.cashAmount, lockParties: [borrower], viewers: []}}},
    {CreatedEvent: {nodeId: 5, contractId: quoteCid, templateId: `${market.corePackageId}:Symbolon.Repo:RepoQuote`, signatories: [borrower, party], observers: [],
      createArgument: {...payload(), dealer: party, rate: "0.0700000000", cashCid: reservedCid, validUntil: "2026-10-10T01:05:00.000Z"}}},
  ]);
}
const closeTx = () => tx("close-update", "2026-10-10T00:10:00.000Z", [{ExercisedEvent: {nodeId: 0, lastDescendantNodeId: 0, contractId: "open-request", templateId: openRfqTemplate(config),
  choice: "WithdrawOpenRequest", consuming: true, actingParties: [borrower], choiceArgument: {}, exerciseResult: {}}}]);
const response = (value: FixtureTx) => Response.json({update: {Transaction: {value}}});
function fakeLedger(values: FixtureTx[], active = true): typeof fetch {
  return async (url, options) => {
    if (String(url) === `${profile.participant}/v2/state/ledger-end`) {
      assert.equal(options!.method, "GET"); return Response.json({offset: 100});
    }
    if (String(url) === `${profile.participant}/v2/state/active-contracts`) {
      assert.equal(options!.method, "POST");
      assert.deepEqual(JSON.parse(options!.body as string), {activeAtOffset: 100, eventFormat: partyEventFormat(borrower, true)});
      return Response.json(active ? values.flatMap(value => value.events.filter(row => row.CreatedEvent?.templateId === openRfqTemplate(config)).map(row => ({contractEntry: {JsActiveContract: {createdEvent: row.CreatedEvent, synchronizerId: market.synchronizerId}}}))) : []);
    }
    assert.equal(String(url), `${profile.participant}/v2/updates/update-by-id`);
    const query = JSON.parse(options!.body as string), party = Object.keys(query.updateFormat.includeTransactions.eventFormat.filtersByParty)[0];
    assert.deepEqual(query, openRfqReceiptQuery(party, query.updateId));
    assert.equal(query.updateFormat.includeTransactions.eventFormat.filtersByParty[party].cumulative[0].identifierFilter.WildcardFilter.value.includeCreatedEventBlob, true);
    assert.ok((options!.headers as Record<string, string>).Authorization.startsWith("Bearer "));
    const value = values.find(value => value.updateId === query.updateId);
    return value ? response(value) : new Response("missing", {status: 404});
  };
}
function memoryStore(): OpenRfqStore {
  const requests = new Map<string, OpenRfqRequest>(), quotes = new Map<string, OpenRfqQuote>();
  return {
    async list(scope) {return [...requests.values()].filter(row => lenderMarketKey(row.market) === lenderMarketKey(scope) && row.status === "open");},
    async get(scope, id) {const row = requests.get(id); return row && lenderMarketKey(row.market) === lenderMarketKey(scope) ? row : null;},
    async findPublished(scope, cid) {return [...requests.values()].find(row => lenderMarketKey(row.market) === lenderMarketKey(scope) && row.disclosure.contractId === cid) ?? null;},
    async mine(scope, party) {const own = [...requests.values()].filter(row => lenderMarketKey(row.market) === lenderMarketKey(scope) && row.borrower === party);
      return {requests: own.map(row => ({...row, quotes: [...quotes.values()].filter(quote => quote.requestId === row.id)})), quotes: [...quotes.values()].filter(quote => quote.dealer === party)
        .map(quote => ({request: requests.get(quote.requestId)!, quote}))};},
    async publish(value) {
      const existing = [...requests.values()].find(row => row.disclosure.contractId === value.disclosure.contractId);
      if (existing) {if (existing.borrower !== value.borrower || existing.publishUpdateId !== value.publishUpdateId || !sameDiscoveryTerms(existing.terms, value.terms)) throw new OpenRfqError(409, "replay"); return existing;}
      const request: OpenRfqRequest = {...value, id: randomUUID(), status: "open"}; requests.set(request.id, request); return request;
    },
    async quote(request, quote) {
      const old = quotes.get(quote.quoteContractId);
      if (old && (old.requestId !== request.id || old.dealer !== quote.dealer || old.updateId !== quote.updateId)) throw new OpenRfqError(409, "replay");
      quotes.set(quote.quoteContractId, quote);
    },
    async close(request, updateId, closedAt) {
      const old = requests.get(request.id)!;
      if (old.status === "closed" && old.closedUpdateId !== updateId) throw new OpenRfqError(409, "different closure");
      requests.set(request.id, {...old, status: "closed", closedUpdateId: updateId, closedAt});
    },
  };
}
const run = (store: OpenRfqStore, party: string, body: Record<string, unknown>, ledger: typeof fetch) => openRfqOperation("POST", {party, market, ...body}, auth(party), store, permission, ledger, config);
const view = (store: OpenRfqStore, party: string, scope: "mine" | "board" | "quote", requestId?: string) => openRfqOperation("GET", {market, party, scope, ...(requestId ? {requestId} : {})}, auth(party), store, permission, fakeLedger([]), config);
async function setup() {
  const store = memoryStore(), published = await run(store, borrower, {op: "publish", terms, updateId: "publish-update", contractId: "open-request"}, fakeLedger([publishTx()])) as {request: OpenRfqRequest};
  return {store, requestId: published.request.id, request: published.request};
}

test("public discovery contains only opaque ID, market, status and timestamp", async () => {
  const {store} = await setup();
  const publicView = await openRfqOperation("GET", {market}, "", store, permission, fakeLedger([]), config) as {requests: unknown[]};
  const requests = checkedOpenRfqPublic(publicView.requests, market);
  assert.equal(requests.length, 1);
  assert.deepEqual(Object.keys(requests[0]).sort(), ["createdAt", "id", "market", "status"]);
  assert.doesNotMatch(JSON.stringify(publicView), /alice::party|cashAmount|collateralAmount|termDays|createdEventBlob|quoteContractId|rate|open-request/);
  assert.throws(() => checkedOpenRfqPublic([{...requests[0], borrower}], market), /private fields/);
});

test("a fresh unregistered party receives request pricing and quote context without permission requests", async () => {
  const {store, requestId} = await setup();
  const board = await view(store, other, "board") as {requests: unknown[]};
  const pricing = checkedOpenRfqPricing(board.requests, market);
  assert.equal(pricing[0].borrower, borrower);
  assert.deepEqual(pricing[0].terms, terms);
  assert.doesNotMatch(JSON.stringify(board), /createdEventBlob|quoteContractId|publishUpdateId|quotes/);
  const context = await view(store, other, "quote", requestId) as {request: OpenRfqRequest};
  assert.equal(context.request.disclosure.createdEventBlob, authoritativeBlob);
  assert.equal(context.request.disclosure.templateId, openRfqTemplate(config));
  assert.equal(context.request.disclosure.synchronizerId, market.synchronizerId);
  await assert.rejects(openRfqOperation("GET", {market, party: other, scope: "board"}, "", store, permission, fakeLedger([]), config));
  await assert.rejects(view(store, borrower, "quote", requestId), /own financing/);
});

test("publication derives the blob from the participant, ignoring browser-supplied forged disclosures", async () => {
  const store = memoryStore();
  const result = await run(store, borrower, {op: "publish", terms, updateId: "publish-update", contractId: "open-request", createdEventBlob: "forged-browser-blob"}, fakeLedger([publishTx()])) as {request: OpenRfqRequest};
  assert.equal(result.request.disclosure.createdEventBlob, authoritativeBlob);
  assert.equal(result.request.borrower, borrower);
  const repeated = await run(store, borrower, {op: "publish", terms, updateId: "publish-update", contractId: "open-request"}, fakeLedger([publishTx()])) as {request: OpenRfqRequest};
  assert.equal(repeated.request.id, result.request.id);
  assert.equal((await store.list(market)).length, 1);
});

test("fresh publication requires a current own-party active snapshot and rejects prior archival", async () => {
  assert.deepEqual(openRfqActiveQuery(borrower, 100), {activeAtOffset: 100, eventFormat: partyEventFormat(borrower, true)});
  const store = memoryStore();
  await assert.rejects(run(store, borrower, {op: "publish", terms, updateId: "publish-update", contractId: "open-request"}, fakeLedger([publishTx()], false)), /no longer active/);
  assert.equal((await store.list(market)).length, 0);
  const current = await run(store, borrower, {op: "publish", terms, updateId: "publish-update", contractId: "open-request"}, fakeLedger([publishTx()])) as {request: OpenRfqRequest};
  assert.equal(current.request.status, "open");
  assert.equal(current.request.disclosure.contractId, "open-request");
});

test("spoofed ownership, publishing receipts, terms, templates and synchronizers cannot create a listing", async () => {
  const mutate = [
    (value: FixtureTx) => {value.events[0].CreatedEvent.createArgument = {...payload(), borrower: other};},
    (value: FixtureTx) => {value.events[0].CreatedEvent.templateId = `${market.corePackageId}:Symbolon.Repo:QuoteRequest`;},
    (value: FixtureTx) => {value.events[0].CreatedEvent.createdEventBlob = "";},
    (value: FixtureTx) => {value.events[0].CreatedEvent.observers = [other];},
    (value: FixtureTx) => {value.events[0].CreatedEvent.contractId = "other";},
    (value: FixtureTx) => {value.synchronizerId = "wrong::sync";},
    (value: FixtureTx) => {value.events[0].CreatedEvent.createArgument = {...payload(), cashAmount: "999.0000000000"};},
  ];
  for (const change of mutate) {
    const store = memoryStore(), value = publishTx(); change(value);
    await assert.rejects(run(store, borrower, {op: "publish", terms, updateId: "publish-update", contractId: "open-request"}, fakeLedger([value])));
    assert.equal((await store.list(market)).length, 0);
  }
  const store = memoryStore();
  await assert.rejects(openRfqOperation("POST", {op: "publish", party: borrower, market, terms, updateId: "publish-update", contractId: "open-request"}, auth(other), store, permission, fakeLedger([publishTx()]), config), /not owned/);
});

test("funded quote is verified and visible only to borrower and originating dealer", async () => {
  const {store, requestId} = await setup(), value = quoteTx();
  const result = await run(store, lender, {op: "record-quote", requestId, updateId: value.updateId, quoteContractId: "quote-bob"}, fakeLedger([value])) as {quote: OpenRfqQuote};
  assert.equal(result.quote.rate, "0.0700000000");
  const owner = await view(store, borrower, "mine") as OwnOpenRfq & {market: LenderMarket};
  const own = await view(store, lender, "mine") as OwnOpenRfq & {market: LenderMarket};
  const unrelated = await view(store, other, "mine") as OwnOpenRfq;
  assert.equal(owner.requests[0].quotes.length, 1);
  assert.equal(own.quotes[0].quote.quoteContractId, "quote-bob");
  assert.deepEqual(unrelated, {market, requests: [], quotes: []});
  assert.equal(checkedOwnOpenRfq(owner, market, borrower, config.openRfqPackageId!).requests[0].quotes.length, 1);
  assert.equal(checkedOwnOpenRfq(own, market, lender, config.openRfqPackageId!).quotes.length, 1);
  assert.doesNotMatch(JSON.stringify(await view(store, other, "board")), /quote-bob|0\.0700000000|bob::party/);
  await assert.rejects(openRfqOperation("GET", {market, scope: "mine", party: borrower}, auth(other), store, permission, fakeLedger([]), config), /not owned/);
});

test("quote verification rejects wrong request, reversed lender, terms, rate, funding and child linkage", async () => {
  const changes = [
    (value: FixtureTx) => {value.events[0].ExercisedEvent.contractId = "another-open-request";},
    (value: FixtureTx) => {value.events[0].ExercisedEvent.choiceArgument = {dealer: borrower, rate: "0.07", validSeconds: "3600", cashCid: "available-bob"};},
    (value: FixtureTx) => {value.events[0].ExercisedEvent.actingParties = [other];},
    (value: FixtureTx) => {value.events[0].ExercisedEvent.exerciseResult = "another-quote";},
    (value: FixtureTx) => {value.events[0].ExercisedEvent.consuming = true;},
    (value: FixtureTx) => {value.events[5].CreatedEvent.createArgument = {...payload(), dealer: lender, rate: "0.08", cashCid: "reserved-bob", validUntil: "2026-10-10T01:05:00Z"};},
    (value: FixtureTx) => {value.events[5].CreatedEvent.nodeId = 9;},
    (value: FixtureTx) => {value.events[4].CreatedEvent.createArgument = {issuer: market.cashIssuer, owner: other, instrument: market.cashInstrument, amount: terms.cashAmount, lockParties: [borrower], viewers: []};},
    (value: FixtureTx) => {value.events[4].CreatedEvent.createArgument = {issuer: market.cashIssuer, owner: lender, instrument: market.cashInstrument, amount: "999", lockParties: [borrower], viewers: []};},
    (value: FixtureTx) => {value.events[3].ExercisedEvent.consuming = false;},
    (value: FixtureTx) => {value.events[4].CreatedEvent.createArgument = {issuer: market.cashIssuer, owner: lender, instrument: market.cashInstrument, amount: terms.cashAmount, lockParties: [], viewers: []};},
  ];
  for (const change of changes) {
    const {store, requestId} = await setup(), value = quoteTx(); change(value);
    await assert.rejects(run(store, lender, {op: "record-quote", requestId, updateId: value.updateId, quoteContractId: "quote-bob"}, fakeLedger([value])));
    assert.equal((await store.mine(market, borrower)).requests[0].quotes.length, 0);
  }
});

test("multiple independent quotes remain private; recording the same quote is idempotent", async () => {
  const {store, requestId} = await setup();
  for (const party of [lender, other]) {
    const value = quoteTx(party);
    await run(store, party, {op: "record-quote", requestId, updateId: value.updateId, quoteContractId: `quote-${party.split("::")[0]}`}, fakeLedger([value]));
  }
  const value = quoteTx();
  await run(store, lender, {op: "record-quote", requestId, updateId: value.updateId, quoteContractId: "quote-bob"}, fakeLedger([value]));
  assert.equal((await store.mine(market, borrower)).requests[0].quotes.length, 2);
  assert.equal((await store.mine(market, lender)).quotes.length, 1);
  assert.equal((await store.mine(market, other)).quotes.length, 1);
});

test("closure requires a verified consuming borrower withdrawal and blocks new quote contexts", async () => {
  const {store, requestId} = await setup();
  await assert.rejects(run(store, other, {op: "close", requestId, updateId: "close-update"}, fakeLedger([closeTx()])), /Only the borrower/);
  const wrong = closeTx(); wrong.events[0].ExercisedEvent.consuming = false;
  await assert.rejects(run(store, borrower, {op: "close", requestId, updateId: "close-update"}, fakeLedger([wrong])));
  assert.equal((await store.list(market)).length, 1);
  await run(store, borrower, {op: "close", requestId, updateId: "close-update"}, fakeLedger([closeTx()]));
  await run(store, borrower, {op: "close", requestId, updateId: "close-update"}, fakeLedger([closeTx()]));
  assert.equal((await store.list(market)).length, 0);
  await assert.rejects(view(store, lender, "quote", requestId), /closed/);
  const republished = await run(store, borrower, {op: "publish", terms, updateId: "publish-update", contractId: "open-request"}, fakeLedger([publishTx()], false)) as {request: OpenRfqRequest};
  assert.equal(republished.request.status, "closed");
});

test("late API reconciliation records a funded quote committed before closure, without reopening request", async () => {
  const {store, requestId} = await setup(), committed = quoteTx();
  await run(store, borrower, {op: "close", requestId, updateId: "close-update"}, fakeLedger([closeTx()]));
  await run(store, lender, {op: "record-quote", requestId, updateId: committed.updateId, quoteContractId: "quote-bob"}, fakeLedger([committed]));
  assert.equal((await store.get(market, requestId))!.status, "closed");
  assert.equal((await store.mine(market, borrower)).requests[0].quotes.length, 1);
  const after = quoteTx(other); after.recordTime = "2026-10-10T00:11:00.000Z";
  await assert.rejects(run(store, other, {op: "record-quote", requestId, updateId: after.updateId, quoteContractId: "quote-carol"}, fakeLedger([after])), /lifecycle/);
});

test("quotes cannot be replayed into another listing or recorded by another lender", async () => {
  const {store, requestId} = await setup(), value = quoteTx();
  const secondPub = publishTx(); secondPub.updateId = "second-publish"; secondPub.events[0].CreatedEvent.contractId = "second-open";
  const second = await run(store, borrower, {op: "publish", terms, updateId: secondPub.updateId, contractId: "second-open"}, fakeLedger([secondPub])) as {request: OpenRfqRequest};
  await assert.rejects(run(store, lender, {op: "record-quote", requestId: second.request.id, updateId: value.updateId, quoteContractId: "quote-bob"}, fakeLedger([value])), /did not exercise this open request/);
  await assert.rejects(run(store, other, {op: "record-quote", requestId, updateId: value.updateId, quoteContractId: "quote-bob"}, fakeLedger([value])), /different lender/);
});

test("unconfigured package, unsupported market and malformed fields fail closed", async () => {
  const store = memoryStore();
  await assert.rejects(openRfqOperation("GET", {market}, "", store, permission, fakeLedger([]), {...config, openRfqPackageId: null}), /not configured/);
  for (const bad of [{...market, oracle: other}, {...market, network: "testnet"}, {...market, cashInstrument: "USDCx"}]) await assert.rejects(openRfqOperation("GET", {market: bad}, "", store, permission, fakeLedger([]), config));
  await assert.rejects(run(store, borrower, {op: "publish", terms, updateId: "publish-update", contractId: "open-request", token: "private-token"}, fakeLedger([publishTx()])), /Invalid open request fields/);
});

test("provider errors include safe diagnostics without exposing tokens or financing payloads", async () => {
  const store = memoryStore();
  await assert.rejects(run(store, borrower, {op: "publish", terms, updateId: "publish-update", contractId: "open-request"}, async () => Response.json({code: "INVALID_ARGUMENT", cause: "Bearer secret cashAmount=1000"}, {status: 400})), error => {
    assert.ok(error instanceof OpenRfqError); assert.match(error.message, /HTTP 400 · INVALID_ARGUMENT/); assert.doesNotMatch(error.message, /Bearer|secret|cashAmount/); return true;
  });
});
