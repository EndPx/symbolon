import test from "node:test";
import assert from "node:assert/strict";
import { parseAccountResume, resumedParty } from "../src/ledger/account-resume.ts";
import { ACCOUNT_ISSUER, captureAccountCallback, disconnectAccount, finishAccountConnection } from "../src/ledger/account.ts";

const origin = "https://symbolon.endpx.cloud";
const preference = { version: 1, origin, network: "devnet", subject: "user", party: "borrower::a", savedAt: 100 };
test("refresh preference contains no token or authority and is scoped to origin, network and time", () => {
  assert.deepEqual(parseAccountResume(JSON.stringify(preference), origin, 200), preference);
  for (const value of [{ ...preference, origin: "https://other.example" }, { ...preference, network: "mainnet" }, { ...preference, access_token: "secret" }, { ...preference, refresh_token: "secret" }, { ...preference, savedAt: 201 }, { ...preference, savedAt: -8 * 60 * 60 * 1000 }, { ...preference, party: "missing-id" }]) {
    assert.equal(parseAccountResume(JSON.stringify(value), origin, 200), null);
  }
});
test("a selected party resumes only when the fresh signed-in subject and live act-as rights both match", () => {
  const saved = parseAccountResume(JSON.stringify(preference), origin, 200);
  assert.equal(resumedParty(saved, "user", ["borrower::a", "lender::b"]), "borrower::a");
  assert.equal(resumedParty(saved, "other-user", ["borrower::a"]), undefined);
  assert.equal(resumedParty(saved, "user", ["lender::b"]), undefined);
  assert.equal(resumedParty(null, "user", ["borrower::a"]), undefined);
});

test("silent reload renews through PKCE once, validates current ledger rights, and disconnect prevents restoration", async () => {
  const originalWindow = globalThis.window, originalStorage = globalThis.sessionStorage, originalFetch = globalThis.fetch;
  const values = new Map<string,string>();
  const storage = { getItem: (key:string) => values.get(key) ?? null, setItem: (key:string,value:string) => values.set(key,value), removeItem: (key:string) => values.delete(key) } as unknown as Storage;
  const navigations: string[] = [];
  const location = { origin, protocol: "https:", hostname: "symbolon.endpx.cloud", hash: "", search: "", assign: (url:string) => navigations.push(url) };
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location, history: { replaceState() {} } } });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: storage });
  try {
    disconnectAccount();
    storage.setItem("symbolon.account.resume.v1", JSON.stringify({ ...preference, savedAt: Date.now() }));
    const first = finishAccountConnection(), second = finishAccountConnection();
    assert.equal(first, second);
    await first;
    assert.equal(navigations.length, 1);
    const url = new URL(navigations[0]);
    assert.equal(url.origin, new URL(ACCOUNT_ISSUER).origin);
    assert.equal(url.searchParams.get("prompt"), "none");
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
    assert.equal(url.searchParams.has("access_token"), false);
    assert.equal(storage.getItem("symbolon.account.resume.v1"), null);
    const pending = storage.getItem("symbolon.account.pkce.v1")!;
    disconnectAccount(); // Simulate module reinitialization after the redirect.
    storage.setItem("symbolon.account.pkce.v1", pending);
    location.search = new URLSearchParams({ code: "one-use-code", state: url.searchParams.get("state")! }).toString();
    const accessToken = `header.${Buffer.from(JSON.stringify({ iss: ACCOUNT_ISSUER, sub: "user", exp: Date.now() / 1000 + 300, typ: "Bearer" })).toString("base64url")}.signature`;
    let reads = 0;
    globalThis.fetch = async (input) => {
      const path = String(input);
      if (path.endsWith("/token")) return Response.json({ access_token: accessToken });
      reads++;
      return Response.json(path.endsWith("/rights") ? { rights: [{ kind: { CanActAs: { value: { party: "borrower::a" } } } }] } : { user: { id: "user", primaryParty: "borrower::a" } });
    };
    captureAccountCallback();
    const account = await finishAccountConnection();
    assert.equal(account?.primaryParty, "borrower::a");
    assert.equal(reads, 2);
    assert.deepEqual(account?.parties, ["borrower::a"]);
    const saved = JSON.parse(storage.getItem("symbolon.account.resume.v1")!);
    assert.equal(saved.party, "borrower::a");
    assert.equal(JSON.stringify([...values.values()]).includes(accessToken), false);
    disconnectAccount();
    assert.equal(await finishAccountConnection(), null);
    assert.equal(navigations.length, 1);
  } finally {
    disconnectAccount(); globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: originalStorage });
  }
});

test("expired silent sign-in clears its preference instead of producing a reload redirect loop", async () => {
  const originalWindow = globalThis.window, originalStorage = globalThis.sessionStorage;
  const values = new Map<string,string>();
  const storage = { getItem: (key:string) => values.get(key) ?? null, setItem: (key:string,value:string) => values.set(key,value), removeItem: (key:string) => values.delete(key) } as unknown as Storage;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { origin, search: "?error=login_required&state=nonce", hash: "" }, history: { replaceState() {} } } });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: storage });
  try {
    disconnectAccount();
    storage.setItem("symbolon.account.pkce.v1", JSON.stringify({ state: "nonce", verifier: "verifier", redirectUri: `${origin}/app`, startedAt: Date.now(), returnHash: "", resume: { ...preference, savedAt: Date.now() } }));
    captureAccountCallback();
    await assert.rejects(finishAccountConnection(), /session expired/);
    assert.equal(await finishAccountConnection(), null);
    assert.equal(storage.getItem("symbolon.account.resume.v1"), null);
  } finally {
    disconnectAccount();
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: originalStorage });
  }
});
