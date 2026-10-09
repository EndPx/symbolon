/// <reference types="node" />
import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";
import { checkedLenderMarket, lenderMarketKey, type LenderMarket, type RegisteredLender } from "../src/ledger/lender-directory-model.js";
import profile from "../public/deployment.json" with { type: "json" };

const issuer = "https://keycloak.naas.noders.services/realms/noders-appsfactory";
const ledger = "https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services";
export class DirectoryError extends Error { constructor(readonly status: number, message: string) { super(message); } }
export interface DirectoryStore {
  list(market: LenderMarket): Promise<RegisteredLender[]>;
  set(market: LenderMarket, party: string, name: string, active: boolean): Promise<void>;
}
export function directoryStore(connectionString: string): DirectoryStore {
  const sql = neon(connectionString.trim());
  const key = (market: LenderMarket) => createHash("sha256").update(lenderMarketKey(market)).digest("hex");
  return {
    async list(market) {
      const rows = await sql`SELECT party, name, registered_at FROM symbolon_lenders WHERE market_key = ${key(market)} AND active = true ORDER BY party`;
      return rows.map(row => ({party: String(row.party), name: String(row.name), registeredAt: new Date(String(row.registered_at)).toISOString()}));
    },
    async set(market, party, name, active) {
      await sql`INSERT INTO symbolon_lenders (market_key, market, party, name, active) VALUES (${key(market)}, ${JSON.stringify(market)}::jsonb, ${party}, ${name}, ${active}) ON CONFLICT (market_key, party) DO UPDATE SET name = EXCLUDED.name, active = EXCLUDED.active, updated_at = now()`;
    },
  };
}
export async function requireOwnParty(token: string, party: string, request = fetch): Promise<void> {
  let claims: {sub?: string; iss?: string; exp?: number; typ?: string};
  try { claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")); }
  catch { throw new DirectoryError(401, "Connect your HackCanton account again."); }
  if (claims.iss !== issuer || claims.typ === "ID" || typeof claims.sub !== "string" || !claims.sub || claims.sub.length > 256 || !Number.isFinite(claims.exp) || claims.exp! * 1000 <= Date.now()) throw new DirectoryError(401, "Connect your HackCanton account again.");
  // Decoding is not authentication. The pinned participant verifies the bearer
  // token and its current rights; neither URL nor user ID comes from the body.
  const read = async (path: string) => {
    const response = await request(`${ledger}/v2/users/${encodeURIComponent(claims.sub!)}${path}`, {headers: {Authorization: `Bearer ${token}`}, credentials: "omit", redirect: "error", signal: AbortSignal.timeout(15000)});
    if (!response.ok) throw new DirectoryError(response.status === 401 ? 401 : response.status === 403 ? 403 : 503, "The participant could not verify this account's party rights.");
    return response.json();
  };
  const user = (await read("")).user;
  if (!user || user.id !== claims.sub || user.isDeactivated) throw new DirectoryError(403, "This ledger account is unavailable.");
  const rights = (await read("/rights")).rights;
  if (!Array.isArray(rights) || !rights.some(right => right?.kind?.CanActAs?.value?.party === party)) throw new DirectoryError(403, "You can only register a party your account is authorized to act as.");
}
function deploymentMarket(value: unknown): LenderMarket {
  const market = checkedLenderMarket(value);
  if (profile.network !== "devnet" || !profile.tradingEnabled || market.synchronizerId !== profile.synchronizerId || market.corePackageId !== profile.corePackageId) throw new DirectoryError(400, "This market does not match the current DevNet deployment.");
  return market;
}
export async function directoryOperation(method: string, value: unknown, authorization: string, store: DirectoryStore, verify = requireOwnParty) {
  if (method === "GET") {
    const market = deploymentMarket(value);
    return {market, lenders: await store.list(market)};
  }
  if (method !== "POST") throw new DirectoryError(405, "Use GET or POST.");
  const body = value as Record<string, unknown>;
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(key => !["market", "party", "name", "active"].includes(key))) throw new DirectoryError(400, "Invalid lender registration.");
  const market = deploymentMarket(body.market);
  if (typeof body.party !== "string" || body.party.length > 512 || !/^[^\s\x00-\x1f]+::[^\s\x00-\x1f]+$/.test(body.party)
    || typeof body.name !== "string" || !body.name.trim() || body.name.length > 80 || /[\x00-\x1f]/.test(body.name) || typeof body.active !== "boolean") throw new DirectoryError(400, "Supply your full party ID and a lender name of 1–80 characters.");
  if (!/^Bearer [A-Za-z0-9._-]+$/.test(authorization) || authorization.length > 16384) throw new DirectoryError(401, "Connect a HackCanton account to register as a lender.");
  await verify(authorization.slice(7), body.party);
  await store.set(market, body.party, body.name.trim(), body.active);
  return {registered: body.active};
}

type Request = {method?: string; headers: Record<string, string | string[] | undefined>; query: Record<string, string | string[] | undefined>; body?: unknown};
type Response = {status(code: number): Response; json(body: unknown): void; setHeader(key: string, value: string): void};
export default async function handler(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  try {
    if (!process.env.SYMBOLON_DIRECTORY_DATABASE_URL) throw new DirectoryError(503, "The lender directory is not configured yet.");
    if (req.method === "POST" && req.headers.origin && req.headers.origin !== `https://${req.headers.host}`) throw new DirectoryError(403, "Register through the Symbolon app.");
    const raw = req.method === "GET" ? req.query.market : req.body;
    if ((typeof raw === "string" && raw.length > 8192) || Number(req.headers["content-length"] ?? 0) > 8192) throw new DirectoryError(413, "The directory request is too large.");
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    const authorization = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
    const result = await directoryOperation(req.method ?? "", value, authorization, directoryStore(process.env.SYMBOLON_DIRECTORY_DATABASE_URL));
    res.status(200).json(result);
  } catch (error) {
    const status = error instanceof DirectoryError ? error.status : error instanceof SyntaxError || (error instanceof Error && /^The lender market|^Select a supported/.test(error.message)) ? 400 : 503;
    res.status(status).json({error: error instanceof DirectoryError || status === 400 ? (error as Error).message : "The lender directory is temporarily unavailable. Try again before sending."});
  }
}
