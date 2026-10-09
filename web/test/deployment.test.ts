import test from "node:test";
import assert from "node:assert/strict";
import { defaultDeployment, networkLabel, parseDeployment, tradingBlocker } from "../src/ledger/deployment.ts";
const hash = "a".repeat(64);
test("TestNet connection profile never enables financing by copying DevNet settings", () => {
  const profile = parseDeployment({ ...structuredClone(defaultDeployment), network: "testnet", walletNetwork: "canton:testnet" });
  assert.equal(networkLabel(profile.network), "TestNet");
  assert.match(tradingBlocker("canton:testnet", profile)!, /TestNet financing is not enabled/);
  assert.match(tradingBlocker("testnet", { ...profile, ...complete(), network: "testnet", walletNetwork: "testnet" })!, /TestNet financing is not enabled/);
  assert.match(tradingBlocker("devnet", profile)!, /uses testnet/);
  assert.throws(() => parseDeployment({ ...profile, walletNetwork: "devnet" }));
});
const complete = () => ({ ...structuredClone(defaultDeployment), tradingEnabled: true,
  participant: "https://participant.example.org", synchronizerId: "sync::123", corePackageId: hash,
  releaseEvidence: "https://example.org/devnet-proof",
  assets: {
    collateral: { symbol: "cBTC", admin: "issuer::123", adapter: "demo-holding" as const, packageIds: [hash] },
    cash: { symbol: "USDCx", admin: "issuer::123", adapter: "demo-holding" as const, packageIds: [hash] },
  },
});
test("network switch requires a matching wallet and verified deployment identity", () => {
  const devnet = parseDeployment(complete());
  assert.equal(tradingBlocker("canton:da-devnet", devnet), null);
  assert.match(tradingBlocker("mainnet", devnet)!, /uses devnet/);
  for (const field of ["participant", "synchronizerId", "corePackageId", "releaseEvidence"] as const) {
    assert.match(tradingBlocker("devnet", { ...devnet, [field]: null })!, /pinned package/);
  }
});
test("configuration cannot promote simulated holdings to MainNet or invent a token adapter", () => {
  const mainnet = { ...complete(), network: "mainnet" as const, walletNetwork: "mainnet" };
  assert.match(tradingBlocker("mainnet", parseDeployment(mainnet))!, /demo holdings cannot settle real/);
  mainnet.assets.cash.adapter = "cip56" as any;
  assert.match(tradingBlocker("mainnet", parseDeployment(mainnet))!, /not implemented/);
});
test("deployment parsing rejects wrong network, unsafe endpoints, package hashes and asset identity", () => {
  for (const change of [
    { walletNetwork: "mainnet" }, { corePackageId: "#symbolon" },
    { participant: "http://participant.example.org" }, { participant: "https://user:password@participant.example.org" },
    { participant: "https://participant.example.org?token=secret" }, { tradingEnabled: "yes" },
    { assets: { cash: { symbol: "USDCx", admin: null, adapter: "cip56", packageIds: [] } } },
    { assets: { ...complete().assets, secret: { token: "must-not-be-public" } } },
  ]) assert.throws(() => parseDeployment({ ...complete(), ...change }));
});
test("an unavailable runtime configuration disables remote signing by default", () => {
  assert.match(tradingBlocker("devnet", defaultDeployment)!, /disabled/);
  assert.match(tradingBlocker("mainnet", defaultDeployment)!, /uses devnet/);
});
test("LocalNet stays a separate simulation profile and cannot authorize remote signing", () => {
  const localnet = parseDeployment({ ...complete(), network: "localnet", walletNetwork: "localnet", participant: null, tradingEnabled: false });
  assert.equal(networkLabel(localnet.network), "LocalNet");
  for (const network of ["localnet", "devnet", "mainnet", "canton:da-devnet"]) {
    assert.match(tradingBlocker(network, localnet)!, /Remote wallet and hosted-account signing are disabled/);
  }
  for (const change of [{ participant: "https://remote.example" }, { tradingEnabled: true }, { walletNetwork: "devnet" },
    { assets: { ...localnet.assets, cash: { ...localnet.assets.cash, adapter: "cip56" } } }]) {
    assert.throws(() => parseDeployment({ ...localnet, ...change }));
  }
});
