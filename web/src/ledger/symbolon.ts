// Typed view of the Symbolon contracts.
//
// Local demos resolve #symbolon-v2. Remote deployments use the reviewed
// package hash from runtime configuration; old v1 contracts remain separate.

import type { Contract } from "./api";
import { templateReference } from "./deployment";

export const TPL = {
  get Holding() { return `${templateReference()}:Symbolon.DemoAsset:Holding`; },
  get PriceFeed() { return `${templateReference()}:Symbolon.Repo:PriceFeed`; },
  get QuoteRequest() { return `${templateReference()}:Symbolon.Repo:QuoteRequest`; },
  get RepoQuote() { return `${templateReference()}:Symbolon.Repo:RepoQuote`; },
  get RepoPosition() { return `${templateReference()}:Symbolon.Repo:RepoPosition`; },
  get SubstitutionProposal() { return `${templateReference()}:Symbolon.Repo:SubstitutionProposal`; },
  get ClosedRepo() { return `${templateReference()}:Symbolon.Repo:ClosedRepo`; },
} as const;

export interface Holding {
  issuer: string;
  owner: string;
  instrument: string;
  amount: string;
  viewers: string[];
  lockParties: string[];
}

export interface PriceFeed {
  oracle: string;
  instrument: string;
  instrumentIssuer: string;
  cashIssuer: string;
  cashInstrument: string;
  price: string;
  asOf: string;
  readers: string[];
}

export interface QuoteRequest {
  borrower: string;
  dealer: string;
  oracle: string;
  collateralInstrument: string;
  collateralIssuer: string;
  collateralAmount: string;
  cashInstrument: string;
  cashIssuer: string;
  cashAmount: string;
  termDays: string;
  marginThresholdPct: string;
  cureSeconds: string;
  maxPriceAgeSeconds: string;
}

export interface RepoQuote extends QuoteRequest {
  rate: string;
  cashCid: string;
  validUntil: string;
}

/** Daml variants arrive as `{ tag, value }`. Active has no payload. */
export type PositionStatus =
  | { tag: "Active"; value: Record<string, never> }
  | { tag: "UnderCall"; value: string };

export interface RepoPosition {
  borrower: string;
  dealer: string;
  oracle: string;
  collateralInstrument: string;
  collateralIssuer: string;
  collateralAmount: string;
  cashInstrument: string;
  cashIssuer: string;
  cashAmount: string;
  repurchasePrice: string;
  rate: string;
  marginThresholdPct: string;
  cureSeconds: string;
  maxPriceAgeSeconds: string;
  pledgedCids: string[];
  termDays: string;
  startTime: string;
  maturity: string;
  status: PositionStatus;
}

export interface ClosedRepo {
  borrower: string;
  dealer: string;
  collateralIssuer: string;
  collateralInstrument: string;
  collateralAmount: string;
  cashIssuer: string;
  cashInstrument: string;
  repurchasePrice: string;
  // All-nullary Daml variants are JSON enums, unlike PositionStatus above.
  outcome: "Repurchased" | "Defaulted" | "Liquidated";
  closedAt: string;
  closeoutPrice: string | null;
  closeoutHealthFactor: string | null;
}

export interface SubstitutionProposal {
  borrower: string;
  dealer: string;
  posCid: string;
  newInstrument: string;
  newIssuer: string;
  newQty: string;
  newHoldingCid: string;
  newFeedCid: string;
}

/** Everything the connected party can see, sorted into the app's buckets. */
export interface DeskState {
  holdings: Contract<Holding>[];
  feeds: Contract<PriceFeed>[];
  requests: Contract<QuoteRequest>[];
  quotes: Contract<RepoQuote>[];
  positions: Contract<RepoPosition>[];
  proposals: Contract<SubstitutionProposal>[];
  closed: Contract<ClosedRepo>[];
}

const suffix = (templateId: string) => templateId.split(":").slice(-2).join(":");

export function deskState(contracts: Contract[]): DeskState {
  const of = <T>(module: string, entity: string) =>
    contracts.filter(
      (c) => suffix(c.templateId) === `${module}:${entity}` &&
        (!templateReference().match(/^[a-f0-9]{64}$/) || c.templateId.startsWith(`${templateReference()}:`)),
    ) as Contract<T>[];

  return {
    holdings: of<Holding>("Symbolon.DemoAsset", "Holding"),
    feeds: of<PriceFeed>("Symbolon.Repo", "PriceFeed"),
    requests: of<QuoteRequest>("Symbolon.Repo", "QuoteRequest"),
    quotes: of<RepoQuote>("Symbolon.Repo", "RepoQuote"),
    positions: of<RepoPosition>("Symbolon.Repo", "RepoPosition"),
    proposals: of<SubstitutionProposal>(
      "Symbolon.Repo",
      "SubstitutionProposal",
    ),
    closed: of<ClosedRepo>("Symbolon.Repo", "ClosedRepo"),
  };
}

export const num = (s: string | undefined) => Number(s ?? 0);

/** Exact Numeric 10 units for asset selection and fragmented balances. */
export function decimalUnits(amount: number | string): bigint {
  const value = typeof amount === "string" ? amount : amount.toFixed(10);
  if (!/^\d+(?:\.\d{1,10})?$/.test(value)) throw new Error("Use a positive amount with at most 10 decimal places.");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 10_000_000_000n + BigInt(fraction.padEnd(10, "0"));
}

/**
 * What a party actually owns of an instrument, across however many holdings
 * their trading has broken it into. This — not the size of any one holding —
 * is what decides whether they can afford a move.
 */
export const balanceOf = (
  holdings: Contract<Holding>[],
  owner: string,
  instrument: string,
  issuer: string,
) => Number(
  holdings
    .filter(
      (h) => h.payload.owner === owner && h.payload.instrument === instrument &&
        h.payload.issuer === issuer && h.payload.lockParties?.length === 0,
    )
    .reduce((n, h) => n + decimalUnits(h.payload.amount), 0n),
) / 10_000_000_000;

export const DEFAULT_PRICE_AGE_SECONDS = 3600;

export interface FeedTerms {
  oracle: string;
  collateralIssuer: string;
  collateralInstrument: string;
  cashIssuer: string;
  cashInstrument: string;
  maxPriceAgeSeconds: string;
}

export function isFresh(feed: PriceFeed, maxAge = DEFAULT_PRICE_AGE_SECONDS, now = Date.now()) {
  const age = (now - new Date(feed.asOf).getTime()) / 1000;
  return Number.isFinite(age) && age >= 0 && age <= maxAge && num(feed.price) > 0;
}

/** Select the latest agreed feed, never another issuer or oracle's mark. */
export function feedFor(feeds: Contract<PriceFeed>[], terms: FeedTerms) {
  return feeds.filter(({ payload: f }) =>
    f.oracle === terms.oracle && f.instrumentIssuer === terms.collateralIssuer &&
    f.instrument === terms.collateralInstrument && f.cashIssuer === terms.cashIssuer &&
    f.cashInstrument === terms.cashInstrument,
  ).sort((a, b) => Date.parse(b.payload.asOf) - Date.parse(a.payload.asOf))[0];
}

export function priceOf(feeds: Contract<PriceFeed>[], terms: FeedTerms, now = Date.now()) {
  const f = feedFor(feeds, terms);
  return f && isFresh(f.payload, num(terms.maxPriceAgeSeconds), now) ? num(f.payload.price) : undefined;
}

/**
 * The same arithmetic the contract enforces, computed here only so the UI can
 * show it before anyone submits. The ledger remains the authority: a margin
 * call this says is available can still be refused on chain, and that refusal
 * is correct.
 */
export interface Health {
  collateralValue: number;
  requiredValue: number;
  factor: number;
  shortfallValue: number;
  healthy: boolean;
  priceKnown: boolean;
  stale: boolean;
}

export function health(
  pos: RepoPosition,
  feeds: Contract<PriceFeed>[],
  now = Date.now(),
): Health {
  const feed = feedFor(feeds, pos);
  const px = priceOf(feeds, pos, now);
  const collateralValue = (px ?? 0) * num(pos.collateralAmount);
  const requiredValue = num(pos.cashAmount) * num(pos.marginThresholdPct);
  return {
    collateralValue,
    requiredValue,
    factor: requiredValue > 0 ? collateralValue / requiredValue : 0,
    shortfallValue: px === undefined ? 0 : Math.max(0, requiredValue - collateralValue),
    healthy: px !== undefined && collateralValue >= requiredValue,
    priceKnown: px !== undefined,
    stale: !!feed && px === undefined,
  };
}

export const isUnderCall = (p: RepoPosition) => p.status.tag === "UnderCall";
export const cureDeadline = (p: RepoPosition) =>
  p.status.tag === "UnderCall" ? p.status.value : undefined;

export const cureElapsed = (p: RepoPosition, now = Date.now()) =>
  isUnderCall(p) && now >= Date.parse(p.status.value as string);

export const deadlineElapsed = (p: RepoPosition, now = Date.now()) =>
  now >= Date.parse(p.maturity) || (isUnderCall(p) && now >= Date.parse(p.status.value as string));

export const repurchaseAmount = (q: RepoQuote) =>
  num(q.cashAmount) * (1 + num(q.rate) * num(q.termDays) / 360);

export const fmtAmount = (s: string | number, dp = 2) =>
  Number(s).toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });

export const fmtPct = (n: number, dp = 2) => `${(n * 100).toFixed(dp)}%`;

/** "borrower-4f1df03a::1220…" → "borrower" */
export const partyLabel = (p: string) =>
  p.split("::")[0].replace(/-[0-9a-f]{8}$/, "");

export const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
};

export const daysUntil = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
};

// A cure window is short and the borrower is on the clock, so minutes and
// seconds matter here in a way days-to-maturity never does.
export const fmtDuration = (seconds: number) => {
  const s = Math.floor(seconds);
  if (s <= 0) return "0s";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
};

export const cureLeft = (iso: string) =>
  fmtDuration((new Date(iso).getTime() - Date.now()) / 1000);
