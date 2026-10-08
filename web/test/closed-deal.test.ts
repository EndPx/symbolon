import test from "node:test";
import assert from "node:assert/strict";
import {
  CLOSED_DEAL_RECORD_NOTICE, closedDealOutcome, closedDealRole, closedDealSnapshot, matchingClosedDealReceipt,
} from "../src/app/closed-deal.ts";
import type { Contract } from "../src/ledger/api.ts";
import type { CommittedReceipt } from "../src/ledger/canton-v2.ts";
import type { ClosedRepo } from "../src/ledger/symbolon.ts";

const borrower = "borrower::a", lender = "dealer::b", sync = "synchronizer::a";
const closed: Contract<ClosedRepo> = {
  contractId: "closed-contract", templateId: `${"a".repeat(64)}:Symbolon.Repo:ClosedRepo`, synchronizerId: sync,
  createdEventBlob: "private-created-event-blob",
  payload: {
    borrower, dealer: lender, collateralIssuer: "collateral-issuer::c", collateralInstrument: "cBTC-demo",
    collateralAmount: "0.0250000000", cashIssuer: "cash-issuer::d", cashInstrument: "USDCx-demo",
    repurchasePrice: "9007199254740993.3333333333", outcome: "Repurchased", closedAt: "2026-10-08T12:34:56.123456Z",
    closeoutPrice: null, closeoutHealthFactor: null,
  },
};
const committed = (events: unknown[], overrides: Partial<CommittedReceipt> = {}): CommittedReceipt => ({
  commandId: "original-command", updateId: "original-update", offset: 123, synchronizerId: sync,
  effectiveAt: "2026-10-08T12:34:56.123456Z", recordTime: "2026-10-08T12:34:57Z", events, ...overrides,
});
const created = { CreatedEvent: { contractId: closed.contractId, templateId: closed.templateId } };

test("only the exact borrower or lender can obtain the closed-deal snapshot or matched receipt", () => {
  const receipt = committed([created]);
  for (const [party, role, counterparty] of [[borrower, "borrower", lender], [lender, "lender", borrower]] as const) {
    assert.equal(closedDealRole(closed, party), role);
    assert.deepEqual(closedDealSnapshot(closed, party)?.viewer, { party, role, counterparty });
    assert.equal(matchingClosedDealReceipt(closed, party, receipt), receipt);
  }
  for (const party of ["", "borrower", "borrower::other", "observer::foreign", "collateral-issuer::c", "cash-issuer::d"]) {
    assert.equal(closedDealRole(closed, party), null);
    assert.equal(closedDealSnapshot(closed, party), null);
    assert.equal(matchingClosedDealReceipt(closed, party, receipt), null);
  }
});

test("the downloadable record preserves exact agreed terms and excludes invented or unrelated private fields", () => {
  const extra = {
    ...closed, authToken: "secret-token",
    payload: { ...closed.payload, principal: "1000", rate: "0.05", yield: "0.05", fees: "0", transactionId: "made-up-id" },
  };
  const snapshot = closedDealSnapshot(extra, borrower)!;
  assert.equal(snapshot.recordType, "closed-deal-ledger-record");
  assert.equal(snapshot.evidenceNotice, CLOSED_DEAL_RECORD_NOTICE);
  assert.match(snapshot.evidenceNotice, /ledger record, not a signed transaction receipt/);
  assert.equal(snapshot.contractId, closed.contractId);
  assert.equal(snapshot.templateId, closed.templateId);
  assert.equal(snapshot.synchronizerId, sync);
  assert.deepEqual(snapshot.payload, closed.payload);
  assert.equal(snapshot.payload.repurchasePrice, "9007199254740993.3333333333");
  assert.equal(snapshot.payload.collateralAmount, "0.0250000000");
  assert.equal(snapshot.payload.closedAt, "2026-10-08T12:34:56.123456Z");
  assert.doesNotMatch(JSON.stringify(snapshot), /secret-token|private-created-event-blob|principal|rate|yield|fees|transactionId|made-up-id/);
  assert.notEqual(snapshot.payload, closed.payload);
  snapshot.payload.repurchasePrice = "1";
  assert.equal(closed.payload.repurchasePrice, "9007199254740993.3333333333");
});

test("repurchase records repayment and collateral return; closeouts record release to the lender without cash repayment", () => {
  const repaid = closedDealOutcome("Repurchased");
  assert.equal(repaid.cashRepaid, true);
  assert.equal(repaid.repurchasePriceLabel, "Paid repurchase price");
  assert.equal(repaid.collateralDisposition, "Returned to borrower");
  assert.match(repaid.summary, /paid the full agreed repurchase price/);
  assert.match(repaid.summary, /collateral was returned to the borrower/);
  for (const value of ["Liquidated", "Defaulted"] as const) {
    const display = closedDealOutcome(value);
    assert.equal(display.label, value);
    assert.equal(display.cashRepaid, false);
    assert.equal(display.repurchasePriceLabel, "Agreed repurchase price");
    assert.equal(display.collateralDisposition, "Released to lender");
    assert.match(display.summary, /does not record a cash repayment/);
    assert.doesNotMatch(display.summary, /paid the full|returned to the borrower/);
    const contract = { ...closed, payload: { ...closed.payload, outcome: value } };
    assert.equal(closedDealSnapshot(contract, borrower)?.payload.outcome, value);
  }
});

test("closeout observations remain ledger strings while unavailable observations are not fabricated", () => {
  const liquidated = { ...closed, payload: { ...closed.payload, outcome: "Liquidated" as const,
    closeoutPrice: "60000.1234567890", closeoutHealthFactor: "0.8571428571" } };
  const snapshot = closedDealSnapshot(liquidated, lender)!;
  assert.equal(snapshot.payload.closeoutPrice, "60000.1234567890");
  assert.equal(snapshot.payload.closeoutHealthFactor, "0.8571428571");
  const { closeoutPrice: _price, closeoutHealthFactor: _factor, ...olderPayload } = closed.payload;
  const olderContract = { contractId: closed.contractId, templateId: closed.templateId, payload: olderPayload as ClosedRepo };
  const olderSnapshot = closedDealSnapshot(olderContract, borrower)!;
  assert.equal(olderSnapshot.synchronizerId, null);
  assert.equal(Object.hasOwn(olderSnapshot.payload, "closeoutPrice"), false);
  assert.equal(Object.hasOwn(olderSnapshot.payload, "closeoutHealthFactor"), false);
});

test("an archived event, payload reference, command/update identifier, substring, or nested object cannot associate a receipt", () => {
  const unrelated = [
    { ArchivedEvent: { contractId: closed.contractId } },
    { ExercisedEvent: { contractId: closed.contractId } },
    { CreatedEvent: { contractId: "another-contract", createArgument: { posCid: closed.contractId } } },
    { CreatedEvent: { contractId: `${closed.contractId}-other` } },
    { CreatedEvent: { createArgument: { contractId: closed.contractId } } },
    { CreatedEvent: { value: { contractId: closed.contractId } } },
    { contractId: closed.contractId },
    Object.assign(Object.create({ CreatedEvent: { contractId: closed.contractId } }), { other: true }),
    closed.contractId,
    null,
    { CreatedEvent: { contractId: closed.contractId }, ArchivedEvent: { contractId: closed.contractId } },
  ];
  for (const event of unrelated) {
    assert.equal(matchingClosedDealReceipt(closed, borrower, committed([event], {
      commandId: closed.contractId, updateId: closed.contractId,
    })), null);
  }
  assert.equal(matchingClosedDealReceipt(closed, borrower, committed([])), null);
  assert.equal(matchingClosedDealReceipt(closed, borrower, null), null);
});

test("receipt matching requires the exact creation identity and every available synchronizer to agree", () => {
  const receipt = committed([{ ArchivedEvent: { contractId: "old-position" } }, created]);
  assert.equal(matchingClosedDealReceipt(closed, lender, receipt), receipt);
  assert.equal(matchingClosedDealReceipt(closed, borrower, committed([created], { synchronizerId: "another-sync" })), null);
  assert.equal(matchingClosedDealReceipt(closed, borrower, committed([
    { CreatedEvent: { contractId: closed.contractId, templateId: "another-package:Symbolon.Repo:ClosedRepo" } },
  ])), null);
  assert.equal(matchingClosedDealReceipt(closed, borrower, committed([
    { CreatedEvent: { contractId: closed.contractId, synchronizerId: "another-sync" } },
  ])), null);
  const withoutSync = { ...closed, synchronizerId: undefined };
  assert.equal(matchingClosedDealReceipt(withoutSync, borrower, receipt), receipt);
  assert.equal(matchingClosedDealReceipt(closed, borrower, committed([{ CreatedEvent: { contractId: closed.contractId } }]))?.updateId,
    "original-update");
});

test("invalid contract kinds and malformed ledger records cannot become downloadable closed deals", () => {
  assert.equal(closedDealSnapshot({ ...closed, templateId: "package:Symbolon.Repo:RepoPosition" }, borrower), null);
  assert.equal(closedDealSnapshot({ ...closed, payload: { ...closed.payload, dealer: borrower } }, borrower), null);
  for (const changes of [
    { repurchasePrice: "NaN" }, { repurchasePrice: "0" }, { collateralAmount: "0" }, { cashIssuer: "" },
    { closedAt: "not-a-time" }, { outcome: "Settled" },
  ]) {
    assert.equal(closedDealSnapshot({ ...closed, payload: { ...closed.payload, ...changes } as ClosedRepo }, borrower), null);
  }
  for (const overrides of [{ offset: 0 }, { updateId: "" }, { commandId: "" }, { recordTime: "invalid" }]) {
    assert.equal(matchingClosedDealReceipt(closed, borrower, committed([created], overrides)), null);
  }
});
