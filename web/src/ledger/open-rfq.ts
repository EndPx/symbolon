import { accountOpenRfqRequest } from "./account";
import { deployment } from "./deployment";
import { checkedDiscoveryId, checkedDiscoveryParty, checkedDiscoveryTerms } from "./discovery-model";
import { checkedLenderMarket, lenderMarketKey, type LenderMarket } from "./lender-directory-model";
import { checkedOpenRfqPricing, checkedOpenRfqPublic, checkedOpenRfqQuote, checkedOpenRfqReceiptId, checkedOpenRfqRequest, checkedOwnOpenRfq,
  type DiscoveryTerms, type OpenRfqPublishProof, type OpenRfqQuoteProof, type OpenRfqRequest, type OpenRfqQuote, type OwnOpenRfq, type PricingOpenRequest, type PublicOpenRequest } from "./open-rfq-model";
export type { DiscoveryTerms, OpenRfqPublishProof, OpenRfqQuoteProof, OpenRfqRequest, OpenRfqQuote, OwnOpenRfq, OwnedOpenRequest, PricingOpenRequest, PublicOpenRequest } from "./open-rfq-model";
function openPackage() {
  const id = (deployment() as {openRfqPackageId?: string | null}).openRfqPackageId;
  if (typeof id !== "string" || !/^[a-f0-9]{64}$/.test(id)) throw new Error("The open request package is not configured.");
  return id;
}
const privateRead = (market: LenderMarket, party: string, scope: "mine" | "board" | "quote", requestId?: string) => accountOpenRfqRequest("GET", {market, party: checkedDiscoveryParty(party), scope,
  ...(requestId === undefined ? {} : {requestId: checkedDiscoveryId(requestId)})});
function responseMarket(value: unknown, market: LenderMarket) {
  if (!value || typeof value !== "object" || lenderMarketKey(checkedLenderMarket((value as {market?: unknown}).market)) !== lenderMarketKey(market)) throw new Error("The open request response belongs to another market.");
}
export async function readOpenRequests(market: LenderMarket, signal?: AbortSignal): Promise<PublicOpenRequest[]> {
  const response = await fetch(`/api/open-rfq?market=${encodeURIComponent(JSON.stringify(market))}`, {credentials: "omit", cache: "no-store", redirect: "error",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000)});
  const value = await response.json().catch(() => null);
  if (!response.ok) throw new Error(value?.error ?? "The open request board is unavailable.");
  responseMarket(value, market);
  return checkedOpenRfqPublic(value.requests, market);
}
export async function readOpenRfqBoard(market: LenderMarket, party: string): Promise<PricingOpenRequest[]> {
  const value = await privateRead(market, party, "board") as {requests?: unknown};
  responseMarket(value, market);
  return checkedOpenRfqPricing(value.requests, market);
}
export async function readOwnOpenRfq(market: LenderMarket, party: string): Promise<OwnOpenRfq> {
  return checkedOwnOpenRfq(await privateRead(market, party, "mine"), market, party, openPackage());
}
export async function readOpenQuoteContext(market: LenderMarket, party: string, requestId: string): Promise<OpenRfqRequest> {
  const value = await privateRead(market, party, "quote", requestId) as {request?: unknown};
  responseMarket(value, market);
  const request = checkedOpenRfqRequest(value.request, market, openPackage());
  if (request.id !== requestId || request.status !== "open" || request.borrower === party) throw new Error("This open request is unavailable for your quote.");
  return request;
}
export async function publishOpenRfq(market: LenderMarket, party: string, terms: DiscoveryTerms, proof: OpenRfqPublishProof): Promise<OpenRfqRequest> {
  const value = await accountOpenRfqRequest("POST", {op: "publish", market, party: checkedDiscoveryParty(party), terms: checkedDiscoveryTerms(terms, market),
    updateId: checkedOpenRfqReceiptId(proof.updateId), contractId: checkedOpenRfqReceiptId(proof.contractId)}) as {request?: unknown};
  const result = checkedOpenRfqRequest(value?.request, market, openPackage());
  if (result.borrower !== party || result.disclosure.contractId !== proof.contractId || result.publishUpdateId !== proof.updateId) throw new Error("Publication was not confirmed for this borrower and receipt. Reconcile the existing open request before submitting again.");
  return result;
}
export async function recordOpenRfqQuote(market: LenderMarket, party: string, requestId: string, proof: OpenRfqQuoteProof): Promise<OpenRfqQuote> {
  const value = await accountOpenRfqRequest("POST", {op: "record-quote", market, party: checkedDiscoveryParty(party), requestId: checkedDiscoveryId(requestId),
    updateId: checkedOpenRfqReceiptId(proof.updateId), quoteContractId: checkedOpenRfqReceiptId(proof.quoteContractId)}) as {quote?: unknown};
  const quote = checkedOpenRfqQuote(value?.quote);
  if (quote.requestId !== requestId || quote.dealer !== party || quote.quoteContractId !== proof.quoteContractId || quote.updateId !== proof.updateId) throw new Error("Quote recording was not confirmed. Reconcile the existing funded quote before submitting again.");
  return quote;
}
export async function closeOpenRfq(market: LenderMarket, party: string, requestId: string, updateId: string): Promise<void> {
  const value = await accountOpenRfqRequest("POST", {op: "close", market, party: checkedDiscoveryParty(party), requestId: checkedDiscoveryId(requestId), updateId: checkedOpenRfqReceiptId(updateId)}) as {closed?: boolean};
  if (value?.closed !== true) throw new Error("Request closure was not confirmed. Reconcile the existing withdrawal receipt before submitting again.");
}
