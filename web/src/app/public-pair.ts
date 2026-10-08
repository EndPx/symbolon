import type { Contract } from "../ledger/api";
import type { Deployment } from "../ledger/deployment";
import type { PriceFeed } from "../ledger/symbolon";
import { publicMarket } from "./market-summary";

export function publishedPair(d: Deployment): Contract<PriceFeed> | null {
  if (d.network !== "devnet" || !d.publicDesk) return null;
  return { contractId: "public-reference", templateId: "public-reference", payload: {
    oracle: d.publicDesk.operator, instrumentIssuer: d.assets.collateral.admin!,
    instrument: d.assets.collateral.symbol, cashIssuer: d.assets.cash.admin!,
    cashInstrument: d.assets.cash.symbol, price: d.publicDesk.referencePrice, asOf: "", readers: [],
  } };
}
export function marketDiscoveryRows(pairs: Contract<PriceFeed>[], d: Deployment) {
  const reference = publishedPair(d);
  return reference && !pairs.some(pair => publicMarket(pair.payload, d)) ? [reference, ...pairs] : pairs;
}
