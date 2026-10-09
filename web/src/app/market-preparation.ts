import type { Contract } from "../ledger/api";
import { deployment, type Deployment } from "../ledger/deployment";
import type { Session } from "../ledger/session";
import { decimalUnits, isFresh, num, type DeskState, type PriceFeed, type RepoPosition } from "../ledger/symbolon";
import { marketIdentity } from "./MarketOverview";
import { matchesPair } from "./terminal-state";
import { publicMarket } from "./market-summary";

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

/** Only the existing public test oracle can refresh its expired position mark. */
export function canRefreshTestPositionMark(session: Pick<Session, "kind" | "party" | "networkId">, position: RepoPosition,
  feed: PriceFeed | undefined, d: Deployment = deployment(), now = Date.now()): boolean {
  if (!feed || !d.publicDesk || d.network !== "devnet" || session.networkId !== "devnet" || !["account", "wallet"].includes(session.kind)) return false;
  // The existing SetPrice builder accepts numbers; refuse any price it would round differently.
  try { if (decimalUnits(feed.price) !== decimalUnits(num(feed.price))) return false; } catch { return false; }
  const at = Date.parse(feed.asOf), age = num(position.maxPriceAgeSeconds);
  return session.party === d.publicDesk.operator && session.party === position.oracle && session.party === feed.oracle
    && publicMarket(feed, d) && matchesPair(position, feed) && feed.readers.includes(position.borrower) && Number.isFinite(at) && at <= now
    && Number.isFinite(age) && age > 0 && Number.isFinite(num(feed.price)) && num(feed.price) > 0 && !isFresh(feed, age, now);
}
