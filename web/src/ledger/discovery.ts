import { accountDiscoveryRequest } from "./account";
import { checkedLenderMarket, lenderMarketKey, type LenderMarket } from "./lender-directory-model";
import { checkedDiscoveryId, checkedDiscoveryParty, checkedDiscoveryTerms, checkedInterestName, checkedOwnDiscovery, checkedPublicOpportunities,
  type DiscoveryTerms, type OwnDiscovery, type PublicOpportunity } from "./discovery-model";
export type { DiscoveryTerms, DiscoveryInterest, OwnDiscovery, OwnOpportunity, OutgoingInterest, PublicOpportunity } from "./discovery-model";

export async function readOpportunities(market: LenderMarket, signal?: AbortSignal): Promise<PublicOpportunity[]> {
  const response = await fetch(`/api/discovery?market=${encodeURIComponent(JSON.stringify(market))}`, {credentials: "omit", cache: "no-store", redirect: "error",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000)});
  const value = await response.json().catch(() => null);
  if (!response.ok) throw new Error(value?.error ?? "Discovery is unavailable. Refresh before publishing or requesting access.");
  if (!value || lenderMarketKey(checkedLenderMarket(value.market)) !== lenderMarketKey(market)) throw new Error("The discovery board returned another market.");
  return checkedPublicOpportunities(value.opportunities, market);
}
export async function readOwnDiscovery(market: LenderMarket, party: string): Promise<OwnDiscovery> {
  return checkedOwnDiscovery(await accountDiscoveryRequest("GET", {market, scope: "mine", party: checkedDiscoveryParty(party)}), market);
}
export async function publishOpportunity(market: LenderMarket, party: string, terms: DiscoveryTerms): Promise<PublicOpportunity> {
  const value = await accountDiscoveryRequest("POST", {op: "publish", market, party: checkedDiscoveryParty(party), terms: checkedDiscoveryTerms(terms, market)}) as {opportunity?: PublicOpportunity};
  const checked = checkedPublicOpportunities([value?.opportunity], market)[0];
  if (lenderMarketKey(checked.market) !== lenderMarketKey(market)) throw new Error("Publication returned another market.");
  return checked;
}
export async function requestOpportunityAccess(market: LenderMarket, party: string, opportunityId: string, name: string): Promise<{id: string; status: "pending" | "approved"}> {
  const value = await accountDiscoveryRequest("POST", {op: "request-access", market, party: checkedDiscoveryParty(party), opportunityId: checkedDiscoveryId(opportunityId), name: checkedInterestName(name)}) as {interest?: {id: unknown; status: unknown}};
  if (value?.interest?.status !== "pending" && value?.interest?.status !== "approved") throw new Error("Access was not confirmed. Refresh before requesting again.");
  return {id: checkedDiscoveryId(value.interest.id), status: value.interest.status};
}
export async function approveOpportunityAccess(market: LenderMarket, party: string, opportunityId: string, interestId: string, updateId: string, contractId: string): Promise<void> {
  const value = await accountDiscoveryRequest("POST", {op: "approve", market, party: checkedDiscoveryParty(party), opportunityId: checkedDiscoveryId(opportunityId), interestId: checkedDiscoveryId(interestId), updateId, contractId}) as {approved?: boolean; requestContractId?: string; requestUpdateId?: string};
  if (value?.approved !== true || value.requestContractId !== contractId || value.requestUpdateId !== updateId) throw new Error("Access approval was not confirmed. Check the existing ledger request before retrying.");
}
export async function closeOpportunity(market: LenderMarket, party: string, opportunityId: string): Promise<void> {
  const value = await accountDiscoveryRequest("POST", {op: "close", market, party: checkedDiscoveryParty(party), opportunityId: checkedDiscoveryId(opportunityId)}) as {closed?: boolean};
  if (value?.closed !== true) throw new Error("Listing closure was not confirmed. Refresh before retrying.");
}
