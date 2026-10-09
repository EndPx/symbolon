import { num, type DeskState } from "../ledger/symbolon";

export type HoldingBalance = { key: string; instrument: string; issuer: string; available: number; locked: number };

export function holdingBalances(state: DeskState, party: string): HoldingBalance[] {
  const rows = new Map<string,HoldingBalance>();
  for (const {payload:holding} of state.holdings) {
    if (holding.owner !== party) continue;
    const key = JSON.stringify([holding.issuer,holding.instrument]);
    const row = rows.get(key) ?? {key,instrument:holding.instrument,issuer:holding.issuer,available:0,locked:0};
    if (holding.lockParties?.length === 0) row.available += num(holding.amount);
    else row.locked += num(holding.amount);
    rows.set(key,row);
  }
  return [...rows.values()].sort((a,b)=>a.instrument.localeCompare(b.instrument)||a.issuer.localeCompare(b.issuer));
}
