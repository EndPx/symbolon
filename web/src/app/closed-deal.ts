import type { Contract } from "../ledger/api";
import type { CommittedReceipt } from "../ledger/canton-v2";
import type { ClosedRepo } from "../ledger/symbolon";

export type ClosedDealRole = "borrower" | "lender";
export const CLOSED_DEAL_RECORD_NOTICE =
  "This is a snapshot of a closed-deal ledger record, not a signed transaction receipt.";

export interface ClosedDealSnapshot {
  schemaVersion: 1;
  recordType: "closed-deal-ledger-record";
  evidenceNotice: string;
  viewer: { party: string; role: ClosedDealRole; counterparty: string };
  contractId: string;
  templateId: string;
  synchronizerId: string | null;
  payload: Omit<ClosedRepo, "closeoutPrice" | "closeoutHealthFactor"> &
    Partial<Pick<ClosedRepo, "closeoutPrice" | "closeoutHealthFactor">>;
}

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const nonempty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const amount = (value: unknown): value is string =>
  typeof value === "string" && /^\d+(?:\.\d{1,10})?$/.test(value) && /[1-9]/.test(value);
const timestamp = (value: unknown): value is string =>
  nonempty(value) && Number.isFinite(Date.parse(value));
const outcome = (value: unknown): value is ClosedRepo["outcome"] =>
  value === "Repurchased" || value === "Liquidated" || value === "Defaulted";

/** The caller supplies the current connected party; a counterparty input grants no access. */
export function closedDealRole(contract: Contract<ClosedRepo>, party: string): ClosedDealRole | null {
  if (!nonempty(party) || !object(contract?.payload) || !nonempty(contract.contractId)
    || !nonempty(contract.templateId)) return null;
  const parts = contract.templateId.split(":");
  if (parts.length !== 3 || !parts[0] || parts[1] !== "Symbolon.Repo" || parts[2] !== "ClosedRepo") return null;
  const { borrower, dealer } = contract.payload;
  if (!nonempty(borrower) || !nonempty(dealer) || borrower === dealer) return null;
  return party === borrower ? "borrower" : party === dealer ? "lender" : null;
}

/** Outcome text describes only the asset movement enforced by that close choice. */
export function closedDealOutcome(value: ClosedRepo["outcome"]) {
  switch (value) {
    case "Repurchased":
      return {
        label: "Repurchased", repurchasePriceLabel: "Paid repurchase price", cashRepaid: true,
        collateralDisposition: "Returned to borrower",
        summary: "The borrower paid the full agreed repurchase price to the lender, and the collateral was returned to the borrower.",
      };
    case "Liquidated":
      return {
        label: "Liquidated", repurchasePriceLabel: "Agreed repurchase price", cashRepaid: false,
        collateralDisposition: "Released to lender",
        summary: "After an uncured margin call, the collateral was released to the lender. This outcome does not record a cash repayment.",
      };
    case "Defaulted":
      return {
        label: "Defaulted", repurchasePriceLabel: "Agreed repurchase price", cashRepaid: false,
        collateralDisposition: "Released to lender",
        summary: "At maturity default, the collateral was released to the lender. This outcome does not record a cash repayment.",
      };
  }
}

/** Exact ledger strings and a field allowlist avoid invented terms and accidental credential/blob exports. */
export function closedDealSnapshot(contract: Contract<ClosedRepo>, party: string): ClosedDealSnapshot | null {
  const role = closedDealRole(contract, party);
  if (!role) return null;
  const p = contract.payload;
  if (![p.collateralIssuer, p.collateralInstrument, p.cashIssuer, p.cashInstrument].every(nonempty)
    || !amount(p.collateralAmount) || !amount(p.repurchasePrice) || !outcome(p.outcome)
    || !timestamp(p.closedAt)) return null;
  return {
    schemaVersion: 1, recordType: "closed-deal-ledger-record", evidenceNotice: CLOSED_DEAL_RECORD_NOTICE,
    viewer: { party, role, counterparty: role === "borrower" ? p.dealer : p.borrower },
    contractId: contract.contractId, templateId: contract.templateId,
    synchronizerId: nonempty(contract.synchronizerId) ? contract.synchronizerId : null,
    payload: {
      borrower: p.borrower, dealer: p.dealer,
      collateralIssuer: p.collateralIssuer, collateralInstrument: p.collateralInstrument,
      collateralAmount: p.collateralAmount, cashIssuer: p.cashIssuer, cashInstrument: p.cashInstrument,
      repurchasePrice: p.repurchasePrice, outcome: p.outcome, closedAt: p.closedAt,
      ...(p.closeoutPrice === null || typeof p.closeoutPrice === "string" ? { closeoutPrice: p.closeoutPrice } : {}),
      ...(p.closeoutHealthFactor === null || typeof p.closeoutHealthFactor === "string"
        ? { closeoutHealthFactor: p.closeoutHealthFactor } : {}),
    },
  };
}

/** Associate an already committed receipt only through this contract's own CreatedEvent. */
export function matchingClosedDealReceipt(
  contract: Contract<ClosedRepo>, party: string, receipt: CommittedReceipt | null | undefined,
): CommittedReceipt | null {
  if (!closedDealRole(contract, party) || !receipt || !nonempty(receipt.commandId)
    || !nonempty(receipt.updateId) || !nonempty(receipt.synchronizerId)
    || !Number.isSafeInteger(receipt.offset) || receipt.offset <= 0
    || !timestamp(receipt.effectiveAt) || !timestamp(receipt.recordTime) || !Array.isArray(receipt.events)) return null;
  if (nonempty(contract.synchronizerId) && contract.synchronizerId !== receipt.synchronizerId) return null;
  return receipt.events.some(event => {
    if (!object(event) || Object.keys(event).length !== 1 || !Object.hasOwn(event, "CreatedEvent")
      || !object(event.CreatedEvent)) return false;
    const created = event.CreatedEvent;
    return created.contractId === contract.contractId
      && (created.templateId === undefined || created.templateId === contract.templateId)
      && (created.synchronizerId === undefined || created.synchronizerId === receipt.synchronizerId);
  }) ? receipt : null;
}
