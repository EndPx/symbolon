import test from "node:test";
import assert from "node:assert/strict";
import { CAURI_DEVNET, cauriReadinessProfile, createStagedCauriAdapter } from "../src/ledger/cauri-profile.ts";
import { defaultDeployment } from "../src/ledger/deployment.ts";

const d = { ...defaultDeployment, corePackageId: "a".repeat(64), publicPackageId: "b".repeat(64), synchronizerId: "global::devnet",
  publicDesk: { operator: "operator::a", contractId: "public-desk", createdEventBlob: "blob", label: "Symbolon", referencePrice: "60000", rate: "0.052", maxPrincipal: "10000" } };
test("the staged Cauri profile targets official DevNet hosts and the deployed package/synchronizer identities", () => {
  const profile = cauriReadinessProfile(d);
  assert.equal(profile.apiBase, "https://api.devnet.cauri.cc");
  assert.equal(profile.walletUiBase, "https://devnet.cauri.cc");
  assert.deepEqual(profile.requiredPackages, [d.corePackageId, d.publicPackageId]);
  assert.equal(profile.synchronizerId, d.synchronizerId);
  assert.equal(profile.nativeSubmissionMethod, "prepareExecuteAndWait");
  assert.equal(Object.isFrozen(CAURI_DEVNET), true);
});
test("MainNet, wrong wallet network and missing deployment identities cannot start the staged rehearsal", () => {
  for (const changes of [{ network: "mainnet" as const }, { network: "localnet" as const }, { walletNetwork: "testnet" }, { corePackageId: null }, { publicPackageId: null }, { synchronizerId: null }, { publicDesk: null }, { publicDesk: { ...d.publicDesk, contractId: "" } }]) {
    assert.throws(() => createStagedCauriAdapter({ ...d, ...changes }));
  }
});
test("the official adapter is constructed without connecting, signing, or opening a wallet popup", () => {
  const adapter = createStagedCauriAdapter(d);
  assert.equal(adapter.providerId, "cauri");
  assert.equal(adapter.getInfo().url, "https://devnet.cauri.cc");
  assert.equal(adapter.type, "remote");
});
