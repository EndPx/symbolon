import test from "node:test";
import assert from "node:assert/strict";
import { directoryOperation, requireOwnParty, DirectoryError, type DirectoryStore } from "../server/lender-registry.ts";
import { checkedLenderMarket, eligibleLenders, lenderMarketKey, type LenderMarket, type RegisteredLender } from "../src/ledger/lender-directory-model.ts";
import { sendRegisteredRequests } from "../src/app/registered-request.ts";
import type { Session } from "../src/ledger/session.ts";
import profile from "../public/deployment.json";

const operator = profile.publicDesk.operator;
const market: LenderMarket = {network: "devnet", synchronizerId: profile.synchronizerId, corePackageId: profile.corePackageId,
  oracle: operator, collateralIssuer: operator, collateralInstrument: "cBTC-demo", cashIssuer: operator, cashInstrument: "USDCx-demo"};
const lender = (party: string): RegisteredLender => ({party, name: party.split("::")[0], registeredAt: "2026-10-09T00:00:00Z"});
const body = (party = "bob::party", active = true) => ({market, party, name: "Lender B", active});
function memoryStore() {
  const entries = new Map<string, RegisteredLender>();
  const store: DirectoryStore = {async list(scope) {return [...entries.entries()].filter(([key]) => key.startsWith(lenderMarketKey(scope))).map(([,value]) => value);},
    async set(scope, party, name, active) {const key = lenderMarketKey(scope)+party; if (active) entries.set(key, {...lender(party), name}); else entries.delete(key);}};
  return store;
}
test("registration persists per exact issuer/oracle market and unregister affects only future recipient discovery", async () => {
  const store = memoryStore(), verify = async () => {};
  await directoryOperation("POST", body(), "Bearer verified", store, verify);
  await directoryOperation("POST", {...body("carol::party"), name: "Lender C"}, "Bearer verified", store, verify);
  const result = await directoryOperation("GET", market, "", store, verify);
  assert.equal("lenders" in result && result.lenders.length, 2);
  const other = await directoryOperation("GET", {...market, cashIssuer: "different::issuer"}, "", store, verify);
  assert.equal("lenders" in other && other.lenders.length, 0);
  const quotes = [{party: "bob::party", rate: "0.07"}];
  await directoryOperation("POST", body("bob::party", false), "Bearer verified", store, verify);
  const after = await directoryOperation("GET", market, "", store, verify);
  assert.deepEqual("lenders" in after && after.lenders.map(item => item.party), ["carol::party"]);
  assert.equal(quotes.length, 1);
});
test("anonymous or unauthorized registrations cannot write to the directory", async () => {
  const store = memoryStore();
  await assert.rejects(directoryOperation("POST", body(), "", store), error => error instanceof DirectoryError && error.status === 401);
  await assert.rejects(directoryOperation("POST", body(), "Bearer rejected", store, async () => {throw new DirectoryError(403, "not owned");}));
  assert.equal((await store.list(market)).length, 0);
});
test("registrations reject deployment mismatch and unexpected fields before checking authority", async () => {
  const store = memoryStore(); let verified = false;
  const verify = async () => {verified = true;};
  for (const input of [{...body(), market: {...market, network: "mainnet"}}, {...body(), market: {...market, corePackageId: "b".repeat(64)}}, {...body(), token: "secret"}, {...body(), party: "short-name"}]) {
    await assert.rejects(directoryOperation("POST", input, "Bearer token", store, verify));
  }
  assert.equal(verified, false);
});
const token = (claims = {}) => `header.${Buffer.from(JSON.stringify({sub: "user-123", iss: "https://keycloak.naas.noders.services/realms/noders-appsfactory", exp: Math.floor(Date.now()/1000)+600, ...claims})).toString("base64url")}.signature`;
test("decoded token claims alone never authenticate a lender", async () => {
  let calls = 0;
  await assert.rejects(requireOwnParty(token(), "bob::party", async () => {calls++; return new Response("", {status: 401});}), error => error instanceof DirectoryError && error.status === 401);
  assert.equal(calls, 1);
  await assert.rejects(requireOwnParty(token({iss: "https://attacker.test"}), "bob::party", async () => {throw new Error("must not forward");}));
});
test("participant-verified live CanActAs rights are required; read-only and foreign parties cannot register", async () => {
  const own = "bob::party";
  const request = async (url: string | URL | Request) => {
    assert.match(String(url), /^https:\/\/ledger-api-json\.participant\.hackcanton-01\.devnet\.naas\.noders\.services\/v2\/users\/user-123/);
    return Response.json(String(url).endsWith("/rights") ? {rights: [{kind: {CanActAs: {value: {party: own}}}}, {kind: {CanReadAs: {value: {party: "read::only"}}}}]} : {user: {id: "user-123", isDeactivated: false}});
  };
  await requireOwnParty(token(), own, request);
  await assert.rejects(requireOwnParty(token(), "read::only", request));
  await assert.rejects(requireOwnParty(token(), "carol::party", request));
  await assert.rejects(requireOwnParty(token({exp: 0}), own, request));
});
test("eligibility excludes the borrower and deduplicates actual registrations", () => {
  assert.deepEqual(eligibleLenders([lender("bob::party"), lender("alice::party"), lender("bob::party"), lender("carol::party")], "alice::party").map(item => item.party), ["bob::party", "carol::party"]);
  assert.notEqual(lenderMarketKey(market), lenderMarketKey({...market, oracle: "different::oracle"}));
  assert.throws(() => checkedLenderMarket({...market, quote: "private"}));
});
const terms = {oracle: market.oracle, collateralIssuer: market.collateralIssuer, collateralInstrument: market.collateralInstrument, collateralAmount: 0.025,
  cashIssuer: market.cashIssuer, cashInstrument: market.cashInstrument, cashAmount: 1000, termDays: 30, marginThresholdPct: 1.05, cureSeconds: 3600, maxPriceAgeSeconds: 3600};
test("broadcast creates one RFQ for B and C and never creates or requests an automatic offer", async () => {
  const commands: unknown[][] = [];
  const session: Session = {kind: "account", party: "alice::party", label: "A", read: async () => {throw new Error("no post-request automation");}, submit: async batch => {commands.push(batch); return "request-update";}, disconnect: async () => {}};
  const recipients = [lender("bob::party"), lender("carol::party")];
  assert.equal(await sendRegisteredRequests(session, terms, market, recipients, true, async () => recipients), "request-update");
  assert.equal(commands.length, 1);
  const sent = commands[0] as Array<{CreateCommand: {templateId: string; createArguments: {borrower: string; dealer: string}}}>;
  assert.equal(sent.length, 2);
  for (const command of sent) assert.match(JSON.stringify(command), /Symbolon\.Repo:QuoteRequest/);
  assert.doesNotMatch(JSON.stringify(sent), /RequestFundedQuote|SubmitQuote|AcceptQuote|ClaimDevnetAssets|rate/);
  assert.match(JSON.stringify(sent), /bob::party/);
  assert.match(JSON.stringify(sent), /carol::party/);
});
test("no consent, changed recipients, unavailable registry or a changed market submits nothing", async () => {
  let submitted = 0;
  const session: Session = {kind: "account", party: "alice::party", label: "A", read: async () => [], submit: async () => {submitted++; return "bad";}, disconnect: async () => {}};
  const recipients = [lender("bob::party")];
  await assert.rejects(sendRegisteredRequests(session, terms, market, recipients, false, async () => recipients));
  await assert.rejects(sendRegisteredRequests(session, terms, market, recipients, true, async () => [...recipients, lender("carol::party")]));
  await assert.rejects(sendRegisteredRequests(session, terms, market, recipients, true, async () => {throw new Error("unavailable");}));
  await assert.rejects(sendRegisteredRequests(session, {...terms, cashIssuer: "different::issuer"}, market, recipients, true, async () => recipients));
  await assert.rejects(sendRegisteredRequests(session, terms, market, [], true, async () => recipients));
  assert.equal(submitted, 0);
});
