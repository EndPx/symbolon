export const ACCOUNT_RESUME_KEY = "symbolon.account.resume.v1";
const RETENTION = 8 * 60 * 60 * 1000;
export interface AccountResume { version: 1; origin: string; network: "devnet"; subject: string; party: string; savedAt: number; }

/** This is a sign-in preference, never an access token or a grant of party rights. */
export function parseAccountResume(raw: string | null, origin: string, now = Date.now()): AccountResume | null {
  try {
    if (!raw || raw.length > 4096) return null;
    const r = JSON.parse(raw);
    if (r?.version !== 1 || r.origin !== origin || r.network !== "devnet" || typeof r.subject !== "string" || !r.subject
      || typeof r.party !== "string" || !r.party.includes("::") || !Number.isFinite(r.savedAt) || now < r.savedAt || now - r.savedAt > RETENTION
      || Object.keys(r).some(key => !["version", "origin", "network", "subject", "party", "savedAt"].includes(key))) return null;
    return r;
  } catch { return null; }
}

export function resumedParty(preference: AccountResume | null, subject: string, authorized: string[]): string | undefined {
  return preference?.subject === subject && authorized.includes(preference.party) ? preference.party : undefined;
}
