// Assemble commands; authorization, asset locks and lifecycle rules live on ledger.
import { create, dec, exercise, int, type Contract } from "../ledger/api";
import type { Session } from "../ledger/session";
import { TPL, deskState, decimalUnits as units, type Holding, type PriceFeed, type RepoQuote, type QuoteRequest, type RepoPosition } from "../ledger/symbolon";

export interface RequestTerms {
  dealers: string[];
  oracle: string;
  collateralIssuer: string;
  collateralInstrument: string;
  collateralAmount: number;
  cashIssuer: string;
  cashInstrument: string;
  cashAmount: number;
  termDays: number;
  marginThresholdPct: number;
  cureSeconds: number;
  maxPriceAgeSeconds: number;
}

export function requestQuotes(s: Session, t: RequestTerms) {
  return s.submit(t.dealers.map((dealer) => create(TPL.QuoteRequest, {
    borrower: s.party, dealer, oracle: t.oracle,
    collateralIssuer: t.collateralIssuer, collateralInstrument: t.collateralInstrument,
    collateralAmount: dec(t.collateralAmount), cashIssuer: t.cashIssuer,
    cashInstrument: t.cashInstrument, cashAmount: dec(t.cashAmount),
    termDays: int(t.termDays), marginThresholdPct: dec(t.marginThresholdPct),
    cureSeconds: int(t.cureSeconds), maxPriceAgeSeconds: int(t.maxPriceAgeSeconds),
  })));
}

const bucket = (holdings: Contract<Holding>[], owner: string, instrument: string, issuer: string) =>
  holdings.filter(({ payload: h }) => h.owner === owner && h.instrument === instrument &&
    h.issuer === issuer && h.lockParties?.length === 0)
    .sort((a, b) => units(a.payload.amount) > units(b.payload.amount) ? -1 : units(a.payload.amount) < units(b.payload.amount) ? 1 : 0);

/** Consolidation and change happen privately before a bilateral transaction. */
export async function exactHolding(s: Session, instrument: string, issuer: string, amount: number | string): Promise<string> {
  const needed = units(amount);
  if (needed <= 0n) throw new Error("Enter a positive amount.");
  let mine = bucket(deskState(await s.read()).holdings, s.party, instrument, issuer);
  if (mine.reduce((total, h) => total + units(h.payload.amount), 0n) < needed) {
    throw new Error(`Not enough available ${instrument} from the agreed issuer. Locked holdings cannot be used.`);
  }
  while (units(mine[0].payload.amount) < needed) {
    await s.submit([exercise(TPL.Holding, mine[0].contractId, "Merge", { otherCid: mine[1].contractId })]);
    mine = bucket(deskState(await s.read()).holdings, s.party, instrument, issuer);
  }
  const exact = mine.find((h) => units(h.payload.amount) === needed);
  if (exact) return exact.contractId;
  const before = new Set(mine.map((h) => h.contractId));
  await s.submit([exercise(TPL.Holding, mine[0].contractId, "Transfer", {
    to: s.party, qty: dec(amount), newViewers: [],
  })]);
  const split = bucket(deskState(await s.read()).holdings, s.party, instrument, issuer)
    .find((h) => !before.has(h.contractId) && units(h.payload.amount) === needed);
  if (!split) throw new Error("The exact holding is not visible yet. Refresh the ledger before retrying.");
  return split.contractId;
}

export async function sendQuote(s: Session, request: Contract<QuoteRequest>, rate: number, validSeconds: number) {
  const r = request.payload;
  const cashCid = await exactHolding(s, r.cashInstrument, r.cashIssuer, r.cashAmount);
  return s.submit([exercise(TPL.QuoteRequest, request.contractId, "SubmitQuote", {
    rate: dec(rate), validSeconds: int(validSeconds), cashCid,
  })]);
}

export const passRequest = (s: Session, cid: string) => s.submit([exercise(TPL.QuoteRequest, cid, "PassRequest")]);
export const withdrawRequest = (s: Session, cid: string) => s.submit([exercise(TPL.QuoteRequest, cid, "WithdrawRequest")]);

export async function acceptQuote(s: Session, quote: Contract<RepoQuote>, feedCid: string) {
  const q = quote.payload;
  const collateralCid = await exactHolding(s, q.collateralInstrument, q.collateralIssuer, q.collateralAmount);
  return s.submit([exercise(TPL.RepoQuote, quote.contractId, "AcceptQuote", { collateralCid, feedCid })]);
}

export const rejectQuote = (s: Session, cid: string) => s.submit([exercise(TPL.RepoQuote, cid, "RejectQuote")]);
export const revokeQuote = (s: Session, cid: string) => s.submit([exercise(TPL.RepoQuote, cid, "RevokeQuote")]);
export const issueMarginCall = (s: Session, cid: string, feedCid: string) =>
  s.submit([exercise(TPL.RepoPosition, cid, "IssueMarginCall", { feedCid })]);
export const resolveMarginCall = (s: Session, cid: string, feedCid: string) =>
  s.submit([exercise(TPL.RepoPosition, cid, "ResolveMarginCall", { feedCid })]);

export async function topUp(s: Session, position: Contract<RepoPosition>, extraQty: number, feedCid: string) {
  const p = position.payload;
  const extraCid = await exactHolding(s, p.collateralInstrument, p.collateralIssuer, extraQty);
  return s.submit([exercise(TPL.RepoPosition, position.contractId, "TopUpCollateral", { extraCid, extraQty: dec(extraQty), feedCid })]);
}

export async function proposeSubstitution(s: Session, positionCid: string, feed: Contract<PriceFeed>, newQty: number) {
  const f = feed.payload;
  const newHoldingCid = await exactHolding(s, f.instrument, f.instrumentIssuer, newQty);
  return s.submit([exercise(TPL.RepoPosition, positionCid, "ProposeSubstitution", {
    newIssuer: f.instrumentIssuer, newInstrument: f.instrument, newQty: dec(newQty),
    newHoldingCid, newFeedCid: feed.contractId,
  })]);
}

export const acceptSubstitution = (s: Session, cid: string) =>
  s.submit([exercise(TPL.SubstitutionProposal, cid, "AcceptSubstitution")]);
export const rejectSubstitution = (s: Session, cid: string) =>
  s.submit([exercise(TPL.SubstitutionProposal, cid, "RejectSubstitution")]);
export const withdrawSubstitution = (s: Session, cid: string) =>
  s.submit([exercise(TPL.SubstitutionProposal, cid, "WithdrawSubstitution")]);

export async function repay(s: Session, position: Contract<RepoPosition>) {
  const p = position.payload;
  const cashCid = await exactHolding(s, p.cashInstrument, p.cashIssuer, p.repurchasePrice);
  return s.submit([exercise(TPL.RepoPosition, position.contractId, "Repurchase", { cashCid })]);
}

export const declareDefault = (s: Session, cid: string) => s.submit([exercise(TPL.RepoPosition, cid, "DeclareDefault")]);
export const liquidate = (s: Session, cid: string, feedCid: string) =>
  s.submit([exercise(TPL.RepoPosition, cid, "Liquidate", { feedCid })]);
export const setPrice = (s: Session, feed: Contract<PriceFeed>, newPrice: number) =>
  s.submit([exercise(TPL.PriceFeed, feed.contractId, "SetPrice", { newPrice: dec(newPrice), at: new Date().toISOString() })]);
