// Every move a desk can make, expressed as ledger commands.
//
// Nothing here decides whether a move is allowed — the contracts do that, and
// a rejection coming back from the ledger is the system working. These
// functions only assemble what to ask for.

import { create, dec, exercise, int, type Contract } from "../ledger/api";
import type { Session } from "../ledger/session";
import {
  TPL,
  deskState,
  num,
  type Holding,
  type PriceFeed,
} from "../ledger/symbolon";

export interface RequestTerms {
  dealers: string[];
  oracle: string;
  collateralInstrument: string;
  collateralAmount: number;
  cashInstrument: string;
  cashAmount: number;
  termDays: number;
  marginThresholdPct: number;
  cureSeconds: number;
}

/**
 * One private request per dealer. They are separate contracts on purpose:
 * dealer B is not an observer of dealer A's copy, so nobody can see who else
 * was asked.
 */
export function requestQuotes(s: Session, t: RequestTerms) {
  return s.submit(
    t.dealers.map((dealer) =>
      create(TPL.QuoteRequest, {
        borrower: s.party,
        dealer,
        oracle: t.oracle,
        collateralInstrument: t.collateralInstrument,
        collateralAmount: dec(t.collateralAmount),
        cashInstrument: t.cashInstrument,
        cashAmount: dec(t.cashAmount),
        termDays: int(t.termDays),
        marginThresholdPct: dec(t.marginThresholdPct),
        cureSeconds: int(t.cureSeconds),
      }),
    ),
  );
}

/** All of `owner`'s holdings in one instrument, largest first. */
const bucket = (
  holdings: Contract<Holding>[],
  owner: string,
  instrument: string,
) =>
  holdings
    .filter(
      (h) => h.payload.owner === owner && h.payload.instrument === instrument,
    )
    .sort((a, b) => num(b.payload.amount) - num(a.payload.amount));

/**
 * Return one holding worth at least `min`, merging holdings together until one
 * is. Trades leave change behind, so a party's balance fragments as they use
 * the desk — without this, someone holding 20 + 20 could not pledge 25, and
 * the balance on screen would be a number they cannot spend.
 */
export async function consolidate(
  s: Session,
  owner: string,
  instrument: string,
  min: number,
): Promise<string> {
  let mine = bucket(deskState(await s.read()).holdings, owner, instrument);
  const total = mine.reduce((n, h) => n + num(h.payload.amount), 0);
  if (total < min) {
    throw new Error(
      `Not enough ${instrument}: ${total} against ${min} needed.`,
    );
  }

  // Each merge archives both inputs and creates one holding, so the ids move
  // under us and every round has to re-read. In practice this is one or two.
  while (num(mine[0].payload.amount) < min) {
    await s.submit([
      exercise(TPL.Holding, mine[0].contractId, "Merge", {
        otherCid: mine[1].contractId,
      }),
    ]);
    mine = bucket(deskState(await s.read()).holdings, owner, instrument);
  }
  return mine[0].contractId;
}

/**
 * Quoting is two ledger writes, and the order matters: the dealer first makes
 * the funding holding visible to the borrower, because the borrower cannot
 * accept a quote backed by cash they are not allowed to see. The second write
 * points the quote at the escrowed holding, which is why a Symbolon quote is
 * provably funded rather than merely asserted.
 */
export async function sendQuote(
  s: Session,
  requestCid: string,
  borrower: string,
  cashInstrument: string,
  cashAmount: number,
  rate: number,
  validSeconds: number,
) {
  const cashCid = await consolidate(s, s.party, cashInstrument, cashAmount);

  await s.submit([
    exercise(TPL.Holding, cashCid, "SetViewers", {
      newViewers: [borrower],
    }),
  ]);

  // SetViewers archives and recreates, so the escrowed holding has a new id.
  const after = deskState(await s.read());
  const escrowed = after.holdings.find(
    (h) =>
      h.payload.owner === s.party &&
      h.payload.instrument === cashInstrument &&
      num(h.payload.amount) >= cashAmount &&
      h.payload.viewers.includes(borrower),
  );
  if (!escrowed) throw new Error("Escrowed holding did not come back.");

  return s.submit([
    exercise(TPL.QuoteRequest, requestCid, "SubmitQuote", {
      rate: dec(rate),
      validSeconds: int(validSeconds),
      cashCid: escrowed.contractId,
    }),
  ]);
}

export function passRequest(s: Session, requestCid: string) {
  return s.submit([exercise(TPL.QuoteRequest, requestCid, "PassRequest")]);
}

export function withdrawRequest(s: Session, requestCid: string) {
  return s.submit([exercise(TPL.QuoteRequest, requestCid, "WithdrawRequest")]);
}

/** Acceptance IS settlement: collateral and cash move in the same transaction. */
export async function acceptQuote(
  s: Session,
  quoteCid: string,
  collateralInstrument: string,
  collateralAmount: number,
) {
  const collateralCid = await consolidate(
    s,
    s.party,
    collateralInstrument,
    collateralAmount,
  );
  return s.submit([
    exercise(TPL.RepoQuote, quoteCid, "AcceptQuote", { collateralCid }),
  ]);
}

export function rejectQuote(s: Session, quoteCid: string) {
  return s.submit([exercise(TPL.RepoQuote, quoteCid, "RejectQuote")]);
}

export function issueMarginCall(
  s: Session,
  positionCid: string,
  feedCid: string,
) {
  return s.submit([
    exercise(TPL.RepoPosition, positionCid, "IssueMarginCall", { feedCid }),
  ]);
}

export async function topUp(
  s: Session,
  positionCid: string,
  instrument: string,
  extraQty: number,
  feedCid: string,
) {
  const extraCid = await consolidate(s, s.party, instrument, extraQty);
  return s.submit([
    exercise(TPL.RepoPosition, positionCid, "TopUpCollateral", {
      extraCid,
      extraQty: dec(extraQty),
      feedCid,
    }),
  ]);
}

/**
 * Substitution needs both signatures, so the borrower proposes and the dealer
 * accepts. The proposal carries the replacement holding, escrowed into the
 * dealer's view first for the same reason a quote is.
 */
export async function proposeSubstitution(
  s: Session,
  positionCid: string,
  dealer: string,
  newInstrument: string,
  newQty: number,
  newFeedCid: string,
) {
  const holdingCid = await consolidate(s, s.party, newInstrument, newQty);

  await s.submit([
    exercise(TPL.Holding, holdingCid, "SetViewers", {
      newViewers: [dealer],
    }),
  ]);

  const after = deskState(await s.read());
  const shown = after.holdings.find(
    (h) =>
      h.payload.owner === s.party &&
      h.payload.instrument === newInstrument &&
      num(h.payload.amount) >= newQty &&
      h.payload.viewers.includes(dealer),
  );
  if (!shown) throw new Error("Escrowed holding did not come back.");

  return s.submit([
    create(TPL.SubstitutionProposal, {
      borrower: s.party,
      dealer,
      posCid: positionCid,
      newInstrument,
      newQty: dec(newQty),
      newHoldingCid: shown.contractId,
      newFeedCid,
    }),
  ]);
}

export function acceptSubstitution(s: Session, proposalCid: string) {
  return s.submit([
    exercise(TPL.SubstitutionProposal, proposalCid, "AcceptSubstitution"),
  ]);
}

export function rejectSubstitution(s: Session, proposalCid: string) {
  return s.submit([
    exercise(TPL.SubstitutionProposal, proposalCid, "RejectSubstitution"),
  ]);
}

export async function repay(
  s: Session,
  positionCid: string,
  cashInstrument: string,
  repurchasePrice: number,
) {
  const cashCid = await consolidate(s, s.party, cashInstrument, repurchasePrice);
  return s.submit([
    exercise(TPL.RepoPosition, positionCid, "Repurchase", { cashCid }),
  ]);
}

export function declareDefault(s: Session, positionCid: string) {
  return s.submit([exercise(TPL.RepoPosition, positionCid, "DeclareDefault")]);
}

/** Oracle only. The demo's way of moving the market. */
export function setPrice(
  s: Session,
  feed: Contract<PriceFeed>,
  newPrice: number,
) {
  return s.submit([
    exercise(TPL.PriceFeed, feed.contractId, "SetPrice", {
      newPrice: dec(newPrice),
      at: new Date().toISOString(),
    }),
  ]);
}
