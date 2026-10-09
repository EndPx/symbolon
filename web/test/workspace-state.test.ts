import test from "node:test";
import assert from "node:assert/strict";
import {
  createBorrowDraftScope, readBorrowDraft, writeBorrowDraft, clearBorrowDraft,
  readTradeSide, writeTradeSide, readLastBorrowMarket, WORKSPACE_RETENTION_MS,
  type BorrowDraft, type BorrowDraftScope, type WorkspaceStorage,
} from "../src/app/workspace-state.ts";
import { defaultDeployment, type Deployment } from "../src/ledger/deployment.ts";

function storage() {
  const data = new Map<string, string>();
  const store: WorkspaceStorage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: key => { data.delete(key); },
  };
  return { data, store };
}
const connection = { kind: "account" as const, party: "alice::party", networkId: "devnet" };
const d: Deployment = {
  ...defaultDeployment, participant: "https://ledger.example", synchronizerId: "sync::one", corePackageId: "a".repeat(64),
  publicPackageId: "b".repeat(64),
  publicDesk: { contractId: "public-desk-one", createdEventBlob: "private-event-blob", operator: "dealer::one",
    label: "Test desk", referencePrice: "100000", rate: "0.04", maxPrincipal: "10000" },
};
const market = { oracle: "oracle::one", instrumentIssuer: "issuer::one", instrument: "cBTC-demo",
  cashIssuer: "issuer::one", cashInstrument: "USDCx-demo" };
const scope = createBorrowDraftScope(connection, d, market)!;
const draft: BorrowDraft = { amount: "1200.01", cushion: "150", term: "30", threshold: "105", cure: "60", maxAge: "60" };
const now = 1000;

test("reconnect restores the latest edited market only from currently authorized same-scope feeds",()=>{
  const {store}=storage(), second={...market,oracle:"oracle::two"};
  writeBorrowDraft(scope,draft,store,now);
  writeBorrowDraft(createBorrowDraftScope(connection,d,second),{...draft,amount:"100"},store,now+1);
  assert.equal(readLastBorrowMarket(connection,d,[market,second],store,now+2),second);
  assert.equal(readLastBorrowMarket(connection,d,[market],store,now+2),market);
  assert.equal(readLastBorrowMarket(connection,d,[],store,now+2),null);
  assert.equal(readLastBorrowMarket({...connection,party:"bob::party"},d,[market,second],store,now+2),null);
  assert.equal(readLastBorrowMarket(connection,{...d,corePackageId:"different"},[market,second],store,now+2),null);
  assert.equal(readLastBorrowMarket({...connection,networkId:"mainnet"},d,[market,second],store,now+2),null);
});

test("Borrow/Lend persists as a tab preference across navigation and OAuth without selecting a signer", () => {
  const { data, store } = storage();
  writeTradeSide("lend", store, now);
  assert.equal(readTradeSide(store, now + 1), "lend");
  assert.deepEqual(connection, { kind: "account", party: "alice::party", networkId: "devnet" });
  assert.deepEqual(JSON.parse([...data.values()][0]), { version: 1, side: "lend", savedAt: now });
  assert.equal(readTradeSide(storage().store, now), null, "An unrelated tab store has no preference");
  assert.equal(readTradeSide(), null, "Node/SSR must never fall back to persistent localStorage");
});

test("draft inputs recover only within the current party, network, deployment and exact market identity", () => {
  const { store } = storage();
  writeBorrowDraft(scope, draft, store, now);
  assert.deepEqual(readBorrowDraft(createBorrowDraftScope({ ...connection }, { ...d }, { ...market }), store, now + 1), draft);
  const foreignScopes = [
    createBorrowDraftScope({ ...connection, party: "bob::party" }, d, market),
    createBorrowDraftScope({ ...connection, networkId: "mainnet" }, { ...d, network: "mainnet", walletNetwork: "mainnet" }, market),
    ...["participant", "synchronizerId", "corePackageId", "publicPackageId", "releaseEvidence"].map(field =>
      createBorrowDraftScope(connection, { ...d, [field]: "different" }, market)),
    createBorrowDraftScope(connection, { ...d, publicDesk: { ...d.publicDesk!, contractId: "new-desk" } }, market),
    createBorrowDraftScope(connection, { ...d, assets: { ...d.assets, cash: { ...d.assets.cash, admin: "issuer::two" } } }, market),
    ...Object.keys(market).map(field => createBorrowDraftScope(connection, d, { ...market, [field]: "different" })),
  ];
  for (const other of foreignScopes) {
    assert.ok(other);
    assert.equal(readBorrowDraft(other, store, now + 1), null);
  }
  assert.deepEqual(readBorrowDraft(scope, store, now + 1), draft, "Foreign-scope reads do not erase this party's draft");
});

test("structured identity tuples avoid delimiter collisions and normalize known network aliases", () => {
  const one = createBorrowDraftScope(connection, d, { ...market, oracle: "oracle::one|issuer::one", instrumentIssuer: "issuer::two" });
  const two = createBorrowDraftScope(connection, d, { ...market, oracle: "oracle::one", instrumentIssuer: "issuer::one|issuer::two" });
  assert.notEqual(one?.market, two?.market);
  assert.deepEqual(createBorrowDraftScope({ ...connection, networkId: "canton:da-devnet" }, d, market), scope);
});

test("browsing, missing party/network and a wrong-network connection cannot recover authenticated drafts", () => {
  const { store } = storage();
  writeBorrowDraft(scope, draft, store, now);
  assert.equal(createBorrowDraftScope({ ...connection, kind: "browse" }, d, market), null);
  assert.equal(createBorrowDraftScope({ ...connection, party: "" }, d, market), null);
  assert.equal(createBorrowDraftScope({ ...connection, networkId: undefined }, d, market), null);
  assert.equal(createBorrowDraftScope({ ...connection, networkId: "mainnet" }, d, market), null);
  assert.equal(createBorrowDraftScope(connection, d, { ...market, oracle: "" }), null);
  assert.equal(readBorrowDraft(null, store, now), null);
  writeBorrowDraft(null, draft, store, now);
  assert.deepEqual(readBorrowDraft(scope, store, now), draft);
});

test("recovery stores whitelisted user inputs and public identities without ledger data, grants or review authority", () => {
  const { data, store } = storage();
  const values = { ...draft, dealersText: "  Lender Two | dealer::two\r\n  dealer::three  ",
    access_token: "secret-token", refresh_token: "refresh-token", holdings: [{ amount: 9999 }],
    createdEventBlob: "borrowed-blob", grants: ["bob::party"], review: true, prepared: market, signer: "bob::party" };
  writeBorrowDraft(scope, values, store, now);
  const expected = { ...draft, dealersText: values.dealersText };
  assert.deepEqual(readBorrowDraft(scope, store, now + 1), expected);
  const saved = [...data.values()][0];
  for (const forbidden of ["secret-token", "refresh-token", "private-event-blob", "borrowed-blob", "holdings", "grants", "review", "prepared", "signer"])
    assert.equal(saved.includes(forbidden), false, `Must not persist ${forbidden}`);
  assert.equal(readBorrowDraft({ ...scope, party: "bob::party" }, store, now), null);
});

test("optional counterparty text keeps exact draft formatting but is bounded", () => {
  const { store } = storage();
  const text = " Lender A | lender-a::one\r\nLender B | lender-b::two ";
  writeBorrowDraft(scope, { ...draft, dealersText: text }, store, now);
  assert.equal(readBorrowDraft(scope, store, now)?.dealersText, text);
  for (const dealersText of ["a".repeat(4097), Array(17).fill("dealer::one").join("\n"), "dealer::one\0"]) {
    writeBorrowDraft(scope, { ...draft, dealersText: text }, store, now);
    writeBorrowDraft(scope, { ...draft, dealersText }, store, now);
    assert.equal(readBorrowDraft(scope, store, now), null);
  }
});

test("numeric drafts preserve safe empty/decimal input and reject unbounded or malformed values", () => {
  const { store } = storage();
  const partial = { ...draft, amount: "", cushion: "150.00", threshold: "0", cure: ".5" };
  writeBorrowDraft(scope, partial, store, now);
  assert.deepEqual(readBorrowDraft(scope, store, now), partial, "Draft recovery does not imply valid financing terms");
  for (const invalid of [
    { amount: "Infinity" }, { amount: "NaN" }, { amount: "-1" }, { amount: "1e3" }, { amount: " 100 " },
    { amount: "1000000000001" }, { amount: "1000000000000.0000000001" }, { amount: "0.12345678901" }, { amount: "1".repeat(33) },
    { term: "1.5" }, { term: "366" }, { threshold: "201" }, { cushion: "10001" }, { cure: "10081" }, { maxAge: "1441" },
  ]) {
    writeBorrowDraft(scope, draft, store, now);
    writeBorrowDraft(scope, { ...draft, ...invalid }, store, now + 1);
    assert.equal(readBorrowDraft(scope, store, now + 2), null, `Reject ${JSON.stringify(invalid)} and remove the older draft`);
  }
});

test("expired and future-dated preferences and drafts are removed without extending retention on reads", () => {
  const { data, store } = storage();
  writeTradeSide("borrow", store, now);
  writeBorrowDraft(scope, draft, store, now);
  assert.equal(readTradeSide(store, now + WORKSPACE_RETENTION_MS - 1), "borrow");
  assert.deepEqual(readBorrowDraft(scope, store, now + WORKSPACE_RETENTION_MS - 1), draft);
  assert.equal(readTradeSide(store, now + WORKSPACE_RETENTION_MS), null);
  assert.equal(readBorrowDraft(scope, store, now + WORKSPACE_RETENTION_MS), null);
  assert.equal(data.size, 0);
  writeTradeSide("borrow", store, now + 1);
  writeBorrowDraft(scope, draft, store, now + 1);
  assert.equal(readTradeSide(store, now), null);
  assert.equal(readBorrowDraft(scope, store, now), null);
  assert.equal(data.size, 0);
});

test("malformed, oversized, unknown-version and authority-bearing stored payloads fail closed", () => {
  for (const bad of ["{", "null", "[]", "x".repeat(32769), JSON.stringify({ version: 2, entries: [] }),
    JSON.stringify({ version: 1, entries: "wrong" }), JSON.stringify({ version: 1, entries: Array(7).fill(null) })]) {
    const { data, store } = storage();
    writeBorrowDraft(scope, draft, store, now);
    const key = [...data.keys()][0];
    data.set(key, bad);
    assert.equal(readBorrowDraft(scope, store, now), null);
    assert.equal(data.size, 0);
  }
  for (const bad of [
    { scope: { ...scope, grants: ["alice::party"] }, draft, savedAt: now },
    { scope, draft: { ...draft, signer: "bob::party" }, savedAt: now },
    { scope, draft, savedAt: now, review: true },
    { scope, draft: { ...draft, term: null }, savedAt: now },
    { scope, draft, savedAt: "1000" },
  ]) {
    const { data, store } = storage();
    writeBorrowDraft(scope, draft, store, now);
    data.set([...data.keys()][0], JSON.stringify({ version: 1, entries: [bad] }));
    assert.equal(readBorrowDraft(scope, store, now), null);
    assert.equal(data.size, 0);
  }
});

test("malformed and unknown trade sides are removed", () => {
  for (const bad of ["{", JSON.stringify({ version: 1, side: "admin", savedAt: now }),
    JSON.stringify({ version: 2, side: "borrow", savedAt: now }),
    JSON.stringify({ version: 1, side: "borrow", savedAt: now, party: "bob::party" })]) {
    const { data, store } = storage();
    writeTradeSide("lend", store, now);
    data.set([...data.keys()][0], bad);
    assert.equal(readTradeSide(store, now), null);
    assert.equal(data.size, 0);
  }
});

test("draft retention caps six scopes, evicts the least recently edited and clears only the requested draft", () => {
  const { data, store } = storage();
  const scopes: BorrowDraftScope[] = Array.from({ length: 7 }, (_, i) => ({ ...scope, market: `${scope.market}:${i}` }));
  for (const [i, current] of scopes.entries()) writeBorrowDraft(current, draft, store, now + i);
  assert.equal(readBorrowDraft(scopes[0], store, now + 7), null);
  assert.deepEqual(readBorrowDraft(scopes[1], store, now + 7), draft);
  const payload = JSON.parse([...data.values()][0]);
  assert.equal(payload.entries.length, 6);
  assert.ok([...data.values()][0].length <= 32768);
  clearBorrowDraft(scopes[1], store, now + 7);
  assert.equal(readBorrowDraft(scopes[1], store, now + 7), null);
  assert.deepEqual(readBorrowDraft(scopes[2], store, now + 7), draft);
});

test("disabled or full browser storage cannot break the form or the connection", () => {
  const blocked: WorkspaceStorage = {
    getItem() { throw new Error("Storage denied"); }, setItem() { throw new Error("Storage full"); }, removeItem() { throw new Error("Storage denied"); },
  };
  assert.doesNotThrow(() => writeTradeSide("lend", blocked, now));
  assert.equal(readTradeSide(blocked, now), null);
  assert.doesNotThrow(() => writeBorrowDraft(scope, draft, blocked, now));
  assert.equal(readBorrowDraft(scope, blocked, now), null);
  assert.doesNotThrow(() => clearBorrowDraft(scope, blocked, now));
});
