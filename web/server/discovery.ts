/// <reference types="node" />
import { neon } from "@neondatabase/serverless";
import { createHash, randomUUID } from "node:crypto";
import profile from "../public/deployment.json" with { type: "json" };
import { DirectoryError, requireOwnParty } from "./lender-registry.js";
import { checkedLenderMarket, lenderMarketKey, type LenderMarket } from "../src/ledger/lender-directory-model.js";
import { checkedDiscoveryId, checkedDiscoveryParty, checkedDiscoveryTerms, discoveryPartyLabel, publicOpportunity, sameDiscoveryTerms,
  type DiscoveryInterest, type DiscoveryTerms, type OwnDiscovery, type OutgoingInterest, type PublicOpportunity } from "../src/ledger/discovery-model.js";

export class DiscoveryError extends Error { constructor(readonly status: number, message: string) { super(message); } }
export type StoredOpportunity = { id: string; market: LenderMarket; borrower: string; terms: DiscoveryTerms; status: "open" | "closed"; createdAt: string };
export type StoredInterest = DiscoveryInterest & { opportunityId: string };
export interface DiscoveryStore {
  list(market: LenderMarket): Promise<StoredOpportunity[]>;
  mine(market: LenderMarket, party: string): Promise<{opportunities: Array<StoredOpportunity & {incoming: StoredInterest[]}>; outgoing: Array<{opportunity: StoredOpportunity; interest: StoredInterest}>}>;
  get(market: LenderMarket, id: string): Promise<StoredOpportunity | null>;
  interest(opportunityId: string, id: string): Promise<StoredInterest | null>;
  publish(market: LenderMarket, party: string, terms: DiscoveryTerms): Promise<StoredOpportunity>;
  request(opportunity: StoredOpportunity, party: string, name: string): Promise<StoredInterest>;
  approve(opportunity: StoredOpportunity, interest: StoredInterest, updateId: string, contractId: string): Promise<void>;
  close(opportunity: StoredOpportunity): Promise<void>;
}
const marketKey = (market: LenderMarket) => createHash("sha256").update(lenderMarketKey(market)).digest("hex");
const timestamp = (value: unknown) => new Date(String(value)).toISOString();
const opportunityRow = (row: Record<string, unknown>): StoredOpportunity => ({id: String(row.id), market: checkedLenderMarket(row.market),
  borrower: String(row.borrower), terms: checkedDiscoveryTerms(row.terms, checkedLenderMarket(row.market)), status: row.status as "open" | "closed", createdAt: timestamp(row.created_at)});
const interestRow = (row: Record<string, unknown>): StoredInterest => ({id: String(row.id), opportunityId: String(row.opportunity_id), party: String(row.lender), name: discoveryPartyLabel(String(row.lender), profile.publicDesk?.operator),
  status: row.status as "pending" | "approved", createdAt: timestamp(row.created_at), ...(row.status === "approved" ? {approvedAt: timestamp(row.approved_at),
    requestUpdateId: String(row.request_update_id), requestContractId: String(row.request_contract_id)} : {})});
export function discoveryStore(connectionString: string): DiscoveryStore {
  const sql = neon(connectionString.trim());
  return {
    async list(market) {
      return (await sql`SELECT * FROM symbolon_opportunities WHERE market_key = ${marketKey(market)} AND status = 'open' ORDER BY created_at DESC LIMIT 100`).map(opportunityRow);
    },
    async mine(market, party) {
      const owned = await sql`SELECT o.*, COALESCE((SELECT jsonb_agg(i ORDER BY i.created_at) FROM symbolon_opportunity_interests i WHERE i.opportunity_id = o.id), '[]'::jsonb) AS incoming
        FROM symbolon_opportunities o WHERE o.market_key = ${marketKey(market)} AND o.borrower = ${party} ORDER BY o.created_at DESC LIMIT 100`;
      const outgoing = await sql`SELECT to_jsonb(o) AS opportunity, to_jsonb(i) AS interest FROM symbolon_opportunity_interests i JOIN symbolon_opportunities o ON o.id = i.opportunity_id
        WHERE o.market_key = ${marketKey(market)} AND i.lender = ${party} ORDER BY i.created_at DESC LIMIT 100`;
      return {opportunities: owned.map(row => ({...opportunityRow(row), incoming: (row.incoming as Record<string, unknown>[]).map(interestRow)})),
        outgoing: outgoing.map(row => ({opportunity: opportunityRow(row.opportunity), interest: interestRow(row.interest)}))};
    },
    async get(market, id) {
      const rows = await sql`SELECT * FROM symbolon_opportunities WHERE market_key = ${marketKey(market)} AND id = ${id}::uuid`;
      return rows.length ? opportunityRow(rows[0]) : null;
    },
    async interest(opportunityId, id) {
      const rows = await sql`SELECT * FROM symbolon_opportunity_interests WHERE opportunity_id = ${opportunityId}::uuid AND id = ${id}::uuid`;
      return rows.length ? interestRow(rows[0]) : null;
    },
    async publish(market, party, terms) {
      const rows = await sql`INSERT INTO symbolon_opportunities (id, market_key, market, borrower, terms) VALUES (${randomUUID()}::uuid, ${marketKey(market)}, ${JSON.stringify(market)}::jsonb, ${party}, ${JSON.stringify(terms)}::jsonb) RETURNING *`;
      return opportunityRow(rows[0]);
    },
    async request(opportunity, party, name) {
      // Lock the listing so a simultaneous close cannot admit a new interest.
      const rows = await sql`WITH eligible AS (SELECT id FROM symbolon_opportunities WHERE id = ${opportunity.id}::uuid AND market_key = ${marketKey(opportunity.market)} AND status = 'open' AND borrower <> ${party} FOR UPDATE)
        INSERT INTO symbolon_opportunity_interests (id, opportunity_id, lender, name) SELECT ${randomUUID()}::uuid, id, ${party}, ${name} FROM eligible
        ON CONFLICT (opportunity_id, lender) DO UPDATE SET name = EXCLUDED.name RETURNING *`;
      if (!rows.length) throw new DiscoveryError(409, "This opportunity is closed or unavailable.");
      return interestRow(rows[0]);
    },
    async approve(opportunity, interest, updateId, contractId) {
      // Reconcile a request the borrower already disclosed on ledger, including
      // when discovery closed between ledger commit and this API write.
      const rows = await sql`WITH eligible AS (SELECT id FROM symbolon_opportunities WHERE id = ${opportunity.id}::uuid AND borrower = ${opportunity.borrower} AND market_key = ${marketKey(opportunity.market)} FOR UPDATE)
        UPDATE symbolon_opportunity_interests SET status = 'approved', approved_at = now(), request_update_id = ${updateId}, request_contract_id = ${contractId}
        WHERE id = ${interest.id}::uuid AND opportunity_id IN (SELECT id FROM eligible) AND lender = ${interest.party} AND status = 'pending' RETURNING id`;
      if (!rows.length) throw new DiscoveryError(409, "This access request or opportunity changed. Refresh before continuing.");
    },
    async close(opportunity) {
      const rows = await sql`UPDATE symbolon_opportunities SET status = 'closed' WHERE id = ${opportunity.id}::uuid AND market_key = ${marketKey(opportunity.market)} AND borrower = ${opportunity.borrower} RETURNING id`;
      if (!rows.length) throw new DiscoveryError(404, "This opportunity is unavailable.");
    },
  };
}
function deploymentMarket(value: unknown): LenderMarket {
  const market = checkedLenderMarket(value), operator = profile.publicDesk?.operator;
  if (profile.network !== "devnet" || !profile.tradingEnabled || !operator || profile.participant !== "https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services"
    || market.synchronizerId !== profile.synchronizerId || market.corePackageId !== profile.corePackageId || market.oracle !== operator
    || market.collateralIssuer !== profile.assets.collateral.admin || market.cashIssuer !== profile.assets.cash.admin
    || market.collateralInstrument !== profile.assets.collateral.symbol || market.cashInstrument !== profile.assets.cash.symbol) throw new DiscoveryError(400, "Select the supported Symbolon DevNet market.");
  return market;
}
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new DiscoveryError(400, "Invalid discovery request.");
  return value as Record<string, unknown>;
};
function exactFields(body: Record<string, unknown>, fields: string[], optional: string[] = []) {
  if (Object.keys(body).some(key => !fields.includes(key) && !optional.includes(key)) || fields.some(key => !(key in body))) throw new DiscoveryError(400, "Invalid discovery request fields.");
}
function bearer(authorization: string) {
  if (!/^Bearer [A-Za-z0-9._-]+$/.test(authorization) || authorization.length > 16384) throw new DiscoveryError(401, "Connect your HackCanton account to use private discovery.");
  return authorization.slice(7);
}
function checkedReceiptId(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9._:-]{1,512}$/.test(value)) throw new DiscoveryError(400, "Supply the confirmed ledger update and request contract IDs.");
  return value;
}
export function discoveryReceiptQuery(borrower: string, updateId: string) {
  return {updateId, updateFormat: {includeTransactions: {eventFormat: {
    filtersByParty: {[borrower]: {cumulative: [{identifierFilter: {WildcardFilter: {value: {includeCreatedEventBlob: false}}}}]}}, verbose: false}, transactionShape: "TRANSACTION_SHAPE_LEDGER_EFFECTS"}}};
}
type ReceiptCache = Map<string, Promise<Record<string, unknown>>>;
async function discoveryTransaction(token: string, borrower: string, updateId: string, request: typeof fetch, cache: ReceiptCache) {
  const key = `${borrower}\u0000${updateId}`;
  let read = cache.get(key);
  if (!read) {
    read = (async () => {
      let response: globalThis.Response;
      try {
        response = await request(`${profile.participant}/v2/updates/update-by-id`, {method: "POST", headers: {Authorization: `Bearer ${token}`, "Content-Type": "application/json"},
          credentials: "omit", redirect: "error", signal: AbortSignal.timeout(15000), body: JSON.stringify(discoveryReceiptQuery(borrower, updateId))});
      } catch { throw new DiscoveryError(503, "The participant receipt lookup is unavailable. The request may already be committed; reconcile its existing receipt before another submission."); }
      if (!response.ok) {
        const detail = await response.json().catch(() => null) as {code?: unknown} | null;
        // Provider causes can contain private payloads. Only a bounded diagnostic
        // code and HTTP status are safe to return, never raw bodies or headers.
        const code = typeof detail?.code === "string" && /^[A-Z][A-Z0-9_:-]{0,79}$/.test(detail.code) ? ` · ${detail.code}` : "";
        const status = response.status === 401 ? 401 : response.status === 403 ? 403 : response.status >= 500 || response.status === 429 ? 503 : 409;
        throw new DiscoveryError(status, `The participant could not confirm this bilateral request (HTTP ${response.status}${code}). Check the original transaction before retrying.`);
      }
      const value = await response.json().catch(() => null);
      try { return object(object(object(object(value).update).Transaction).value); }
      catch { throw new DiscoveryError(409, "The participant did not return a transaction update. Keep the existing request and verify its receipt before retrying."); }
    })();
    cache.set(key, read);
  }
  return read;
}
export async function verifyQuoteRequest(token: string, opportunity: StoredOpportunity, interest: StoredInterest, updateId: string, contractId: string, request = fetch, cache: ReceiptCache = new Map()): Promise<void> {
  const tx = await discoveryTransaction(token, opportunity.borrower, updateId, request, cache);
  if (tx.updateId !== updateId || tx.synchronizerId !== opportunity.market.synchronizerId || !Number.isSafeInteger(tx.offset) || Number(tx.offset) <= 0
    || !Number.isFinite(Date.parse(String(tx.recordTime))) || Date.parse(String(tx.recordTime)) < Math.max(Date.parse(opportunity.createdAt), Date.parse(interest.createdAt)) || !Array.isArray(tx.events)) throw new DiscoveryError(409, "The transaction does not match this opportunity, access request, or DevNet synchronizer.");
  const matches = tx.events.flatMap(event => {
    const created = object(event).CreatedEvent;
    return created && typeof created === "object" && !Array.isArray(created) && (created as Record<string, unknown>).contractId === contractId ? [created as Record<string, unknown>] : [];
  });
  if (matches.length !== 1) throw new DiscoveryError(409, "The transaction did not create the specified bilateral request.");
  const event = matches[0], payload = object(event.createArgument);
  const terms: Record<string, unknown> = {...payload}; delete terms.borrower; delete terms.dealer;
  for (const field of ["termDays", "cureSeconds", "maxPriceAgeSeconds"]) if (typeof terms[field] === "string" && /^\d{1,6}$/.test(terms[field] as string)) terms[field] = Number(terms[field]);
  if (event.templateId !== `${opportunity.market.corePackageId}:Symbolon.Repo:QuoteRequest` || payload.borrower !== opportunity.borrower || payload.dealer !== interest.party
    || !Array.isArray(event.signatories) || event.signatories.length !== 1 || event.signatories[0] !== opportunity.borrower
    || !Array.isArray(event.observers) || event.observers.length !== 1 || event.observers[0] !== interest.party) throw new DiscoveryError(409, "The request has a different template, borrower, or lender.");
  let matched = false;
  try { matched = sameDiscoveryTerms(opportunity.terms, checkedDiscoveryTerms(terms, opportunity.market)); } catch { /* Fail closed on malformed or additional terms. */ }
  if (!matched) throw new DiscoveryError(409, "The on-ledger financing terms differ from the private opportunity.");
}
export async function discoveryOperation(method: string, value: unknown, authorization: string, store: DiscoveryStore,
  verify = requireOwnParty, confirm = verifyQuoteRequest, request = fetch): Promise<unknown> {
  const body = object(value), market = deploymentMarket(body.market);
  if (method === "GET" && !body.scope) {
    exactFields(body, ["market"]);
    return {market, opportunities: (await store.list(market)).filter(item => item.status === "open").map(publicOpportunity)};
  }
  if (method !== "GET" && method !== "POST") throw new DiscoveryError(405, "Use GET or POST.");
  const token = bearer(authorization), party = checkedDiscoveryParty(body.party);
  try { await verify(token, party); }
  catch (error) {
    if (error instanceof DirectoryError && error.message.startsWith("You can only register")) throw new DiscoveryError(403, "Use a party your current account is authorized to act as.");
    throw error;
  }
  if (method === "GET") {
    exactFields(body, ["market", "scope", "party"]);
    if (body.scope !== "mine") throw new DiscoveryError(400, "Select your own discovery records.");
    const rows = await store.mine(market, party);
    const opportunities = rows.opportunities.filter(item => item.borrower === party).map(item => ({id: item.id, market: item.market, status: item.status, createdAt: item.createdAt,
      terms: item.terms, incoming: item.incoming.map(({opportunityId: _id, ...interest}) => ({...interest, name: discoveryPartyLabel(interest.party, profile.publicDesk?.operator)}))}));
    const outgoing: OutgoingInterest[] = rows.outgoing.filter(row => row.interest.party === party).map(({opportunity, interest}) => ({id: interest.id, opportunityId: opportunity.id,
      market: opportunity.market, opportunityStatus: opportunity.status, status: interest.status, createdAt: interest.createdAt,
      ...(interest.status === "approved" ? {borrower: opportunity.borrower, terms: opportunity.terms, approvedAt: interest.approvedAt,
        requestContractId: interest.requestContractId, requestUpdateId: interest.requestUpdateId} : {})}));
    return {market, opportunities, outgoing} satisfies OwnDiscovery & {market: LenderMarket};
  }
  if (body.op === "publish") {
    exactFields(body, ["op", "party", "market", "terms"]);
    return {opportunity: publicOpportunity(await store.publish(market, party, checkedDiscoveryTerms(body.terms, market)))};
  }
  if (!["request-access", "approve", "close"].includes(String(body.op))) throw new DiscoveryError(400, "Unknown discovery operation.");
  exactFields(body, body.op === "request-access" ? ["op", "party", "market", "opportunityId"] : body.op === "approve" ? ["op", "party", "market", "opportunityId", "interestId", "updateId", "contractId"] : ["op", "party", "market", "opportunityId"], body.op === "request-access" ? ["name"] : []);
  const opportunity = await store.get(market, checkedDiscoveryId(body.opportunityId));
  if (!opportunity) throw new DiscoveryError(404, "This opportunity is unavailable.");
  if (body.op === "request-access") {
    if (opportunity.borrower === party) throw new DiscoveryError(400, "You cannot request access to your own opportunity.");
    if (opportunity.status !== "open") throw new DiscoveryError(409, "This opportunity is closed.");
    // Legacy clients may still send a name. It cannot override the live party
    // identity shown to the borrower, including for previously stored aliases.
    const interest = await store.request(opportunity, party, discoveryPartyLabel(party, profile.publicDesk?.operator));
    return {interest: {id: interest.id, status: interest.status}};
  }
  if (opportunity.borrower !== party) throw new DiscoveryError(403, "Only the borrower can manage this opportunity.");
  if (body.op === "close") { await store.close(opportunity); return {closed: true}; }
  const interest = await store.interest(opportunity.id, checkedDiscoveryId(body.interestId));
  if (!interest || interest.opportunityId !== opportunity.id || interest.party === party) throw new DiscoveryError(404, "This access request is unavailable.");
  const updateId = checkedReceiptId(body.updateId), contractId = checkedReceiptId(body.contractId);
  if (interest.status === "approved") {
    if (interest.requestContractId !== contractId || interest.requestUpdateId !== updateId) throw new DiscoveryError(409, "This request was already approved with another ledger receipt.");
  } else {
    await confirm(token, opportunity, interest, updateId, contractId, request);
    await store.approve(opportunity, interest, updateId, contractId);
  }
  return {approved: true, requestContractId: contractId, requestUpdateId: updateId};
}

type Request = {method?: string; headers: Record<string, string | string[] | undefined>; query: Record<string, string | string[] | undefined>; body?: unknown};
type Response = {status(code: number): Response; json(body: unknown): void; setHeader(key: string, value: string): void};
export default async function handler(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff");
  try {
    if (!process.env.SYMBOLON_DIRECTORY_DATABASE_URL) throw new DiscoveryError(503, "Private discovery is not configured yet.");
    if (req.method === "POST" && req.headers.origin && req.headers.origin !== `https://${req.headers.host}`) throw new DiscoveryError(403, "Use private discovery through the Symbolon app.");
    const market = req.query.market;
    if (typeof market === "string" && market.length > 8192 || Number(req.headers["content-length"] ?? 0) > 16384) throw new DiscoveryError(413, "The discovery request is too large.");
    const value = req.method === "GET" ? {market: typeof market === "string" ? JSON.parse(market) : market, ...(req.query.scope === undefined ? {} : {scope: req.query.scope, party: req.query.party})}
      : typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (JSON.stringify(value)?.length > 16384) throw new DiscoveryError(413, "The discovery request is too large.");
    const result = await discoveryOperation(req.method ?? "", value, typeof req.headers.authorization === "string" ? req.headers.authorization : "", discoveryStore(process.env.SYMBOLON_DIRECTORY_DATABASE_URL));
    res.status(200).json(result);
  } catch (error) {
    const known = error instanceof DiscoveryError || error instanceof DirectoryError;
    const status = known ? error.status : error instanceof SyntaxError || error instanceof Error && /^Use a positive|^Invalid |^Supply your|^Select a supported|^The lender market|^The financing|^Amounts must|^Use a name/.test(error.message) ? 400 : 503;
    res.status(status).json({error: error instanceof SyntaxError ? "Invalid discovery request JSON." : known || status === 400 ? (error as Error).message : "Private discovery is temporarily unavailable. Refresh before retrying."});
  }
}
