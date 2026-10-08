import type { Contract } from "../ledger/api";
import { deployment, type Deployment } from "../ledger/deployment";
import type { Session } from "../ledger/session";
import { isFresh, type DeskState, type PriceFeed } from "../ledger/symbolon";
import { marketIdentity } from "./MarketOverview";

export function canPrepareReference(session: Session, feed: PriceFeed, d: Deployment = deployment()): boolean {
  const desk = d.publicDesk;
  const at = Date.parse(feed.asOf);
  return d.network === "devnet" && !!desk && ["account","wallet"].includes(session.kind)
    && session.party !== desk.operator && feed.readers.includes(session.party)
    && feed.oracle === desk.operator && feed.instrumentIssuer === desk.operator && feed.cashIssuer === desk.operator
    && feed.instrument === "cBTC-demo" && feed.cashInstrument === "USDCx-demo"
    && Number.isFinite(at) && at <= Date.now() && Number(feed.price) > 0;
}

export function preparedReference(state: DeskState, original: PriceFeed, ageSeconds: number): Contract<PriceFeed> | undefined {
  return state.feeds.filter(item => marketIdentity(item.payload) === marketIdentity(original) && isFresh(item.payload,ageSeconds))
    .sort((a,b) => Date.parse(b.payload.asOf)-Date.parse(a.payload.asOf))[0];
}
