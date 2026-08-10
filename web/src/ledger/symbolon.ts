// Typed view of the Symbolon contracts.
//
// Templates are addressed by package NAME (`#symbolon:…`), not by package id,
// so a rebuilt DAR does not strand the app on a hash that no longer exists.

import type { Contract } from "./api";

export const TPL = {
  Holding: "#symbolon:Symbolon.DemoAsset:Holding",
  PriceFeed: "#symbolon:Symbolon.Repo:PriceFeed",
  QuoteRequest: "#symbolon:Symbolon.Repo:QuoteRequest",
  RepoQuote: "#symbolon:Symbolon.Repo:RepoQuote",
  RepoPosition: "#symbolon:Symbolon.Repo:RepoPosition",
  SubstitutionProposal: "#symbolon:Symbolon.Repo:SubstitutionProposal",
  ClosedRepo: "#symbolon:Symbolon.Repo:ClosedRepo",
} as const;

export interface Holding {
  issuer: string;
  owner: string;
  instrument: string;
  amount: string;
  viewers: string[];
}

export interface PriceFeed {
  oracle: string;
  instrument: string;
  price: string;
  asOf: string;
  readers: string[];
}

export interface QuoteRequest {
  borrower: string;
  dealer: string;
  oracle: string;
  collateralInstrument: string;
  collateralAmount: string;
  cashInstrument: string;
  cashAmount: string;
  termDays: string;
  marginThresholdPct: string;
  cureSeconds: string;
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
  collateralAmount: string;
  cashInstrument: string;
  cashAmount: string;
  repurchasePrice: string;
  rate: string;
  marginThresholdPct: string;
  cureSeconds: string;
  pledgedCids: string[];
  startTime: string;
  maturity: string;
  status: PositionStatus;
}

export interface ClosedRepo {
  borrower: string;
  dealer: string;
  collateralInstrument: string;
  collateralAmount: string;
  cashInstrument: string;
  repurchasePrice: string;
  outcome: { tag: "Repurchased" | "Defaulted"; value: Record<string, never> };
  closedAt: string;
}

export interface SubstitutionProposal {
  borrower: string;
  dealer: string;
  posCid: string;
  newInstrument: string;
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
      (c) => suffix(c.templateId) === `${module}:${entity}`,
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

export function priceOf(feeds: Contract<PriceFeed>[], instrument: string) {
  const f = feeds.find((x) => x.payload.instrument === instrument);
  return f ? num(f.payload.price) : undefined;
}

export function feedFor(feeds: Contract<PriceFeed>[], instrument: string) {
  return feeds.find((x) => x.payload.instrument === instrument);
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
  ratio: number;
  healthy: boolean;
  priceKnown: boolean;
}

export function health(
  pos: RepoPosition,
  feeds: Contract<PriceFeed>[],
): Health {
  const px = priceOf(feeds, pos.collateralInstrument);
  const collateralValue = (px ?? 0) * num(pos.collateralAmount);
  const requiredValue = num(pos.cashAmount) * num(pos.marginThresholdPct);
  return {
    collateralValue,
    requiredValue,
    ratio: requiredValue > 0 ? collateralValue / requiredValue : 0,
    healthy: px !== undefined && collateralValue >= requiredValue,
    priceKnown: px !== undefined,
  };
}

export const isUnderCall = (p: RepoPosition) => p.status.tag === "UnderCall";
export const cureDeadline = (p: RepoPosition) =>
  p.status.tag === "UnderCall" ? p.status.value : undefined;

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
export const cureLeft = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};
