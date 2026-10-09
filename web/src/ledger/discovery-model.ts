import { checkedLenderMarket, lenderMarketKey, type LenderMarket } from "./lender-directory-model.js";

/** Off-ledger intent. Financial terms are not part of the public discovery DTO. */
export type DiscoveryTerms = {
  oracle: string; collateralIssuer: string; collateralInstrument: string;
  collateralAmount: string; cashIssuer: string; cashInstrument: string;
  cashAmount: string; termDays: number; marginThresholdPct: string;
  cureSeconds: number; maxPriceAgeSeconds: number;
};
export type PublicOpportunity = { id: string; market: LenderMarket; status: "open"; createdAt: string };
export type DiscoveryInterest = {
  id: string; party: string; name: string; status: "pending" | "approved"; createdAt: string;
  approvedAt?: string; requestUpdateId?: string; requestContractId?: string;
};
export type OwnOpportunity = {
  id: string; market: LenderMarket; status: "open" | "closed"; createdAt: string;
  terms: DiscoveryTerms; incoming: DiscoveryInterest[];
};
export type OutgoingInterest = {
  id: string; opportunityId: string; market: LenderMarket; opportunityStatus: "open" | "closed";
  status: "pending" | "approved"; createdAt: string;
  /** Only an approved requester receives these already-disclosed bilateral details. */
  borrower?: string; terms?: DiscoveryTerms; approvedAt?: string;
  requestUpdateId?: string; requestContractId?: string;
};
export type OwnDiscovery = { opportunities: OwnOpportunity[]; outgoing: OutgoingInterest[] };

const termFields = ["oracle", "collateralIssuer", "collateralInstrument", "collateralAmount", "cashIssuer", "cashInstrument", "cashAmount", "termDays", "marginThresholdPct", "cureSeconds", "maxPriceAgeSeconds"] as const;
const identityFields = ["oracle", "collateralIssuer", "collateralInstrument", "cashIssuer", "cashInstrument"] as const;
export function numeric10(value: unknown): string {
  if (typeof value !== "string" || !/^(0|[1-9]\d{0,24})(\.\d{1,10})?$/.test(value)) throw new Error("Use a positive decimal with at most 10 fractional digits.");
  const [whole, fraction = ""] = value.split(".");
  return `${whole}.${fraction.padEnd(10, "0")}`;
}
export function checkedDiscoveryTerms(value: unknown, market: LenderMarket): DiscoveryTerms {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid financing terms.");
  const body = value as Record<string, unknown>;
  if (Object.keys(body).length !== termFields.length || termFields.some(field => !(field in body))) throw new Error("Invalid financing terms.");
  if (identityFields.some(field => body[field] !== market[field])) throw new Error("The financing terms belong to another market.");
  const collateralAmount = numeric10(body.collateralAmount), cashAmount = numeric10(body.cashAmount), marginThresholdPct = numeric10(body.marginThresholdPct);
  const units = (value: string) => BigInt(value.replace(".", ""));
  if (units(collateralAmount) <= 0n || units(cashAmount) <= 0n || units(marginThresholdPct) < 10000000000n || units(marginThresholdPct) > 20000000000n) throw new Error("Amounts must be positive and maintenance margin must be between 100% and 200%.");
  for (const [field, min, max] of [["termDays", 1, 365], ["cureSeconds", 1, 604800], ["maxPriceAgeSeconds", 1, 86400]] as const) {
    if (!Number.isSafeInteger(body[field]) || Number(body[field]) < min || Number(body[field]) > max) throw new Error("The financing duration or risk terms are out of range.");
  }
  return { ...Object.fromEntries(identityFields.map(field => [field, market[field]])), collateralAmount, cashAmount, marginThresholdPct,
    termDays: body.termDays, cureSeconds: body.cureSeconds, maxPriceAgeSeconds: body.maxPriceAgeSeconds } as DiscoveryTerms;
}
export function sameDiscoveryTerms(a: DiscoveryTerms, b: DiscoveryTerms): boolean {
  return termFields.every(field => a[field] === b[field]);
}
export function checkedDiscoveryId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value)) throw new Error("Invalid opportunity or access request ID.");
  return value;
}
export function checkedDiscoveryParty(value: unknown): string {
  if (typeof value !== "string" || value.length > 512 || !/^[^\s\x00-\x1f]+::[^\s\x00-\x1f]+$/.test(value)) throw new Error("Supply your full authorized party ID.");
  return value;
}
export function checkedInterestName(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.length > 80 || /[\x00-\x1f]/.test(value)) throw new Error("Use a name of 1–80 characters.");
  return value.trim();
}
export function publicOpportunity(value: { id: string; market: LenderMarket; status: string; createdAt: string }): PublicOpportunity {
  if (value.status !== "open" || !Number.isFinite(Date.parse(value.createdAt))) throw new Error("Invalid public opportunity.");
  return {id: checkedDiscoveryId(value.id), market: checkedLenderMarket(value.market), status: "open", createdAt: value.createdAt};
}
export function checkedPublicOpportunities(value: unknown, market: LenderMarket): PublicOpportunity[] {
  if (!Array.isArray(value)) throw new Error("The discovery board returned invalid opportunities.");
  return value.map(item => {
    if (!item || typeof item !== "object" || Object.keys(item).some(key => !["id", "market", "status", "createdAt"].includes(key))) throw new Error("The public discovery board returned unexpected private fields.");
    const checked = publicOpportunity(item);
    if (lenderMarketKey(checked.market) !== lenderMarketKey(market)) throw new Error("The opportunity belongs to another market.");
    return checked;
  });
}
export function checkedOwnDiscovery(value: unknown, market: LenderMarket): OwnDiscovery {
  const record = (value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The private discovery response is invalid.");
    return value as Record<string, unknown>;
  };
  const date = (value: unknown) => {
    if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new Error("The discovery timestamp is invalid.");
    return value;
  };
  const checkedMarket = (value: unknown) => {
    const result = checkedLenderMarket(value);
    if (lenderMarketKey(result) !== lenderMarketKey(market)) throw new Error("The private discovery response belongs to another market.");
    return result;
  };
  const state = (value: unknown): "open" | "closed" => {
    if (value !== "open" && value !== "closed") throw new Error("The opportunity status is invalid.");
    return value;
  };
  const approval = (body: Record<string, unknown>) => {
    if (body.status !== "pending" && body.status !== "approved") throw new Error("The access request status is invalid.");
    if (body.status === "pending") {
      if (["approvedAt", "borrower", "terms", "requestContractId", "requestUpdateId"].some(field => field in body)) throw new Error("Pending access returned private financing details.");
      return {status: "pending" as const};
    }
    if (typeof body.requestContractId !== "string" || !body.requestContractId || typeof body.requestUpdateId !== "string" || !body.requestUpdateId) throw new Error("An approved access request is missing its ledger receipt.");
    return {status: "approved" as const, approvedAt: date(body.approvedAt), requestContractId: body.requestContractId, requestUpdateId: body.requestUpdateId};
  };
  const body = record(value);
  checkedMarket(body.market);
  if (!Array.isArray(body.opportunities) || !Array.isArray(body.outgoing)) throw new Error("Private discovery records were not returned.");
  const opportunities = body.opportunities.map(value => {
    const row = record(value);
    if (!Array.isArray(row.incoming)) throw new Error("Incoming access requests were not returned.");
    return {id: checkedDiscoveryId(row.id), market: checkedMarket(row.market), status: state(row.status), createdAt: date(row.createdAt), terms: checkedDiscoveryTerms(row.terms, market),
      incoming: row.incoming.map(value => {const interest = record(value); return {id: checkedDiscoveryId(interest.id), party: checkedDiscoveryParty(interest.party), name: checkedInterestName(interest.name), createdAt: date(interest.createdAt), ...approval(interest)};})};
  });
  const outgoing = body.outgoing.map(value => {
    const row = record(value), approved = approval(row);
    return {id: checkedDiscoveryId(row.id), opportunityId: checkedDiscoveryId(row.opportunityId), market: checkedMarket(row.market), opportunityStatus: state(row.opportunityStatus),
      createdAt: date(row.createdAt), ...approved, ...(approved.status === "approved" ? {borrower: checkedDiscoveryParty(row.borrower), terms: checkedDiscoveryTerms(row.terms, market)} : {})};
  });
  return {opportunities, outgoing};
}
