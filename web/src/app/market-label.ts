import { partyLabel, type PriceFeed } from "../ledger/symbolon";
import { deployment, type Deployment } from "../ledger/deployment";
import { publicMarket } from "./market-summary";

export function partyDisplayName(party: string, name?: string, config = deployment()) {
  const label = party === config.publicDesk?.operator ? config.publicDesk.label.replace(/\bdealer\b/gi, "lender")
    : (name || partyLabel(party)).replace(/^dealer/i, "lender");
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-/i.test(label)) return `Account ${label.slice(0, 6)}…${label.slice(-4)}`;
  const proofAlias = /^[a-f0-9]{8}-symbolon-proof-([a-f0-9]+)-(.+)$/i.exec(label);
  if (proofAlias) return `${proofAlias[2].replace(/^dealer/i, "lender")} · ${proofAlias[1].slice(0, 4)}`;
  return label.length > 24 ? `${label.slice(0, 12)}…${label.slice(-8)}` : label;
}

export function priceFeedLabel(feed: PriceFeed, config: Deployment) {
  if (publicMarket(feed, config)) return "Symbolon test market";
  const name = (party: string) => partyDisplayName(party, undefined, config);
  return feed.oracle === feed.instrumentIssuer && feed.cashIssuer === feed.instrumentIssuer
    ? `${name(feed.oracle)} · self-published price`
    : `Oracle ${name(feed.oracle)} · Issuer ${name(feed.instrumentIssuer)}${feed.cashIssuer !== feed.instrumentIssuer ? ` · Cash issuer ${name(feed.cashIssuer)}` : ""}`;
}
