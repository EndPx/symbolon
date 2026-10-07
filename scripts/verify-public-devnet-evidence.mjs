/** Offline inspection of the receipt exported by the actual browser UI.
 * This does not connect to the participant or claim independent corroboration.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const receipt=JSON.parse(await readFile(new URL("../docs/submission/evidence/public-devnet-repurchase.json",import.meta.url),"utf8"));
const deployment=JSON.parse(await readFile(new URL("../config/deployments/devnet.json",import.meta.url),"utf8"));
assert.equal(receipt.offset,2324835);
assert.equal(receipt.updateId,"1220b616db5e7faf6bb71b6dad93967c42d1f055a30cef4564d77d8a1c59356e2137");
assert.equal(receipt.commandId,"symbolon-public-c3fad475-25b8-462c-bbae-37a018df8e72");
assert.equal(receipt.synchronizerId,deployment.synchronizerId);
assert.ok(Number.isFinite(Date.parse(receipt.recordTime)));
const created=receipt.events.flatMap(e=>e.CreatedEvent?[e.CreatedEvent]:[]);
const exercised=receipt.events.flatMap(e=>e.ExercisedEvent?[e.ExercisedEvent]:[]);
const closed=created.find(e=>e.templateId===`${deployment.corePackageId}:Symbolon.Repo:ClosedRepo`);
assert.ok(closed);
const p=closed.createArgument;
assert.equal(p.outcome,"Repurchased");
assert.equal(p.dealer,deployment.publicDesk.operator);
assert.notEqual(p.borrower,p.dealer);
assert.equal(p.repurchasePrice,"1004.3333333333");
assert.equal(p.collateralAmount,"0.0250000000");
const repurchase=exercised.find(e=>e.choice==="Repurchase");
assert.ok(repurchase?.consuming);
assert.deepEqual(repurchase.actingParties,[p.borrower]);
assert.equal(repurchase.exerciseResult,closed.contractId);
assert.ok(created.some(e=>e.createArgument.owner===p.dealer&&e.createArgument.instrument===p.cashInstrument
  &&e.createArgument.issuer===p.cashIssuer&&e.createArgument.amount===p.repurchasePrice));
assert.ok(created.some(e=>e.createArgument.owner===p.borrower&&e.createArgument.instrument===p.collateralInstrument
  &&e.createArgument.issuer===p.collateralIssuer&&e.createArgument.amount===p.collateralAmount
  &&Array.isArray(e.createArgument.lockParties)&&e.createArgument.lockParties.length===0));
assert.ok(created.every(e=>!("createdEventBlob" in e)));
assert.ok(receipt.events.every(e=>Object.values(e)[0].witnessParties.every(party=>party===p.borrower)));
console.log("Exported UI receipt verified: matching repurchase, dealer payment, unlocked collateral return, ClosedRepo and own-party events.");
console.log("Offline consistency only; retained participant receipts or authorized ledger reads supply external corroboration.");
