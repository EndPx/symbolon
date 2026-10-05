import test from "node:test";
import assert from "node:assert/strict";
import { balanceOf, cureElapsed, decimalUnits, deadlineElapsed, feedFor, health, isFresh,
  type Holding, type PriceFeed, type FeedTerms, type RepoPosition } from "../src/ledger/symbolon.ts";
import type { Contract } from "../src/ledger/api.ts";

const feed = (id: string, changes: Partial<PriceFeed> = {}): Contract<PriceFeed> => ({
  contractId: id, templateId: "#symbolon:Symbolon.Repo:PriceFeed", payload: {
    oracle: "oracle", instrumentIssuer: "issuer", instrument: "CETH", cashIssuer: "issuer",
    cashInstrument: "CUSD", price: "100", asOf: "2026-09-23T00:00:00Z", readers: [], ...changes,
  },
});
const terms: FeedTerms = { oracle: "oracle", collateralIssuer: "issuer", collateralInstrument: "CETH",
  cashIssuer: "issuer", cashInstrument: "CUSD", maxPriceAgeSeconds: "3600" };

test("a higher or newer price from the wrong oracle, issuer or cash pair never controls the trade", () => {
  const feeds = [feed("good"), feed("fake-issuer", { instrumentIssuer: "attacker", price: "999999" }),
    feed("other-oracle", { oracle: "attacker", asOf: "2026-09-23T00:05:00Z" }),
    feed("other-cash", { cashInstrument: "CEUR" }), feed("fake-cash", { cashIssuer: "attacker" })];
  assert.equal(feedFor(feeds, terms)?.contractId, "good");
  assert.equal(feedFor(feeds.slice(1), terms), undefined);
});

test("freshness includes the exact age boundary and rejects future, stale and invalid marks", () => {
  const mark = feed("good").payload;
  const time = Date.parse(mark.asOf);
  assert.equal(isFresh(mark, 3600, time + 3_600_000), true);
  assert.equal(isFresh(mark, 3600, time + 3_600_001), false);
  assert.equal(isFresh(mark, 3600, time - 1), false);
  assert.equal(isFresh({ ...mark, asOf: "invalid" }, 3600, time), false);
  assert.equal(isFresh({ ...mark, price: "0" }, 3600, time), false);
});

test("funding availability excludes locked assets, another owner and same-symbol counterfeits", () => {
  const holding = (id: string, amount: string, changes: Partial<Holding> = {}): Contract<Holding> => ({
    contractId: id, templateId: "#symbolon:Symbolon.DemoAsset:Holding",
    payload: { owner: "borrower", issuer: "issuer", instrument: "CUSD", amount,
      viewers: [], lockParties: [], ...changes },
  });
  assert.equal(balanceOf([holding("a", "0.1"), holding("b", "0.7"),
    holding("locked", "1000", { lockParties: ["dealer"] }),
    holding("fake", "1000", { issuer: "attacker" }), holding("other", "1000", { owner: "dealer" })],
  "borrower", "CUSD", "issuer"), 0.8);
  assert.equal(decimalUnits("1004.3333333333"), 10043333333333n);
});

test("maturity defaults an active position even without a margin call, at the same boundary as Daml", () => {
  const maturity = "2026-10-23T00:00:00Z";
  const active = { maturity, status: { tag: "Active" } } as RepoPosition;
  assert.equal(deadlineElapsed(active, Date.parse(maturity) - 1), false);
  assert.equal(deadlineElapsed(active, Date.parse(maturity)), true);
  const underCall = { ...active, status: { tag: "UnderCall", value: "2026-09-23T01:00:00Z" } } as RepoPosition;
  assert.equal(deadlineElapsed(underCall, Date.parse("2026-09-23T01:00:00Z")), true);
  assert.equal(cureElapsed(underCall, Date.parse("2026-09-23T01:00:00Z") - 1), false);
  assert.equal(cureElapsed(underCall, Date.parse("2026-09-23T01:00:00Z")), true);
});

test("health factor tracks the agreed margin and a sufficient top-up", () => {
  const now = Date.parse("2026-09-23T00:00:00Z");
  const position = { ...terms, collateralAmount: "15", cashAmount: "1000", marginThresholdPct: "1.05" } as RepoPosition;
  const low = feed("low", { price: "60" });
  const breached = health(position, [low], now);
  assert.equal(breached.factor, 900 / 1050);
  assert.equal(breached.shortfallValue, 150);
  assert.equal(breached.healthy, false);
  const restored = health({ ...position, collateralAmount: "17.5" }, [low], now);
  assert.equal(restored.factor, 1);
  assert.equal(restored.healthy, true);
  assert.equal(health(position, [low], now + 3_600_001).priceKnown, false);
});
