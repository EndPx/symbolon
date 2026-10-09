import { deployment } from "./deployment";
import { accountDirectoryRequest } from "./account";
import type { PriceFeed } from "./symbolon";
import { checkedLenderMarket, eligibleLenders, lenderMarketKey, type LenderMarket, type RegisteredLender } from "./lender-directory-model";
export { eligibleLenders, lenderMarketKey, sameRecipients, type LenderMarket, type RegisteredLender } from "./lender-directory-model";

export function lenderMarket(feed: PriceFeed): LenderMarket | null {
  const d = deployment();
  if (d.network !== "devnet" || !d.synchronizerId || !d.corePackageId) return null;
  return checkedLenderMarket({network: "devnet", synchronizerId: d.synchronizerId, corePackageId: d.corePackageId,
    oracle: feed.oracle, collateralIssuer: feed.instrumentIssuer, collateralInstrument: feed.instrument, cashIssuer: feed.cashIssuer, cashInstrument: feed.cashInstrument});
}
export async function readLenders(market: LenderMarket, signal?: AbortSignal): Promise<RegisteredLender[]> {
  const response = await fetch(`/api/lenders?market=${encodeURIComponent(JSON.stringify(market))}`, {credentials: "omit", cache: "no-store", redirect: "error", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000)});
  const value = await response.json().catch(() => null);
  if (!response.ok) throw new Error(value?.error ?? "The lender directory is unavailable. Try again before sending.");
  if (!value || lenderMarketKey(checkedLenderMarket(value.market)) !== lenderMarketKey(market) || !Array.isArray(value.lenders)) throw new Error("The lender directory returned a different market.");
  return eligibleLenders(value.lenders, "");
}
export async function registerLender(market: LenderMarket, party: string, name: string, active: boolean): Promise<void> {
  await accountDirectoryRequest({market, party, name, active});
}
