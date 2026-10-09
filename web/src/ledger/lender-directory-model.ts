export type LenderMarket = {
  network: "devnet"; synchronizerId: string; corePackageId: string;
  oracle: string; collateralIssuer: string; collateralInstrument: string;
  cashIssuer: string; cashInstrument: string;
};
export type RegisteredLender = { party: string; name: string; registeredAt: string };
const fields = ["network", "synchronizerId", "corePackageId", "oracle", "collateralIssuer", "collateralInstrument", "cashIssuer", "cashInstrument"] as const;

export function checkedLenderMarket(value: unknown): LenderMarket {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Select a supported DevNet market.");
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== fields.length || fields.some(key => typeof record[key] !== "string" || !(record[key] as string).trim() || (record[key] as string).length > 512)) throw new Error("The lender market is invalid.");
  if (record.network !== "devnet" || !/^[a-f0-9]{64}$/.test(record.corePackageId as string)
    || ["oracle", "collateralIssuer", "cashIssuer", "synchronizerId"].some(key => !(record[key] as string).includes("::"))) throw new Error("The lender market is invalid.");
  return Object.fromEntries(fields.map(key => [key, record[key]])) as LenderMarket;
}
export function lenderMarketKey(market: LenderMarket): string { return JSON.stringify(fields.map(key => market[key])); }
export function eligibleLenders(lenders: RegisteredLender[], borrower: string): RegisteredLender[] {
  if (lenders.some(lender => !lender || typeof lender.party !== "string" || !lender.party.includes("::") || typeof lender.name !== "string" || lender.name.length > 80 || !Number.isFinite(Date.parse(lender.registeredAt)))) throw new Error("The lender directory returned invalid entries.");
  const unique = new Map(lenders.filter(lender => lender.party !== borrower).map(lender => [lender.party, lender]));
  return [...unique.values()].sort((a, b) => a.party.localeCompare(b.party));
}
export function sameRecipients(a: RegisteredLender[], b: RegisteredLender[]): boolean {
  return JSON.stringify(a.map(lender => lender.party)) === JSON.stringify(b.map(lender => lender.party));
}
