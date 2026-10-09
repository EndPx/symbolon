import { readFile, copyFile } from "node:fs/promises";
import assert from "node:assert/strict";

const source = new URL("../public/deployment.testnet.json", import.meta.url);
const profile = JSON.parse(await readFile(source, "utf8"));
assert.equal(profile.network, "testnet");
assert.equal(profile.walletNetwork, "testnet");
assert.equal(profile.tradingEnabled, false);
for (const field of ["participant", "synchronizerId", "corePackageId", "releaseEvidence"]) assert.equal(profile[field], null);
assert.equal(profile.publicDesk, undefined);
assert.equal(profile.publicPackageId, undefined);
await copyFile(source, new URL("../dist/deployment.json", import.meta.url));
console.log("TestNet connection profile selected. Financing remains disabled.");
