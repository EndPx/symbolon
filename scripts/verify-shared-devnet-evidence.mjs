/** Read-only consistency checks for retained receipts; this does not contact a ledger. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { committedTransaction, PACKAGES, reviewedOrigin } from "./lib/shared-devnet.mjs";

const file = process.argv[2] ?? "docs/submission/evidence/shared-devnet.json";
const raw = await readFile(file, "utf8");
const proof = JSON.parse(raw);
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
let sourceManifest;
try {
  sourceManifest = JSON.parse(await readFile(path.join(path.dirname(file), "shared-devnet-sources.json"), "utf8"));
  assert.equal(sourceManifest.normalization, "CRLF to LF only");
  assert.equal(sourceManifest.evidenceLfSha256, hash(raw.replaceAll("\r\n", "\n")));
} catch (error) { if (error.code !== "ENOENT") throw error; }
assert.equal(proof.result, "passed");
reviewedOrigin(proof.endpoint);
assert.deepEqual(proof.packages, PACKAGES);
assert.equal(proof.walletInvolved, false);
assert.equal(proof.decentralizedPartyDeployment, false);
assert.equal(proof.decmanServiceUsed, false);
assert.ok(proof.ledgerOffsetAfter > proof.ledgerOffsetBefore);
assert.ok(Date.parse(proof.completedAt) > Date.parse(proof.capturedAt));
assert.ok(!/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(raw), "JWT in evidence");
assert.ok(!/"(?:access_token|refresh_token|password)"\s*:/i.test(raw), "Credential field in evidence");
assert.ok(!/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(raw), "Contact email in evidence");

const commits = proof.steps.filter(step => step.status === "committed");
const failures = proof.steps.filter(step => step.status !== "committed");
assert.equal(commits.length, 20);
assert.equal(failures.length, 1);
assert.match(failures[0].label, /one confirmation must fail/);
assert.match(failures[0].error, /DAML_FAILURE/);
assert.match(failures[0].error, /Enough confirmations to execute action/);
assert.equal(proof.oneConfirmationRejected, true);
const ids = new Set();
let previousOffset = proof.ledgerOffsetBefore;
for (const step of commits) {
  const tx = committedTransaction({ transaction: step.transaction }, step.commandId, proof.synchronizerId);
  assert.ok(!ids.has(tx.updateId), "Duplicate receipt");
  ids.add(tx.updateId);
  assert.ok(tx.offset > previousOffset && tx.offset <= proof.ledgerOffsetAfter);
  previousOffset = tx.offset;
}

const snapshot = label => {
  const values = proof.snapshots.filter(value => value.label === label);
  assert.equal(values.length, 1);
  return values[0];
};
const units = value => {
  assert.match(value, /^\d+(?:\.\d{1,10})?$/);
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole + fraction.padEnd(10, "0"));
};
for (const [label, price, factor, status, collateral] of [
  ["Before governed mark", 60000, 1500 / 1050, "Active", "0.0250000000"],
  ["After governed mark", 36000, 900 / 1050, "Active", "0.0250000000"],
  ["Margin call", 36000, 900 / 1050, "UnderCall", "0.0250000000"],
  ["Margin restored", 36000, 1080 / 1050, "Active", "0.0300000000"],
]) {
  const state = snapshot(label);
  assert.equal(state.state.positions.length, 1);
  assert.equal(Number(state.state.feeds[0].payload.price), price);
  assert.ok(Math.abs(state.health[0].factor - factor) < 1e-12);
  const position = state.state.positions[0].payload;
  assert.equal(position.status.tag, status);
  assert.equal(position.collateralAmount, collateral);
  assert.equal(position.repurchasePrice, "1004.3333333333");
  assert.equal(position.rate, "0.0520000000");
}
const final = snapshot("Repurchased").state;
assert.equal(final.positions.length, 0);
assert.equal(final.closed.length, 1);
assert.equal(final.closed[0].payload.outcome, "Repurchased");
assert.equal(final.closed[0].contractId, proof.closedRepo.contractId);
assert.equal(final.closed[0].payload.repurchasePrice, "1004.3333333333");
for (const [instrument, expected] of [["cBTC-demo", "0.1000000000"], ["USDCx-demo", "1995.6666666667"]]) {
  const holdings = final.holdings.filter(value => value.payload.instrument === instrument);
  assert.equal(holdings.reduce((total, value) => total + units(value.payload.amount), 0n), units(expected));
  assert.ok(holdings.every(value => value.payload.lockParties.length === 0), "Collateral/cash remains locked");
}
for (const [source, expected] of Object.entries(proof.sourceFilesSha256)) {
  assert.match(source, /^(scripts|web\/src)\/[A-Za-z0-9/.-]+$/);
  assert.ok(!source.includes(".."));
  const content = await readFile(source, "utf8");
  if (hash(content) !== expected) {
    assert.equal(sourceManifest?.sources[source]?.recordedSha256, expected, `Missing captured-source manifest: ${source}`);
    assert.equal(hash(content.replaceAll("\r\n", "\n")), sourceManifest.sources[source].lfSha256, `Source changed: ${source}`);
  }
}
console.log("Retained evidence verified: 20 committed receipts, threshold rejection, margin/top-up, Repurchased, returned collateral and matching source hashes.");
console.log("This is an offline consistency check. Authorized ledger reads or retained operator logs provide external corroboration.");
