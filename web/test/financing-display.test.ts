import test from "node:test";
import assert from "node:assert/strict";
import { offerAmounts, displayDecimal, marginCallPrice, healthPresentation } from "../src/app/financing-display.ts";

test("offer comparison uses fixed ACT/360 interest and the agreed operation order", () => {
  assert.deepEqual(offerAmounts({ cashAmount: "1000", rate: "0.052", termDays: "30" }), { interest: "4.3333333333", repayment: "1004.3333333333" });
  assert.deepEqual(offerAmounts({ cashAmount: "8000", rate: "0.07", termDays: "45" }), { interest: "70.0000000000", repayment: "8070.0000000000" });
  assert.deepEqual(offerAmounts({ cashAmount: "8000", rate: "0", termDays: "45" }), { interest: "0.0000000000", repayment: "8000.0000000000" });
});
test("Numeric 10 rounding is half to even at multiplication and division", () => {
  assert.equal(offerAmounts({ cashAmount: "0.0000000001", rate: "0.5", termDays: "360" }).interest, "0.0000000000");
  assert.equal(offerAmounts({ cashAmount: "0.0000000003", rate: "0.5", termDays: "360" }).interest, "0.0000000002");
  assert.equal(offerAmounts({ cashAmount: "0.0000000001", rate: "1", termDays: "180" }).interest, "0.0000000000");
  assert.equal(offerAmounts({ cashAmount: "0.0000000003", rate: "1", termDays: "180" }).interest, "0.0000000002");
});
test("invalid financing inputs and Numeric overflow cannot appear as plausible repayments", () => {
  for (const termDays of ["0", "366", "30.5", "NaN"]) assert.throws(() => offerAmounts({ cashAmount: "1000", rate: "0.052", termDays }));
  assert.throws(() => offerAmounts({ cashAmount: "1e3", rate: "0.052", termDays: "30" }));
  assert.throws(() => offerAmounts({ cashAmount: "9999999999999999999999999999", rate: "2", termDays: "365" }));
});
test("margin price uses principal and maintenance cover, not contractual repayment", () => {
  assert.equal(marginCallPrice({ cashAmount: "1000", marginThresholdPct: "1.05", collateralAmount: "0.025" }), "42000.0000000000");
  assert.equal(marginCallPrice({ cashAmount: "8000", marginThresholdPct: "1.05", collateralAmount: "1" }), "8400.0000000000");
  assert.equal(marginCallPrice({ cashAmount: "1000", marginThresholdPct: "1.05", collateralAmount: "0.05" }), "21000.0000000000");
  assert.equal(marginCallPrice({ cashAmount: "1000", marginThresholdPct: "1.05", collateralAmount: "0" }), null);
});
test("health colors preserve the exact covenant boundary and neutral stale state", () => {
  assert.deepEqual(healthPresentation({ priceKnown: true, factor: 1.43 }), { tone: "covered", label: "Margin covered" });
  assert.equal(healthPresentation({ priceKnown: true, factor: 1.2 }).tone, "covered");
  assert.equal(healthPresentation({ priceKnown: true, factor: 1.199 }).tone, "caution");
  assert.equal(healthPresentation({ priceKnown: true, factor: 1 }).tone, "caution");
  assert.equal(healthPresentation({ priceKnown: true, factor: 0.99999 }).tone, "danger");
  assert.equal(healthPresentation({ priceKnown: false, factor: 1.43 }).tone, "unknown");
  assert.equal(healthPresentation({ priceKnown: true, factor: NaN }).tone, "unknown");
});
test("decimal formatting preserves amounts beyond floating point precision and rounds carries", () => {
  assert.equal(displayDecimal("9007199254740993.1234567890", 10), "9,007,199,254,740,993.1234567890");
  assert.equal(displayDecimal("999.99996", 4), "1,000.0000");
  assert.equal(displayDecimal("0", 6), "0.000000");
  assert.throws(() => displayDecimal("NaN"));
});
