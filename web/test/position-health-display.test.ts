import test from "node:test";
import assert from "node:assert/strict";
import { positionHealthDisplay } from "../src/app/financing-display.ts";
import { canRefreshTestPositionMark } from "../src/app/market-preparation.ts";
import { defaultDeployment, type Deployment } from "../src/ledger/deployment.ts";
import type { Contract } from "../src/ledger/api.ts";
import type { PriceFeed, RepoPosition } from "../src/ledger/symbolon.ts";

const now = Date.parse("2026-10-09T04:00:00Z"), operator = "operator::a", borrower = "borrower::b";
const position: RepoPosition = { borrower, dealer: operator, oracle: operator, collateralIssuer: operator,
  collateralInstrument: "cBTC-demo", collateralAmount: "0.025", cashIssuer: operator, cashInstrument: "USDCx-demo",
  cashAmount: "1000", repurchasePrice: "1004.3333333333", rate: "0.052", marginThresholdPct: "1.05",
  cureSeconds: "3600", maxPriceAgeSeconds: "3600", pledgedCids: ["pledged"], termDays: "30",
  startTime: "2026-10-08T14:04:12Z", maturity: "2026-11-07T14:04:12Z", status: {tag: "Active", value: {}} };
const mark: PriceFeed = {oracle: operator, instrumentIssuer: operator, instrument: "cBTC-demo", cashIssuer: operator,
  cashInstrument: "USDCx-demo", price: "60000", asOf: "2026-10-09T02:56:00Z", readers: [borrower]};
const feed = (payload: PriceFeed): Contract<PriceFeed> => ({contractId: "mark", templateId: "price-feed", payload});
const profile: Deployment = {...defaultDeployment, publicDesk: {operator, contractId: "desk", createdEventBlob: "blob",
  label: "Desk", referencePrice: "60000", rate: "0.052", maxPrincipal: "10000"},
  assets: {collateral: {...defaultDeployment.assets.collateral, symbol: "cBTC-demo", admin: operator}, cash: {...defaultDeployment.assets.cash, symbol: "USDCx-demo", admin: operator}}};
const session = {kind: "account" as const, party: operator, networkId: "devnet"};

test("a fresh agreed mark displays current collateral health at the existing covenant threshold", () => {
  const display = positionHealthDisplay(position, [feed({...mark, asOf: new Date(now - 3600_000).toISOString()})], now);
  assert.equal(display.state, "current");
  assert.equal(display.factor, 10 / 7);
  assert.equal(display.risk.tone, "covered");
  assert.equal(display.lastMark, false);
});

test("an expired mark retains a labelled neutral estimate without restoring fresh-price authority", () => {
  const display = positionHealthDisplay(position, [feed(mark)], now);
  assert.equal(display.state, "expired");
  assert.equal(display.factor, 10 / 7);
  assert.equal(display.lastMark, true);
  assert.deepEqual(display.risk, {tone: "unknown", label: "Price expired"});
  assert.equal(display.health.priceKnown, false);
  assert.equal(display.health.healthy, false);
  assert.equal(display.health.factor, 0);
});

test("last-mark display cannot borrow a different issuer's price or turn missing/future/invalid marks into an estimate", () => {
  const cases: Array<[PriceFeed[], string]> = [[[], "missing"], [[{...mark, cashIssuer: "foreign::c"}], "missing"],
    [[{...mark, asOf: new Date(now + 1).toISOString()}], "future"], [[{...mark, asOf: "invalid"}], "invalid"],
    [[{...mark, price: "NaN"}], "invalid"]];
  for (const [marks, state] of cases) {
    const display = positionHealthDisplay(position, marks.map(feed), now);
    assert.equal(display.state, state);
    assert.equal(display.factor, null);
    assert.equal(display.lastMark, false);
    assert.equal(display.risk.tone, "unknown");
  }
});

test("expired below-margin figures stay historical and the latest exact feed replaces the old display", () => {
  const old = positionHealthDisplay(position, [feed({...mark, price: "36000"})], now);
  assert.equal(old.factor, 6 / 7);
  assert.equal(old.risk.tone, "unknown");
  const current = positionHealthDisplay(position, [feed(mark), feed({...mark, price: "36000", asOf: new Date(now).toISOString()})], now);
  assert.equal(current.factor, 6 / 7);
  assert.equal(current.risk.tone, "danger");
  assert.equal(current.health.priceKnown, true);
});

test("position timestamp recovery belongs only to the bound public DevNet oracle and exact expired feed", () => {
  assert.equal(canRefreshTestPositionMark(session, position, mark, profile, now), true);
  for (const actor of [{...session, party: borrower}, {...session, networkId: "mainnet"}, {...session, kind: "browse" as const}, {...session, kind: "sandbox" as const}])
    assert.equal(canRefreshTestPositionMark(actor, position, mark, profile, now), false);
  for (const network of ["localnet", "mainnet"] as const)
    assert.equal(canRefreshTestPositionMark(session, position, mark, {...profile, network}, now), false);
  for (const changed of [{...mark, readers: []}, {...mark, instrumentIssuer: "foreign::c"}, {...mark, cashIssuer: "foreign::c"},
    {...mark, oracle: "committee::c"}, {...mark, asOf: new Date(now + 1).toISOString()},
    {...mark, asOf: new Date(now).toISOString()}, {...mark, price: "Infinity"}, {...mark, price: "9007199254740993.0000000000"}])
    assert.equal(canRefreshTestPositionMark(session, position, changed, profile, now), false);
  assert.equal(canRefreshTestPositionMark(session, {...position, oracle: "committee::c"}, {...mark, oracle: "committee::c"}, profile, now), false);
  assert.equal(canRefreshTestPositionMark(session, position, undefined, profile, now), false);
});
