/// <reference types="node" />
import { neon } from "@neondatabase/serverless";
import { createHash, randomUUID } from "node:crypto";
import profile from "../public/deployment.json" with { type: "json" };
import { DirectoryError, requireOwnParty } from "./lender-registry.js";
import { checkedLenderMarket, lenderMarketKey, type LenderMarket } from "../src/ledger/lender-directory-model.js";
import { checkedDiscoveryId, checkedDiscoveryParty, checkedDiscoveryTerms, numeric10, sameDiscoveryTerms, type DiscoveryTerms } from "../src/ledger/discovery-model.js";
import { checkedOpenRfqReceiptId, openRfqPricing, openRfqPublic, type OpenRfqQuote, type OpenRfqRequest, type OwnOpenRfq } from "../src/ledger/open-rfq-model.js";

export class OpenRfqError extends Error { constructor(readonly status: number, message: string) { super(message); } }
export type OpenRfqConfig = Omit<typeof profile, "openRfqPackageId"> & { openRfqPackageId?: string | null };
const configured = profile as OpenRfqConfig;
type Publication = Omit<OpenRfqRequest, "id" | "status">;
export interface OpenRfqStore {
  list(market: LenderMarket): Promise<OpenRfqRequest[]>;
  get(market: LenderMarket, id: string): Promise<OpenRfqRequest | null>;
  findPublished(market: LenderMarket, contractId: string): Promise<OpenRfqRequest | null>;
  mine(market: LenderMarket, party: string): Promise<OwnOpenRfq>;
  publish(publication: Publication): Promise<OpenRfqRequest>;
  quote(request: OpenRfqRequest, quote: OpenRfqQuote): Promise<void>;
  close(request: OpenRfqRequest, updateId: string, closedAt: string): Promise<void>;
}
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new OpenRfqError(400, "Invalid open request data.");
  return value as Record<string, unknown>;
};
function exactFields(body: Record<string, unknown>, required: string[], optional: string[] = []) {
  if (required.some(key => !(key in body)) || Object.keys(body).some(key => !required.includes(key) && !optional.includes(key))) throw new OpenRfqError(400, "Invalid open request fields.");
}
function openPackage(config: OpenRfqConfig): string {
  if (typeof config.openRfqPackageId !== "string" || !/^[a-f0-9]{64}$/.test(config.openRfqPackageId)) throw new OpenRfqError(503, "The open request package is not configured yet.");
  return config.openRfqPackageId;
}
export const openRfqTemplate = (config = configured) => `${openPackage(config)}:Symbolon.OpenRequest:OpenRequest`;
function deploymentMarket(value: unknown, config: OpenRfqConfig) {
  const market = checkedLenderMarket(value);
  openPackage(config);
  if (config.network !== "devnet" || !config.tradingEnabled || config.participant !== "https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services"
    || market.synchronizerId !== config.synchronizerId || market.corePackageId !== config.corePackageId || market.oracle !== config.publicDesk?.operator
    || market.collateralIssuer !== config.assets.collateral.admin || market.cashIssuer !== config.assets.cash.admin
    || market.collateralInstrument !== config.assets.collateral.symbol || market.cashInstrument !== config.assets.cash.symbol) throw new OpenRfqError(400, "Select the configured Symbolon DevNet market.");
  return market;
}
export const openRfqTimestamp = (value: unknown) => (value instanceof Date ? value : new Date(String(value))).toISOString();
const date = openRfqTimestamp;
function requestRow(row: Record<string, unknown>): OpenRfqRequest {
  const market = checkedLenderMarket(row.market);
  return {id: String(row.id), market, status: row.status as "open" | "closed", createdAt: date(row.created_at), borrower: String(row.borrower),
    terms: checkedDiscoveryTerms(row.terms, market), publishUpdateId: String(row.publish_update_id), disclosure: {contractId: String(row.request_contract_id), templateId: String(row.request_template_id),
      createdEventBlob: String(row.request_created_event_blob), synchronizerId: market.synchronizerId},
    ...(row.status === "closed" ? {closedUpdateId: String(row.closed_update_id), closedAt: date(row.closed_at)} : {})};
}
const quoteRow = (row: Record<string, unknown>): OpenRfqQuote => ({requestId: String(row.request_id), dealer: String(row.dealer), rate: numeric10(String(row.rate)),
  validUntil: date(row.valid_until), quoteContractId: String(row.quote_contract_id), updateId: String(row.update_id), createdAt: date(row.created_at)});
export function openRfqStore(connectionString: string, config = configured): OpenRfqStore {
  const sql = neon(connectionString.trim());
  const key = (market: LenderMarket) => createHash("sha256").update(`${lenderMarketKey(market)}:${openPackage(config)}`).digest("hex");
  return {
    async list(market) { return (await sql`SELECT * FROM symbolon_open_requests WHERE market_key = ${key(market)} AND status = 'open' ORDER BY created_at DESC LIMIT 100`).map(requestRow); },
    async get(market, id) { const rows = await sql`SELECT * FROM symbolon_open_requests WHERE market_key = ${key(market)} AND id = ${id}::uuid`; return rows.length ? requestRow(rows[0]) : null; },
    async findPublished(market, contractId) { const rows = await sql`SELECT * FROM symbolon_open_requests WHERE market_key = ${key(market)} AND request_contract_id = ${contractId}`; return rows.length ? requestRow(rows[0]) : null; },
    async mine(market, party) {
      const own = await sql`SELECT r.*, COALESCE((SELECT jsonb_agg(q ORDER BY q.created_at) FROM symbolon_open_quotes q WHERE q.request_id = r.id), '[]'::jsonb) AS quotes
        FROM symbolon_open_requests r WHERE r.market_key = ${key(market)} AND r.borrower = ${party} ORDER BY r.created_at DESC LIMIT 100`;
      const outgoing = await sql`SELECT to_jsonb(r) AS request, to_jsonb(q) AS quote FROM symbolon_open_quotes q JOIN symbolon_open_requests r ON r.id = q.request_id
        WHERE r.market_key = ${key(market)} AND q.dealer = ${party} ORDER BY q.created_at DESC LIMIT 100`;
      return {requests: own.map(row => ({...requestRow(row), quotes: (row.quotes as Record<string, unknown>[]).map(quoteRow)})),
        quotes: outgoing.map(row => ({request: requestRow(row.request), quote: quoteRow(row.quote)}))};
    },
    async publish(publication) {
      const rows = await sql`INSERT INTO symbolon_open_requests (id, market_key, market, borrower, terms, created_at, request_contract_id, request_template_id, request_created_event_blob, publish_update_id)
        VALUES (${randomUUID()}::uuid, ${key(publication.market)}, ${JSON.stringify(publication.market)}::jsonb, ${publication.borrower}, ${JSON.stringify(publication.terms)}::jsonb,
          ${publication.createdAt}::timestamptz, ${publication.disclosure.contractId}, ${publication.disclosure.templateId}, ${publication.disclosure.createdEventBlob}, ${publication.publishUpdateId})
        ON CONFLICT (request_contract_id) DO NOTHING RETURNING *`;
      const stored = rows.length ? requestRow(rows[0]) : requestRow((await sql`SELECT * FROM symbolon_open_requests WHERE request_contract_id = ${publication.disclosure.contractId}`)[0]);
      if (stored.borrower !== publication.borrower || lenderMarketKey(stored.market) !== lenderMarketKey(publication.market) || stored.publishUpdateId !== publication.publishUpdateId
        || stored.disclosure.templateId !== publication.disclosure.templateId || !sameDiscoveryTerms(stored.terms, publication.terms)) throw new OpenRfqError(409, "This ledger request is already linked to another publication.");
      return stored;
    },
    async quote(request, quote) {
      // Closing discovery cannot undo a quote committed before withdrawal.
      // Persist the exact ledger receipt even when API reconciliation arrives late.
      await sql`INSERT INTO symbolon_open_quotes (quote_contract_id, request_id, dealer, rate, valid_until, update_id, created_at)
        VALUES (${quote.quoteContractId}, ${request.id}::uuid, ${quote.dealer}, ${quote.rate}::numeric, ${quote.validUntil}::timestamptz, ${quote.updateId}, ${quote.createdAt}::timestamptz)
        ON CONFLICT (quote_contract_id) DO NOTHING`;
      const existing = quoteRow((await sql`SELECT * FROM symbolon_open_quotes WHERE quote_contract_id = ${quote.quoteContractId}`)[0]);
      if (existing.requestId !== request.id || existing.dealer !== quote.dealer || existing.updateId !== quote.updateId || existing.rate !== quote.rate || existing.validUntil !== date(quote.validUntil)) throw new OpenRfqError(409, "This quote contract is already linked to another request or lender.");
    },
    async close(request, updateId, closedAt) {
      const rows = await sql`UPDATE symbolon_open_requests SET status = 'closed', closed_update_id = ${updateId}, closed_at = ${closedAt}::timestamptz
        WHERE id = ${request.id}::uuid AND borrower = ${request.borrower} AND market_key = ${key(request.market)} AND (status = 'open' OR closed_update_id = ${updateId}) RETURNING id`;
      if (!rows.length) throw new OpenRfqError(409, "This request was already closed with another receipt.");
    },
  };
}
export function openRfqReceiptQuery(party: string, updateId: string) {
  return {updateId, updateFormat: {includeTransactions: {eventFormat: {filtersByParty: {[party]: {cumulative: [{identifierFilter: {WildcardFilter: {value: {includeCreatedEventBlob: true}}}}]}}, verbose: false}, transactionShape: "TRANSACTION_SHAPE_LEDGER_EFFECTS"}}};
}
export function openRfqActiveQuery(party: string, activeAtOffset: number) {
  // This is the same own-party event format used by CantonV2Client.read().
  // The matching active event is then checked against the exact pinned template.
  return {activeAtOffset, eventFormat: {filtersByParty: {[party]: {cumulative: [{identifierFilter: {WildcardFilter: {value: {includeCreatedEventBlob: true}}}}]}}, verbose: false}};
}
async function verifyActivePublication(token: string, publication: Publication, config: OpenRfqConfig, fetcher: typeof fetch) {
  const read = async (path: string, body?: unknown) => {
    let response: globalThis.Response;
    try { response = await fetcher(`${config.participant}${path}`, {method: body === undefined ? "GET" : "POST", headers: {Authorization: `Bearer ${token}`, ...(body === undefined ? {} : {"Content-Type": "application/json"})},
      credentials: "omit", redirect: "error", signal: AbortSignal.timeout(15000), ...(body === undefined ? {} : {body: JSON.stringify(body)})}); }
    catch { throw new OpenRfqError(503, "The participant could not check the request's current active state. Keep the existing ledger receipt and retry reconciliation."); }
    if (!response.ok) throw new OpenRfqError(response.status === 401 ? 401 : response.status === 403 ? 403 : 503, `The participant could not check the request's current active state (HTTP ${response.status}).`);
    return response.json();
  };
  const end = object(await read("/v2/state/ledger-end"));
  if (!Number.isSafeInteger(end.offset) || Number(end.offset) < 0) throw new OpenRfqError(409, "The participant did not return a valid current ledger offset.");
  const rows = await read("/v2/state/active-contracts", openRfqActiveQuery(publication.borrower, Number(end.offset)));
  if (!Array.isArray(rows)) throw new OpenRfqError(409, "The participant did not return the current active-contract snapshot.");
  const active = rows.flatMap(row => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return [];
    const entry = (row as {contractEntry?: {JsActiveContract?: {createdEvent?: Record<string, unknown>; synchronizerId?: string}}}).contractEntry?.JsActiveContract;
    return entry?.createdEvent?.contractId === publication.disclosure.contractId ? [entry] : [];
  });
  if (active.length !== 1 || active[0].synchronizerId !== publication.market.synchronizerId || active[0].createdEvent?.templateId !== openRfqTemplate(config)) throw new OpenRfqError(409, "This ledger request is no longer active on the configured synchronizer and cannot be newly published.");
  const payload = object(active[0].createdEvent!.createArgument);
  if (payload.borrower !== publication.borrower || !sameDiscoveryTerms(publication.terms, ledgerTerms(payload, publication.market, ["borrower"]))) throw new OpenRfqError(409, "The active ledger request differs from the verified publication.");
}
async function transaction(token: string, party: string, updateId: string, market: LenderMarket, config: OpenRfqConfig, fetcher: typeof fetch) {
  let response: globalThis.Response;
  try { response = await fetcher(`${config.participant}/v2/updates/update-by-id`, {method: "POST", headers: {Authorization: `Bearer ${token}`, "Content-Type": "application/json"},
    credentials: "omit", redirect: "error", signal: AbortSignal.timeout(15000), body: JSON.stringify(openRfqReceiptQuery(party, updateId))}); }
  catch { throw new OpenRfqError(503, "The participant receipt lookup is unavailable. Reconcile the original ledger transaction before submitting again."); }
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as {code?: unknown} | null;
    const code = typeof detail?.code === "string" && /^[A-Z][A-Z0-9_:-]{0,79}$/.test(detail.code) ? ` · ${detail.code}` : "";
    throw new OpenRfqError(response.status === 401 ? 401 : response.status === 403 ? 403 : response.status >= 500 || response.status === 429 ? 503 : 409,
      `The participant could not confirm the open request receipt (HTTP ${response.status}${code}). Check the original transaction before retrying.`);
  }
  let tx: Record<string, unknown>;
  try { tx = object(object(object(object(await response.json()).update).Transaction).value); }
  catch { throw new OpenRfqError(409, "The participant did not return a transaction update."); }
  if (tx.updateId !== updateId || tx.synchronizerId !== market.synchronizerId || !Number.isSafeInteger(tx.offset) || Number(tx.offset) <= 0 || !Array.isArray(tx.events)
    || typeof tx.recordTime !== "string" || !Number.isFinite(Date.parse(tx.recordTime)) || typeof tx.effectiveAt !== "string" || !Number.isFinite(Date.parse(tx.effectiveAt))) throw new OpenRfqError(409, "The receipt belongs to another transaction or synchronizer.");
  return tx;
}
const events = (tx: Record<string, unknown>, variant: "CreatedEvent" | "ExercisedEvent") => (tx.events as unknown[]).flatMap(row => {
  if (!row || typeof row !== "object" || Array.isArray(row)) return [];
  const event = (row as Record<string, unknown>)[variant]; return event && typeof event === "object" && !Array.isArray(event) ? [event as Record<string, unknown>] : [];
});
function single(values: Record<string, unknown>[], message: string) { if (values.length !== 1) throw new OpenRfqError(409, message); return values[0]; }
const partiesEqual = (value: unknown, expected: string[]) => Array.isArray(value) && value.length === expected.length && new Set(value).size === expected.length && expected.every(party => value.includes(party));
function ledgerTerms(payload: Record<string, unknown>, market: LenderMarket, omitted: string[]) {
  const result = {...payload}; omitted.forEach(field => delete result[field]);
  for (const field of ["termDays", "cureSeconds", "maxPriceAgeSeconds"]) if (typeof result[field] === "string" && /^\d{1,6}$/.test(result[field] as string)) result[field] = Number(result[field]);
  try { return checkedDiscoveryTerms(result, market); } catch { throw new OpenRfqError(409, "The ledger request has unexpected or mismatched financing terms."); }
}
function child(event: Record<string, unknown>, parent: Record<string, unknown>) {
  return Number.isSafeInteger(event.nodeId) && Number.isSafeInteger(parent.nodeId) && Number.isSafeInteger(parent.lastDescendantNodeId)
    && Number(event.nodeId) > Number(parent.nodeId) && Number(event.nodeId) <= Number(parent.lastDescendantNodeId);
}
export async function verifyOpenPublication(token: string, party: string, market: LenderMarket, terms: DiscoveryTerms, updateId: string, contractId: string, config = configured, fetcher = fetch): Promise<Publication> {
  const tx = await transaction(token, party, updateId, market, config, fetcher);
  const event = single(events(tx, "CreatedEvent").filter(event => event.contractId === contractId), "The receipt did not create the specified open request.");
  const payload = object(event.createArgument);
  if (event.templateId !== openRfqTemplate(config) || payload.borrower !== party || !partiesEqual(event.signatories, [party]) || !partiesEqual(event.observers, [])
    || !sameDiscoveryTerms(terms, ledgerTerms(payload, market, ["borrower"]))) throw new OpenRfqError(409, "The publication has a different template, borrower, or financing terms.");
  if (typeof event.createdEventBlob !== "string" || !event.createdEventBlob || event.createdEventBlob.length > 524288 || !/^[A-Za-z0-9+/]+={0,2}$/.test(event.createdEventBlob)) throw new OpenRfqError(409, "The participant did not return the authoritative request disclosure.");
  if (events(tx, "ExercisedEvent").some(event => event.contractId === contractId && event.consuming === true)) throw new OpenRfqError(409, "A request closed during creation cannot be published as open.");
  return {market, borrower: party, terms, createdAt: String(tx.recordTime), publishUpdateId: updateId, disclosure: {contractId, templateId: openRfqTemplate(config), createdEventBlob: event.createdEventBlob, synchronizerId: market.synchronizerId}};
}
export async function verifyOpenQuote(token: string, party: string, request: OpenRfqRequest, updateId: string, quoteContractId: string, config = configured, fetcher = fetch): Promise<OpenRfqQuote> {
  const tx = await transaction(token, party, updateId, request.market, config, fetcher);
  const exercise = single(events(tx, "ExercisedEvent").filter(event => event.contractId === request.disclosure.contractId && event.templateId === openRfqTemplate(config)
    && event.choice === "SubmitOpenQuote" && event.exerciseResult === quoteContractId), "The quote receipt did not exercise this open request.");
  const argument = object(exercise.choiceArgument);
  const rate = numeric10(argument.rate), validSeconds = typeof argument.validSeconds === "string" && /^\d{1,5}$/.test(argument.validSeconds) ? Number(argument.validSeconds) : argument.validSeconds;
  if (party === request.borrower || exercise.consuming !== false || !partiesEqual(exercise.actingParties, [party]) || argument.dealer !== party
    || BigInt(rate.replace(".", "")) > 10000000000n || !Number.isSafeInteger(validSeconds) || Number(validSeconds) < 1 || Number(validSeconds) > 86400
    || typeof argument.cashCid !== "string" || !argument.cashCid || Date.parse(String(tx.recordTime)) < Date.parse(request.createdAt)
    || request.status === "closed" && (!request.closedAt || Date.parse(String(tx.recordTime)) > Date.parse(request.closedAt))) throw new OpenRfqError(409, "The quote has a different lender, rate, or request lifecycle.");
  exactFields(argument, ["dealer", "rate", "validSeconds", "cashCid"]);
  const event = single(events(tx, "CreatedEvent").filter(event => event.contractId === quoteContractId && event.templateId === `${request.market.corePackageId}:Symbolon.Repo:RepoQuote`), "The receipt did not create the funded bilateral quote.");
  const quote = object(event.createArgument);
  if (!child(event, exercise) || quote.borrower !== request.borrower || quote.dealer !== party || !partiesEqual(event.signatories, [request.borrower, party]) || !partiesEqual(event.observers, [])
    || !sameDiscoveryTerms(request.terms, ledgerTerms(quote, request.market, ["borrower", "dealer", "rate", "cashCid", "validUntil"])) || numeric10(quote.rate) !== rate
    || typeof quote.validUntil !== "string" || Date.parse(quote.validUntil) - Date.parse(String(tx.effectiveAt)) !== Number(validSeconds) * 1000 || typeof quote.cashCid !== "string") throw new OpenRfqError(409, "The funded quote does not match the open request and lender terms.");
  const holding = single(events(tx, "CreatedEvent").filter(event => event.contractId === quote.cashCid && event.templateId === `${request.market.corePackageId}:Symbolon.DemoAsset:Holding`), "The receipt does not contain the quote's reserved funding.");
  const cash = object(holding.createArgument);
  const reservation = single(events(tx, "ExercisedEvent").filter(event => event.contractId === argument.cashCid && event.templateId === `${request.market.corePackageId}:Symbolon.DemoAsset:Holding` && event.choice === "Reserve" && child(event, exercise)), "The quote did not reserve the lender's cash.");
  const reserve = object(reservation.choiceArgument);
  if (!child(holding, exercise) || reservation.consuming !== true || !partiesEqual(reservation.actingParties, [party]) || reserve.to !== party || reserve.lockParty !== request.borrower
    || numeric10(reserve.qty) !== request.terms.cashAmount || cash.issuer !== request.market.cashIssuer || cash.owner !== party || cash.instrument !== request.market.cashInstrument
    || numeric10(cash.amount) !== request.terms.cashAmount || !partiesEqual(cash.lockParties, [request.borrower]) || !partiesEqual(cash.viewers, [])) throw new OpenRfqError(409, "The quote funding does not match the agreed amount, lender, issuer, or borrower lock.");
  return {requestId: request.id, dealer: party, rate, validUntil: quote.validUntil, quoteContractId, updateId, createdAt: String(tx.recordTime)};
}
export async function verifyOpenClosure(token: string, party: string, request: OpenRfqRequest, updateId: string, config = configured, fetcher = fetch): Promise<string> {
  const tx = await transaction(token, party, updateId, request.market, config, fetcher);
  const exercise = single(events(tx, "ExercisedEvent").filter(event => event.contractId === request.disclosure.contractId && event.templateId === openRfqTemplate(config) && event.choice === "WithdrawOpenRequest"), "The receipt did not withdraw this open request.");
  if (request.borrower !== party || exercise.consuming !== true || !partiesEqual(exercise.actingParties, [party]) || Date.parse(String(tx.recordTime)) < Date.parse(request.createdAt)) throw new OpenRfqError(409, "The withdrawal has a different borrower or lifecycle.");
  exactFields(object(exercise.choiceArgument), []);
  return String(tx.recordTime);
}
export async function openRfqOperation(method: string, value: unknown, authorization: string, store: OpenRfqStore, verify = requireOwnParty, fetcher = fetch, config = configured): Promise<unknown> {
  const body = object(value), market = deploymentMarket(body.market, config);
  if (method === "GET" && !body.scope) { exactFields(body, ["market"]); return {market, requests: (await store.list(market)).filter(request => request.status === "open").map(openRfqPublic)}; }
  if (method !== "GET" && method !== "POST") throw new OpenRfqError(405, "Use GET or POST.");
  if (!/^Bearer [A-Za-z0-9._-]+$/.test(authorization) || authorization.length > 16384) throw new OpenRfqError(401, "Connect your HackCanton account to use open requests.");
  const token = authorization.slice(7), party = checkedDiscoveryParty(body.party);
  await verify(token, party);
  if (method === "GET" && body.scope === "board") {
    exactFields(body, ["market", "scope", "party"]);
    return {market, requests: (await store.list(market)).filter(request => request.status === "open").map(openRfqPricing)};
  }
  if (method === "GET" && body.scope === "mine") {
    exactFields(body, ["market", "scope", "party"]);
    const own = await store.mine(market, party);
    return {market, requests: own.requests.filter(request => request.borrower === party), quotes: own.quotes.filter(item => item.quote.dealer === party)};
  }
  if (method === "GET" && body.scope === "quote") {
    exactFields(body, ["market", "scope", "party", "requestId"]);
    const request = await store.get(market, checkedDiscoveryId(body.requestId));
    if (!request || request.status !== "open") throw new OpenRfqError(409, "This request is closed or unavailable. Existing bilateral quotes retain their own lifecycle.");
    if (request.borrower === party) throw new OpenRfqError(400, "You cannot quote your own financing request.");
    return {market, request};
  }
  if (method !== "POST") throw new OpenRfqError(400, "Select your own records or an open quote context.");
  if (body.op === "publish") {
    exactFields(body, ["op", "party", "market", "terms", "updateId", "contractId"], ["createdEventBlob"]);
    const publication = await verifyOpenPublication(token, party, market, checkedDiscoveryTerms(body.terms, market), checkedOpenRfqReceiptId(body.updateId), checkedOpenRfqReceiptId(body.contractId), config, fetcher);
    // Only fresh publication needs a current active snapshot. An already stored
    // closed record must remain closed when its creation receipt is reconciled.
    if (!await store.findPublished(market, publication.disclosure.contractId)) await verifyActivePublication(token, publication, config, fetcher);
    // The browser's optional blob is never trusted. The participant receipt is
    // the source for the borrower-consented disclosure returned to lenders.
    return {request: await store.publish(publication)};
  }
  if (body.op !== "record-quote" && body.op !== "close") throw new OpenRfqError(400, "Unknown open request operation.");
  exactFields(body, body.op === "record-quote" ? ["op", "party", "market", "requestId", "updateId", "quoteContractId"] : ["op", "party", "market", "requestId", "updateId"]);
  const request = await store.get(market, checkedDiscoveryId(body.requestId));
  if (!request || request.disclosure.templateId !== openRfqTemplate(config)) throw new OpenRfqError(404, "This open request is unavailable.");
  const updateId = checkedOpenRfqReceiptId(body.updateId);
  if (body.op === "close") {
    if (request.borrower !== party) throw new OpenRfqError(403, "Only the borrower can withdraw this open request.");
    const closedAt = await verifyOpenClosure(token, party, request, updateId, config, fetcher);
    await store.close(request, updateId, closedAt); return {closed: true};
  }
  const quote = await verifyOpenQuote(token, party, request, updateId, checkedOpenRfqReceiptId(body.quoteContractId), config, fetcher);
  await store.quote(request, quote); return {quote};
}
type Request = {method?: string; headers: Record<string, string | string[] | undefined>; query: Record<string, string | string[] | undefined>; body?: unknown};
type Response = {status(code: number): Response; json(body: unknown): void; setHeader(key: string, value: string): void};
export default async function handler(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff");
  try {
    if (!process.env.SYMBOLON_DIRECTORY_DATABASE_URL) throw new OpenRfqError(503, "The open request board is not configured yet.");
    if (req.method === "POST" && req.headers.origin && req.headers.origin !== `https://${req.headers.host}`) throw new OpenRfqError(403, "Publish and quote through the Symbolon app.");
    if (Number(req.headers["content-length"] ?? 0) > 16384 || typeof req.query.market === "string" && req.query.market.length > 8192) throw new OpenRfqError(413, "The open request is too large.");
    const value = req.method === "GET" ? {market: typeof req.query.market === "string" ? JSON.parse(req.query.market) : req.query.market,
      ...(req.query.scope === undefined ? {} : {scope: req.query.scope, party: req.query.party, ...(req.query.requestId === undefined ? {} : {requestId: req.query.requestId})})}
      : typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (JSON.stringify(value)?.length > 16384) throw new OpenRfqError(413, "The open request is too large.");
    res.status(200).json(await openRfqOperation(req.method ?? "", value, typeof req.headers.authorization === "string" ? req.headers.authorization : "", openRfqStore(process.env.SYMBOLON_DIRECTORY_DATABASE_URL)));
  } catch (error) {
    const known = error instanceof OpenRfqError || error instanceof DirectoryError;
    const status = known ? error.status : error instanceof SyntaxError || error instanceof Error && /^Invalid |^Supply |^Use a positive|^Select a supported|^The lender market|^The financing|^Amounts must/.test(error.message) ? 400 : 503;
    res.status(status).json({error: error instanceof SyntaxError ? "Invalid open request JSON." : known || status === 400 ? (error as Error).message : "The open request board is temporarily unavailable. Reconcile existing ledger receipts before retrying."});
  }
}
