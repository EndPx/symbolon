import test from "node:test";
import assert from "node:assert/strict";
import { consoleBalanceTokens, readBoundWalletBalances } from "../src/ledger/wallet-balances.ts";

const token = { id: "CC-dev", symbol: "CC", name: "Canton Coin", balance: "9007199254740993.1234567890", network: "CANTON_NETWORK_DEV" };
test("wallet balances retain exact decimals and separate IDs even for matching symbols", () => {
  const rows = consoleBalanceTokens({ tokens: [token, { ...token, id: "other-CC-dev" }] }, "devnet");
  assert.equal(rows[0].balance, token.balance);
  assert.equal(rows.length, 2);
  assert.deepEqual(consoleBalanceTokens({ tokens: [] }, "devnet"), []);
});
test("missing, different-network, duplicate and malformed responses are errors, never zero balances", () => {
  for (const response of [null, {}, { tokens: [{ ...token, network: "CANTON_NETWORK" }] }, { tokens: [token, token] }, { tokens: [{ ...token, balance: "1e3" }] }, { tokens: [{ ...token, balance: 100 }] }]) {
    assert.throws(() => consoleBalanceTokens(response, "devnet"));
  }
});
test("balance read verifies the current party/network on both sides of the provider response", async () => {
  let checks = 0;
  const snapshot = await readBoundWalletBalances({ party: "alice::a", network: "devnet" }, async () => { checks++; }, async () => ({ tokens: [token] }));
  assert.equal(checks, 2);
  assert.equal(snapshot.party, "alice::a");
  assert.equal(snapshot.network, "devnet");
  assert.equal(snapshot.balances[0].balance, token.balance);
});
test("a party/network switch during the read discards its completed old balance response", async () => {
  let checks = 0;
  await assert.rejects(readBoundWalletBalances({ party: "alice::a", network: "devnet" }, async () => {
    if (++checks === 2) throw new Error("Identity changed");
  }, async () => ({ tokens: [token] })), /Identity changed/);
});
test("a rejected provider balance request is not retried or shown as a zero", async () => {
  let requests = 0;
  await assert.rejects(readBoundWalletBalances({ party: "alice::a", network: "devnet" }, async () => {}, async () => {
    requests++; throw new Error("Wallet unavailable");
  }), /Wallet unavailable/);
  assert.equal(requests, 1);
});
