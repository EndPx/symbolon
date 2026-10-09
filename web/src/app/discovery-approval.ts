import { dec } from "../ledger/api";
import type { CommittedReceipt } from "../ledger/canton-v2";
import { checkedDiscoveryTerms, sameDiscoveryTerms, type DiscoveryTerms } from "../ledger/discovery-model";
import type { LenderMarket } from "../ledger/lender-directory-model";
import type { Session } from "../ledger/session";
import { requestQuotes, type RequestTerms } from "./actions";

export type RequestProof = { updateId: string; contractId: string };
export function matchesDiscoveryTerms(value: object, market: LenderMarket, borrower: string, dealer: string, terms: DiscoveryTerms): boolean {
  const payload = value as Record<string, unknown>;
  if (payload.borrower !== borrower || payload.dealer !== dealer) return false;
  const original = Object.fromEntries(Object.keys(terms).map(field => [field, payload[field]]));
  for (const field of ["termDays", "cureSeconds", "maxPriceAgeSeconds"]) if (typeof original[field] === "string") original[field] = Number(original[field]);
  try { return sameDiscoveryTerms(checkedDiscoveryTerms(original, market), terms); }
  catch { return false; }
}
export function discoveryRequestTerms(terms: DiscoveryTerms, dealer: string): RequestTerms {
  const exact = (value: string) => {
    const number = Number(value);
    if (!Number.isFinite(number) || dec(number) !== value) throw new Error("These terms cannot be submitted without changing their precision. Publish a new opportunity with supported amounts.");
    return number;
  };
  return {...terms, dealers: [dealer], collateralAmount: exact(terms.collateralAmount), cashAmount: exact(terms.cashAmount), marginThresholdPct: exact(terms.marginThresholdPct)};
}
export function discoveryRequestProof(receipt: CommittedReceipt | null | undefined, market: LenderMarket, borrower: string, dealer: string, terms: DiscoveryTerms): RequestProof | null {
  if (!receipt || receipt.synchronizerId !== market.synchronizerId) return null;
  const matches = receipt.events.flatMap(item => {
    const event = (item as {CreatedEvent?: {templateId?: string; contractId?: string; createArgument?: Record<string, unknown>}})?.CreatedEvent;
    if (!event?.contractId || event.templateId !== `${market.corePackageId}:Symbolon.Repo:QuoteRequest` || !event.createArgument || !matchesDiscoveryTerms(event.createArgument, market, borrower, dealer, terms)) return [];
    const value = {...event.createArgument}; delete value.borrower; delete value.dealer;
    for (const field of ["termDays", "cureSeconds", "maxPriceAgeSeconds"]) if (typeof value[field] === "string") value[field] = Number(value[field]);
    try { return sameDiscoveryTerms(checkedDiscoveryTerms(value, market), terms) ? [event.contractId] : []; }
    catch { return []; }
  });
  return matches.length === 1 ? {updateId: receipt.updateId, contractId: matches[0]} : null;
}
/** Records a real bilateral creation. Off-ledger approval must verify this proof separately. */
export async function createDiscoveryRequest(session: Session, market: LenderMarket, dealer: string, terms: DiscoveryTerms, consent: boolean): Promise<RequestProof> {
  if (!consent || session.kind !== "account" || dealer === session.party) throw new Error("Approve disclosure to this lender from your own HackCanton account.");
  if (session.pendingCommand?.()) throw new Error("Check the original pending command before another submission.");
  const checked = checkedDiscoveryTerms(terms, market);
  const updateId = await requestQuotes(session, discoveryRequestTerms(checked, dealer));
  const proof = discoveryRequestProof(session.lastReceipt?.(), market, session.party, dealer, checked);
  if (!proof || proof.updateId !== updateId) throw new Error("The request may have committed, but its creation proof is unavailable. Check the original transaction before trying again.");
  return proof;
}
