import { LedgerError, type Method } from "./api";
import { LedgerHttpError, type LedgerRequest } from "./canton-v2";

export const ACCOUNT_ISSUER = "https://keycloak.naas.noders.services/realms/noders-appsfactory";
export const ACCOUNT_CLIENT = "web-app-ui-hackcanton-01-devnet";
export const ACCOUNT_LEDGER = "https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services";
const pendingKey = "symbolon.account.pkce.v1";
type AuthorizationAttempt = { state: string; verifier: string; redirectUri: string; startedAt: number; returnHash: string };
type Tokens = { access_token: string; refresh_token?: string };
export type AccountContext = { subject: string; primaryParty?: string; parties: string[]; request: LedgerRequest };
let capturedCallback: URLSearchParams | null = null;
let callbackWork: Promise<AccountContext | null> | null = null;
let context: AccountContext | null = null;
let tokens: Tokens | null = null;
let revision = 0;
let refreshing: Promise<void> | null = null;

const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
export async function pkceChallenge(verifier: string) {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
}
export function accessClaims(token: string): { sub: string; exp: number; iss: string; typ?: string } {
  let claims;
  try { claims = JSON.parse(atob(token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/"))); }
  catch { throw new LedgerError("The account did not return a valid access token."); }
  if (claims.iss !== ACCOUNT_ISSUER || claims.typ === "ID" || typeof claims.sub !== "string" || !claims.sub
    || !Number.isFinite(claims.exp)) throw new LedgerError("This account is not authenticated for HackCanton DevNet.");
  return claims;
}
export function checkedCallback(params: URLSearchParams, attempt: AuthorizationAttempt | null, origin: string, now = Date.now()) {
  if (!attempt || params.get("state") !== attempt.state || attempt.redirectUri !== `${origin}/app`
    || now - attempt.startedAt > 600000 || now < attempt.startedAt) {
    throw new LedgerError("This sign-in request expired or does not match this browser. Connect again.");
  }
  if (params.get("error")) throw new LedgerError("Account connection was cancelled or declined. Connect again when ready.");
  const code = params.get("code");
  if (!code) throw new LedgerError("No authorization code was returned.");
  return { code, verifier: attempt.verifier, redirectUri: attempt.redirectUri };
}

/** Remove one-time authorization data before rendering or loading wallet SDKs. */
export function captureAccountCallback() {
  if (typeof window === "undefined" || capturedCallback) return;
  const params = new URLSearchParams(window.location.search);
  if (!params.has("code") && !params.has("error")) return;
  capturedCallback = params;
  window.history.replaceState(null, "", `/app${window.location.hash}`);
}
export async function startAccountConnection() {
  if (window.location.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    throw new LedgerError("Connect from the HTTPS Symbolon app.");
  }
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const redirectUri = `${window.location.origin}/app`;
  const attempt: AuthorizationAttempt = { state, verifier, redirectUri, startedAt: Date.now(), returnHash: window.location.hash };
  sessionStorage.setItem(pendingKey, JSON.stringify(attempt));
  const url = new URL(`${ACCOUNT_ISSUER}/protocol/openid-connect/auth`);
  url.search = new URLSearchParams({ client_id: ACCOUNT_CLIENT, response_type: "code", scope: "openid daml_ledger_api",
    redirect_uri: redirectUri, state, code_challenge: await pkceChallenge(verifier), code_challenge_method: "S256" }).toString();
  window.location.assign(url.toString());
}
function redactedError(value: string) {
  let safe = value;
  if (tokens?.access_token) safe = safe.replaceAll(tokens.access_token, "[redacted]");
  if (tokens?.refresh_token) safe = safe.replaceAll(tokens.refresh_token, "[redacted]");
  return safe.replace(/Bearer\s+[^\s"']+/gi, "Bearer [redacted]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted token]").slice(0,1600);
}
async function tokenRequest(values: Record<string,string>): Promise<Tokens> {
  const response = await fetch(`${ACCOUNT_ISSUER}/protocol/openid-connect/token`, { method: "POST", redirect: "error",
    credentials: "omit", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: ACCOUNT_CLIENT, ...values }), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new LedgerError("Account authorization expired or was rejected. Connect again.");
  const result = await response.json();
  if (typeof result.access_token !== "string") throw new LedgerError("No account access token was returned.");
  accessClaims(result.access_token);
  return { access_token: result.access_token, ...(typeof result.refresh_token === "string" ? { refresh_token: result.refresh_token } : {}) };
}
async function validToken() {
  if (!tokens) throw new LedgerError("Connect your HackCanton account to continue.");
  if (accessClaims(tokens.access_token).exp * 1000 > Date.now() + 30000) return tokens.access_token;
  if (!tokens.refresh_token) throw new LedgerError("Your account session expired. Connect again.");
  if (!refreshing) {
    const currentRevision = revision;
    const refreshToken = tokens.refresh_token;
    const work = tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken }).then(next => {
      if (currentRevision !== revision) throw new LedgerError("The account session changed. Connect again.");
      tokens = next;
    });
    refreshing = work;
    void work.finally(() => { if (refreshing === work) refreshing = null; }).catch(() => {});
  }
  await refreshing;
  if (!tokens) throw new LedgerError("The account disconnected.");
  return tokens.access_token;
}
const ledgerRequest: LedgerRequest = async (method: Method, path, body) => {
  if (!path.startsWith("/v2/") || path.includes("..") || path.includes("\\")) throw new LedgerError("Unsupported participant resource.");
  const target = new URL(ACCOUNT_LEDGER + path);
  if (target.origin !== ACCOUNT_LEDGER) throw new LedgerError("Cannot forward account authorization to another origin.");
  const accessToken = await validToken();
  const response = await fetch(target, { method, credentials: "omit", redirect: "error", signal: AbortSignal.timeout(45000),
    headers: { Authorization: `Bearer ${accessToken}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await response.text();
  if (!response.ok) {
    let error: { code?: string; cause?: string; definiteAnswer?: boolean } = {};
    try { error = JSON.parse(text); } catch { /* Plain-text validation error. */ }
    const definite = [400,401,403,404].includes(response.status) || error.definiteAnswer === true;
    throw new LedgerHttpError(redactedError(error.cause ?? `Participant returned HTTP ${response.status}.`), response.status, definite);
  }
  try { return JSON.parse(text); }
  catch { throw new LedgerError("The participant returned an invalid JSON response."); }
};
export function activeAccountContext() { return context; }
export async function uploadPublicAccessPackage(synchronizerId: string) {
  if (!context || !synchronizerId) throw new LedgerError("Connect an authorized HackCanton operator account first.");
  const file = await fetch("/packages/symbolon-public-0.1.0.dar", {credentials:"omit",signal:AbortSignal.timeout(15000)});
  if(!file.ok)throw new LedgerError("The public access DAR is not available in this build.");
  const bytes=await file.arrayBuffer();
  const digest=[...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))].map(b=>b.toString(16).padStart(2,"0")).join("");
  if(digest!=="b5d4cb164547d9796eadb15ce5badb17c24a3f32697d5a5bc662084a0b87687d")throw new LedgerError("The DAR does not match the tested public access package.");
  const token=await validToken();
  const url=new URL(`${ACCOUNT_LEDGER}/v2/packages`);
  url.search=new URLSearchParams({vetAllPackages:"true",synchronizerId}).toString();
  const response=await fetch(url,{method:"POST",credentials:"omit",redirect:"error",signal:AbortSignal.timeout(60000),
    headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/octet-stream"},body:bytes});
  if(!response.ok)throw new LedgerError(`DAR upload was not confirmed (HTTP ${response.status}). Use the authorized NODERS Console upload if this account has no package-admin permission.`);
}
export function disconnectAccount() {
  revision++; tokens = null; context = null; callbackWork = null; capturedCallback = null; refreshing = null;
}
export function finishAccountConnection(): Promise<AccountContext | null> {
  if (context) return Promise.resolve(context);
  if (callbackWork) return callbackWork;
  if (!capturedCallback) return Promise.resolve(null);
  const params = capturedCallback;
  capturedCallback = null;
  callbackWork = (async () => {
    let attempt: AuthorizationAttempt | null = null;
    try { attempt = JSON.parse(sessionStorage.getItem(pendingKey) ?? "null"); } catch { /* Reject below. */ }
    sessionStorage.removeItem(pendingKey);
    const verified = checkedCallback(params, attempt, window.location.origin);
    const currentRevision = ++revision;
    const next = await tokenRequest({ grant_type: "authorization_code", code: verified.code,
      code_verifier: verified.verifier, redirect_uri: verified.redirectUri });
    if (currentRevision !== revision) throw new LedgerError("The account session changed. Connect again.");
    tokens = next;
    const claims = accessClaims(next.access_token);
    const userResponse = await ledgerRequest("GET", `/v2/users/${encodeURIComponent(claims.sub)}`) as { user?: { id?: string; primaryParty?: string; isDeactivated?: boolean } };
    if (currentRevision !== revision) throw new LedgerError("The account session changed. Connect again.");
    const user = userResponse.user;
    if (!user || user.id !== claims.sub || user.isDeactivated) throw new LedgerError("The ledger account is unavailable.");
    const rightsResponse = await ledgerRequest("GET", `/v2/users/${encodeURIComponent(claims.sub)}/rights`) as {
      rights?: Array<{kind?: {CanActAs?: {value?: {party?: string}}}}>;
    };
    if (currentRevision !== revision) throw new LedgerError("The account session changed. Connect again.");
    const parties = [...new Set((rightsResponse.rights ?? []).flatMap(r => {
      const party = r.kind?.CanActAs?.value?.party;
      return typeof party === "string" && party.includes("::") ? [party] : [];
    }))].sort();
    if (!parties.length) throw new LedgerError("Allocate your party in the HackCanton wallet, then reconnect. This account has no act-as party yet.");
    context = { subject: claims.sub, parties, ...(parties.includes(user.primaryParty ?? "") ? { primaryParty: user.primaryParty } : {}), request: ledgerRequest };
    if (attempt?.returnHash) window.history.replaceState(null, "", `/app${attempt.returnHash}`);
    return context;
  })();
  return callbackWork;
}
