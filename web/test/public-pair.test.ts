import test from "node:test";
import assert from "node:assert/strict";
import { marketDiscoveryRows, publishedPair } from "../src/app/public-pair.ts";
import { defaultDeployment, walletConnectionError, tradingBlocker, type Deployment } from "../src/ledger/deployment.ts";

const d: Deployment = { ...defaultDeployment, publicDesk: { operator: "operator::a", contractId: "desk", createdEventBlob: "blob", label: "Symbolon", rate: "0.052", referencePrice: "60000", maxPrincipal: "10000" }, assets: {
  collateral: { symbol: "cBTC-demo", admin: "operator::a", adapter: "demo-holding", packageIds: [] },
  cash: { symbol: "USDCx-demo", admin: "operator::a", adapter: "demo-holding", packageIds: [] },
} };
test("a newly connected party with no visible feed still discovers the published pair", () => {
  const rows = marketDiscoveryRows([], d);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].contractId, "public-reference");
  assert.equal(rows[0].payload.asOf, "");
  assert.deepEqual(rows[0].payload.readers, []);
});
test("an authorized matching feed replaces the reference without creating a duplicate", () => {
  const feed = { ...publishedPair(d)!, contractId: "authorized-feed", payload: { ...publishedPair(d)!.payload, asOf: "2026-10-08T12:00:00Z", readers: ["alice::a"] } };
  assert.deepEqual(marketDiscoveryRows([feed], d), [feed]);
});
test("a private different-oracle or different-issuer feed cannot hide the public pair", () => {
  for (const change of [{ oracle: "other::a" }, { instrumentIssuer: "other::a" }, { cashIssuer: "other::a" }]) {
    const feed = { ...publishedPair(d)!, contractId: "private-feed", payload: { ...publishedPair(d)!.payload, ...change } };
    const rows = marketDiscoveryRows([feed], d);
    assert.equal(rows.length, 2);
    assert.equal(rows[1], feed);
  }
});
test("DevNet policy metadata cannot advertise a MainNet or LocalNet market", () => {
  assert.deepEqual(marketDiscoveryRows([], { ...d, network: "mainnet" }), []);
  assert.deepEqual(marketDiscoveryRows([], { ...d, network: "localnet" }), []);
  assert.deepEqual(marketDiscoveryRows([], { ...d, publicDesk: null }), []);
});
test("a TestNet wallet receives an actionable DevNet mismatch and cannot trade", () => {
  assert.equal(walletConnectionError({ actual: "canton:testnet", expected: "canton:da-devnet" }), "Your wallet is on Canton TestNet. Symbolon is on Canton DevNet. Switch the wallet to DevNet, then reconnect.");
  assert.match(tradingBlocker("canton:testnet", d)!, /Connect a wallet on that network/);
});
