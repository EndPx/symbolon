import { checkedDiscoveryId, checkedDiscoveryParty, checkedDiscoveryTerms, numeric10, type DiscoveryTerms } from "./discovery-model.js";
import { checkedLenderMarket, lenderMarketKey, type LenderMarket } from "./lender-directory-model.js";
export type { DiscoveryTerms } from "./discovery-model.js";
export type PublicOpenRequest = { id: string; market: LenderMarket; status: "open"; createdAt: string };
export type OpenRfqDisclosure = { templateId: string; contractId: string; createdEventBlob: string; synchronizerId: string };
export type PricingOpenRequest = PublicOpenRequest & { borrower: string; terms: DiscoveryTerms };
/** Publication explicitly shares this request with authenticated Symbolon users. */
export type OpenRfqRequest = {
  id: string; market: LenderMarket; status: "open" | "closed"; createdAt: string;
  borrower: string; terms: DiscoveryTerms; disclosure: OpenRfqDisclosure;
  publishUpdateId: string; closedUpdateId?: string; closedAt?: string;
};
export type OpenRfqQuote = {
  requestId: string; dealer: string; rate: string; validUntil: string;
  quoteContractId: string; updateId: string; createdAt: string;
};
export type OwnedOpenRequest = OpenRfqRequest & { quotes: OpenRfqQuote[] };
export type OwnOpenRfq = { requests: OwnedOpenRequest[]; quotes: Array<{request: OpenRfqRequest; quote: OpenRfqQuote}> };
export type OpenRfqPublishProof = { updateId: string; contractId: string; createdEventBlob?: string };
export type OpenRfqQuoteProof = { updateId: string; quoteContractId: string };
export function checkedOpenRfqReceiptId(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9._:-]{1,512}$/.test(value)) throw new Error("Supply the confirmed ledger receipt and contract IDs.");
  return value;
}
export function openRfqPublic(request: OpenRfqRequest): PublicOpenRequest {
  if (request.status !== "open") throw new Error("The request is closed.");
  return {id: checkedDiscoveryId(request.id), market: checkedLenderMarket(request.market), status: "open", createdAt: checkedDate(request.createdAt)};
}
export function openRfqPricing(request: OpenRfqRequest): PricingOpenRequest {
  return {...openRfqPublic(request), borrower: request.borrower, terms: request.terms};
}
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid open request response.");
  return value as Record<string, unknown>;
};
function checkedDate(value: unknown): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new Error("Invalid open request timestamp.");
  return value;
}
function sameMarket(value: unknown, market: LenderMarket): LenderMarket {
  const result = checkedLenderMarket(value);
  if (lenderMarketKey(result) !== lenderMarketKey(market)) throw new Error("The open request belongs to another market.");
  return result;
}
export function checkedOpenRfqPublic(value: unknown, market: LenderMarket): PublicOpenRequest[] {
  if (!Array.isArray(value)) throw new Error("Open requests were not returned.");
  return value.map(item => {
    const row = object(item);
    if (Object.keys(row).some(key => !["id", "market", "status", "createdAt"].includes(key)) || row.status !== "open") throw new Error("Public open requests returned unexpected private fields.");
    return {id: checkedDiscoveryId(row.id), market: sameMarket(row.market, market), status: "open", createdAt: checkedDate(row.createdAt)};
  });
}
export function checkedOpenRfqPricing(value: unknown, market: LenderMarket): PricingOpenRequest[] {
  if (!Array.isArray(value)) throw new Error("Open requests for pricing were not returned.");
  return value.map(item => {
    const row = object(item);
    if (Object.keys(row).some(key => !["id", "market", "status", "createdAt", "borrower", "terms"].includes(key)) || row.status !== "open") throw new Error("The pricing board returned unexpected quote or disclosure fields.");
    return {id: checkedDiscoveryId(row.id), market: sameMarket(row.market, market), status: "open", createdAt: checkedDate(row.createdAt), borrower: checkedDiscoveryParty(row.borrower), terms: checkedDiscoveryTerms(row.terms, market)};
  });
}
export function checkedOpenRfqRequest(value: unknown, market: LenderMarket, packageId?: string): OpenRfqRequest {
  const row = object(value), disclosure = object(row.disclosure);
  if (row.status !== "open" && row.status !== "closed") throw new Error("Invalid open request status.");
  if (typeof disclosure.templateId !== "string" || !/^[a-f0-9]{64}:Symbolon\.OpenRequest:OpenRequest$/.test(disclosure.templateId)
    || packageId && disclosure.templateId !== `${packageId}:Symbolon.OpenRequest:OpenRequest`
    || disclosure.synchronizerId !== market.synchronizerId || typeof disclosure.createdEventBlob !== "string" || !disclosure.createdEventBlob || disclosure.createdEventBlob.length > 524288
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(disclosure.createdEventBlob)) throw new Error("The open request disclosure is invalid or belongs to another deployment.");
  return {id: checkedDiscoveryId(row.id), market: sameMarket(row.market, market), status: row.status, createdAt: checkedDate(row.createdAt), borrower: checkedDiscoveryParty(row.borrower),
    terms: checkedDiscoveryTerms(row.terms, market), publishUpdateId: checkedOpenRfqReceiptId(row.publishUpdateId), disclosure: {
      templateId: disclosure.templateId, contractId: checkedOpenRfqReceiptId(disclosure.contractId), createdEventBlob: disclosure.createdEventBlob, synchronizerId: market.synchronizerId},
    ...(row.status === "closed" ? {closedUpdateId: checkedOpenRfqReceiptId(row.closedUpdateId), closedAt: checkedDate(row.closedAt)} : {})};
}
export function checkedOpenRfqQuote(value: unknown): OpenRfqQuote {
  const row = object(value), rate = numeric10(row.rate);
  if (BigInt(rate.replace(".", "")) > 10000000000n) throw new Error("The quote rate is out of range.");
  return {requestId: checkedDiscoveryId(row.requestId), dealer: checkedDiscoveryParty(row.dealer), rate, validUntil: checkedDate(row.validUntil),
    quoteContractId: checkedOpenRfqReceiptId(row.quoteContractId), updateId: checkedOpenRfqReceiptId(row.updateId), createdAt: checkedDate(row.createdAt)};
}
export function checkedOwnOpenRfq(value: unknown, market: LenderMarket, party: string, packageId?: string): OwnOpenRfq {
  const row = object(value);
  sameMarket(row.market, market);
  if (!Array.isArray(row.requests) || !Array.isArray(row.quotes)) throw new Error("Your own open request records were not returned.");
  const requests = row.requests.map(item => {
    const record = object(item), request = checkedOpenRfqRequest(record, market, packageId);
    if (request.borrower !== party || !Array.isArray(record.quotes)) throw new Error("The request is not your own.");
    const quotes = record.quotes.map(checkedOpenRfqQuote);
    if (quotes.some(quote => quote.requestId !== request.id || quote.dealer === party)) throw new Error("A quote belongs to another request.");
    return {...request, quotes};
  });
  const quotes = row.quotes.map(item => {
    const record = object(item), request = checkedOpenRfqRequest(record.request, market, packageId), quote = checkedOpenRfqQuote(record.quote);
    if (quote.dealer !== party || quote.requestId !== request.id || request.borrower === party) throw new Error("The quote is not your own.");
    return {request, quote};
  });
  return {requests, quotes};
}
