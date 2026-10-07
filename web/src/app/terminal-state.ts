import type { DeskState, PriceFeed, QuoteRequest } from "../ledger/symbolon";

export type TradeSide = "borrow" | "lend";
export type ContentTab = "overview" | "offers" | "positions" | "activity";

export function tabForKey<T extends string>(key: string, current: T, values: readonly T[]): T | null {
  const index = values.indexOf(current);
  if (key === "Home") return values[0] ?? null;
  if (key === "End") return values.at(-1) ?? null;
  if (key === "ArrowRight") return values[(index + 1) % values.length] ?? null;
  if (key === "ArrowLeft") return values[(index - 1 + values.length) % values.length] ?? null;
  return null;
}

export function matchesPair(value: Pick<QuoteRequest, "oracle" | "collateralIssuer" | "collateralInstrument" | "cashIssuer" | "cashInstrument">, feed: PriceFeed): boolean {
  return value.oracle === feed.oracle && value.collateralIssuer === feed.instrumentIssuer &&
    value.collateralInstrument === feed.instrument && value.cashIssuer === feed.cashIssuer &&
    value.cashInstrument === feed.cashInstrument;
}

/** Keep balances issuer-separated and available for collateral substitution. */
export function marketDesk(state: DeskState, feed: PriceFeed): DeskState {
  const positions = state.positions.filter(({ payload }) => matchesPair(payload, feed));
  const positionIds = new Set(positions.map(({ contractId }) => contractId));
  return {
    ...state,
    requests: state.requests.filter(({ payload }) => matchesPair(payload, feed)),
    quotes: state.quotes.filter(({ payload }) => matchesPair(payload, feed)),
    positions,
    proposals: state.proposals.filter(({ payload }) => positionIds.has(payload.posCid)),
    // ClosedRepo stores both asset identities, but does not retain the oracle.
    closed: state.closed.filter(({ payload }) => payload.collateralIssuer === feed.instrumentIssuer &&
      payload.collateralInstrument === feed.instrument && payload.cashIssuer === feed.cashIssuer &&
      payload.cashInstrument === feed.cashInstrument),
  };
}
