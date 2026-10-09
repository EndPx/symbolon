import { decimalUnits, feedFor, health, num, type Health, type PriceFeed, type RepoQuote, type RepoPosition } from "../ledger/symbolon";
import type { Contract } from "../ledger/api";

const SCALE = 10_000_000_000n;
const LIMIT = 10n ** 38n;
function rounded(n: bigint, d: bigint): bigint {
  const q = n / d, r = n % d;
  return q + (r * 2n > d || r * 2n === d && q % 2n === 1n ? 1n : 0n);
}
function numeric(value: string) {
  const units = decimalUnits(value);
  if (units >= LIMIT) throw new Error("Amount exceeds Numeric 10 precision.");
  return units;
}
function decimal(units: bigint) {
  if (units >= LIMIT) throw new Error("Amount exceeds Numeric 10 precision.");
  return `${units / SCALE}.${(units % SCALE).toString().padStart(10, "0")}`;
}

/** Display the same Numeric 10 operation order as RepoQuote.Accept. */
export function offerAmounts(q: Pick<RepoQuote, "cashAmount" | "rate" | "termDays">) {
  const principal = numeric(q.cashAmount), rate = numeric(q.rate);
  if (!/^[1-9]\d*$/.test(String(q.termDays)) || Number(q.termDays) > 365) throw new Error("Invalid financing duration.");
  const annualInterest = rounded(principal * rate, SCALE);
  if (annualInterest * BigInt(q.termDays) >= LIMIT) throw new Error("Interest exceeds Numeric 10 precision.");
  const interest = rounded(annualInterest * BigInt(q.termDays), 360n);
  return { interest: decimal(interest), repayment: decimal(principal + interest) };
}

export function marginCallPrice(p: Pick<RepoPosition, "cashAmount" | "marginThresholdPct" | "collateralAmount">): string | null {
  try {
    const qty = numeric(p.collateralAmount), principal = numeric(p.cashAmount), cover = numeric(p.marginThresholdPct);
    if (qty === 0n || principal === 0n || cover < SCALE) return null;
    const required = rounded(principal * cover, SCALE);
    return decimal(rounded(required * SCALE, qty));
  } catch { return null; }
}

/** Format decimal text without converting monetary values to floating point. */
export function displayDecimal(value: string, places = 4) {
  if (!/^\d+(?:\.\d+)?$/.test(value) || !Number.isInteger(places) || places < 0 || places > 38) throw new Error("Invalid balance.");
  const [whole, fraction = ""] = value.split(".");
  const scale = 10n ** BigInt(places);
  const extra = fraction.slice(places);
  let units = BigInt(whole) * scale + BigInt(fraction.slice(0, places).padEnd(places, "0") || "0");
  if (extra && extra[0] >= "5") units++;
  const grouped = (units / scale).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return places ? `${grouped}.${(units % scale).toString().padStart(places, "0")}` : grouped;
}

export function healthPresentation(h: Pick<Health, "priceKnown" | "factor">) {
  if (!h.priceKnown || !Number.isFinite(h.factor)) return { tone: "unknown", label: "Price unavailable" } as const;
  if (h.factor < 1) return { tone: "danger", label: "Below margin" } as const;
  if (h.factor < 1.2) return { tone: "caution", label: "Near margin" } as const;
  return { tone: "covered", label: "Margin covered" } as const;
}

/** Historical display only; expired figures never change the authoritative action guards. */
export function positionHealthDisplay(position: RepoPosition, feeds: Contract<PriceFeed>[], now = Date.now()) {
  const h = health(position, feeds, now), feed = feedFor(feeds, position);
  const at = feed ? Date.parse(feed.payload.asOf) : NaN;
  const price = feed ? num(feed.payload.price) : NaN;
  const lastFactor = price * num(position.collateralAmount) / h.requiredValue;
  const state = !feed ? "missing" : !Number.isFinite(at) || !Number.isFinite(price) || price <= 0 || !Number.isFinite(lastFactor) || lastFactor <= 0 ? "invalid"
    : at > now ? "future" : h.priceKnown ? "current" : "expired";
  const label = state === "expired" ? "Price expired" : state === "future" ? "Future-dated price" : state === "invalid" ? "Invalid price" : "Price unavailable";
  return { health: h, feed, state, factor: state === "current" ? h.factor : state === "expired" ? lastFactor : null,
    lastMark: state === "expired", risk: state === "current" ? healthPresentation(h) : { tone: "unknown" as const, label } };
}
