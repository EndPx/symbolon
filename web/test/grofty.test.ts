import test from "node:test";
import assert from "node:assert/strict";
import { GroftyClient, type CantonAccount, type Cip0103Provider, type StatusEvent } from "@groftylabs/dapp-sdk";
import { create, type SubmissionOptions } from "../src/ledger/api.ts";
import {
  GROFTY_NETWORK_ID, GROFTY_REQUEST_TIMEOUT_MS, GroftyRequestError, WalletSessionChanged,
  groftyError, openGroftySession, supportedGroftyVersion,
} from "../src/ledger/grofty.ts";
import { connectWallet, rememberedSession, restoreSession } from "../src/ledger/session.ts";

// The actual SDK sits between the adapter and this provider; no wallet or network is used.
class FakeProvider implements Cip0103Provider {
  calls: Array<{ method: string; params?: any }> = [];
  listeners = new Map<string, Set<(...args: any[]) => void>>();
  status: StatusEvent = {
    connection: { isConnected: true, isNetworkConnected: true },
    provider: { id: "grofty", version: "2.0.4", providerType: "browser" },
    network: { networkId: GROFTY_NETWORK_ID },
  };
  account: CantonAccount = { primary: true, partyId: "alice::namespace", status: "allocated",
    hint: "alice", publicKey: "public-key", namespace: "namespace", networkId: GROFTY_NETWORK_ID, signingProviderId: "grofty" };
  network = GROFTY_NETWORK_ID;
  ledgerEnd: unknown = { offset: 42 };
  contracts: unknown = [{ contractEntry: { JsActiveContract: { synchronizerId: "sync::mainnet", createdEvent: {
    contractId: "cid", templateId: "pkg:Symbolon.Repo:QuoteRequest", createArgument: { borrower: "alice::namespace" }, createdEventBlob: "event-blob",
  } } } }];
  execute: (params: any) => Promise<unknown> = async params => ({ tx: {
    status: "executed", commandId: params.commandId, payload: { updateId: "update-123", completionOffset: 43 },
  } });
  async request<T>({ method, params }: { method: string; params?: unknown }): Promise<T> {
    this.calls.push({ method, params });
    switch (method) {
      case "status": return structuredClone(this.status) as T;
      case "connect": this.status.connection.isConnected = true; return { isConnected: true } as T;
      case "disconnect": this.status.connection.isConnected = false; return undefined as T;
      case "getActiveNetwork": return { networkId: this.network } as T;
      case "getPrimaryAccount": return structuredClone(this.account) as T;
      case "prepareExecuteAndWait": return await this.execute(params) as T;
      case "ledgerApi": return ((params as any).resource.endsWith("ledger-end") ? this.ledgerEnd : this.contracts) as T;
      default: throw new Error(`Unexpected method ${method}`);
    }
  }
  on(event: string, listener: (...args: any[]) => void) {
    const listeners = this.listeners.get(event) ?? new Set(); listeners.add(listener); this.listeners.set(event, listeners);
  }
  removeListener(event: string, listener: (...args: any[]) => void) { this.listeners.get(event)?.delete(listener); }
  emit(event: string, payload: unknown) { [...(this.listeners.get(event) ?? [])].forEach(listener => listener(payload)); return true; }
  listenerCount() { return [...this.listeners.values()].reduce((count, listeners) => count + listeners.size, 0); }
}
const commands = [create("#symbolon:Symbolon.Repo:QuoteRequest", { borrower: "alice::namespace" })];
async function ready(provider = new FakeProvider(), forget = () => {}) {
  const session = await openGroftySession(new GroftyClient(provider), true, forget);
  assert.ok(session);
  return { provider, session };
}

test("wallet compatibility requires released 2.0.4+ and the SDK deadline exceeds the 3-minute approval window", () => {
  for (const version of ["2.0.4", "2.0.5", "2.1.0", "3.0.0", "v2.0.4+build.2"]) assert.equal(supportedGroftyVersion(version), true);
  for (const version of ["2.0.2", "2.0.3", "1.9.99", "2.0.4-beta", "unknown", "2.0"]) assert.equal(supportedGroftyVersion(version), false);
  assert.ok(GROFTY_REQUEST_TIMEOUT_MS > 180_000);
});

test("connection rejects wrong provider, old wallet, wrong network and unallocated party before approval", async () => {
  for (const mutate of [
    (p: FakeProvider) => { p.status.provider.id = "another-wallet"; },
    (p: FakeProvider) => { p.status.provider.version = "2.0.3"; },
    (p: FakeProvider) => { p.status.network = { networkId: "canton:da-devnet" }; },
  ]) {
    const provider = new FakeProvider(); mutate(provider);
    await assert.rejects(openGroftySession(new GroftyClient(provider), true));
    assert.equal(provider.calls.some(call => call.method === "connect"), false);
  }
  for (const mutate of [
    (p: FakeProvider) => { p.account.status = "pending"; },
    (p: FakeProvider) => { p.account.primary = false; },
    (p: FakeProvider) => { p.account.networkId = "canton:da-devnet"; },
    (p: FakeProvider) => { p.network = "canton:da-devnet"; },
  ]) {
    const provider = new FakeProvider(); mutate(provider);
    await assert.rejects(openGroftySession(new GroftyClient(provider), false), WalletSessionChanged);
    assert.equal(provider.listenerCount(), 0);
  }
});

test("restore is noninteractive and only binds a currently connected MainNet primary party", async () => {
  const provider = new FakeProvider();
  provider.status.connection.isConnected = false;
  assert.equal(await openGroftySession(new GroftyClient(provider), false), null);
  provider.status.connection.isConnected = true;
  const session = await openGroftySession(new GroftyClient(provider), false);
  assert.equal(session?.party, provider.account.partyId);
  assert.equal(session?.networkId, GROFTY_NETWORK_ID);
  assert.equal(session?.walletVersion, "2.0.4");
  assert.equal(provider.calls.some(call => call.method === "connect"), false);
  session?.dispose?.();
});

test("Grofty reads own-party contracts at a ledger offset and retains disclosure metadata", async () => {
  const { session, provider } = await ready();
  provider.ledgerEnd = { response: '{"offset":42}' };
  const contracts = await session.read();
  assert.equal(contracts[0].createdEventBlob, "event-blob");
  assert.equal(contracts[0].synchronizerId, "sync::mainnet");
  assert.deepEqual(provider.calls.filter(call => call.method === "ledgerApi").map(call => call.params), [
    { requestMethod: "GET", resource: "/v2/state/ledger-end" },
    { requestMethod: "POST", resource: "/v2/state/active-contracts", body: { activeAtOffset: 42, includeCreatedEventBlob: true } },
  ]);
  session.dispose?.();
});

test("native submission sends only the connected readAs and waits for a matching committed receipt", async () => {
  const { session, provider } = await ready();
  const options: SubmissionOptions = { synchronizerId: "sync::mainnet", packageIdSelectionPreference: ["pkg"],
    disclosedContracts: [{ templateId: "pkg:Module:Template", contractId: "cid", createdEventBlob: "blob", synchronizerId: "sync::mainnet" }] };
  assert.equal(await session.submit(commands, options), "update-123");
  const calls = provider.calls.filter(call => call.method === "prepareExecuteAndWait");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].params.readAs, [provider.account.partyId]);
  assert.equal("actAs" in calls[0].params, false);
  assert.equal("userId" in calls[0].params, false);
  assert.deepEqual(calls[0].params.disclosedContracts, options.disclosedContracts);
  assert.equal(calls[0].params.synchronizerId, options.synchronizerId);
  assert.match(calls[0].params.commandId, /^symbolon-/);
  assert.equal(provider.calls.some(call => call.method === "ledgerApi"), false);
  session.dispose?.();
});

test("foreign authority and incomplete disclosed contracts are rejected before a signing request", async () => {
  const { session, provider } = await ready();
  for (const options of [{ actAs: ["mallory"] }, { readAs: ["mallory"] }, { commandId: "reused" },
    { disclosedContracts: [{ createdEventBlob: "blob" }] }]) {
    await assert.rejects(session.submit(commands, options as SubmissionOptions));
  }
  assert.equal(provider.calls.some(call => call.method === "prepareExecuteAndWait"), false);
  session.dispose?.();
});

test("missing, signed-only, mismatched and malformed receipts never report success", async () => {
  const { session, provider } = await ready();
  for (const receipt of [undefined, {}, { tx: { status: "signed" } },
    { tx: { status: "executed", commandId: "other", payload: { updateId: "update", completionOffset: 1 } } }]) {
    provider.execute = async () => receipt;
    await assert.rejects(session.submit(commands), /no matching committed transaction receipt/);
  }
  for (const payload of [{ updateId: "", completionOffset: 1 }, { updateId: "update", completionOffset: -1 }, { updateId: "update", completionOffset: "1" }]) {
    provider.execute = async params => ({ tx: { status: "executed", commandId: params.commandId, payload } });
    await assert.rejects(session.submit(commands), /no matching committed transaction receipt/);
  }
  session.dispose?.();
});

test("decline and internal/expired approval have distinct messages and never auto retry", async () => {
  const { session, provider } = await ready();
  for (const code of [4001, -32603]) {
    provider.execute = async () => { throw { code, message: "wallet result" }; };
    await assert.rejects(session.submit(commands), error => {
      assert.ok(error instanceof GroftyRequestError);
      assert.equal(error.code, code);
      assert.match(error.message, code === 4001 ? /declined/ : /expired after 3 minutes.*internal error/);
      if (code === -32603) assert.doesNotMatch(error.message, /declined|rejected/);
      return true;
    });
  }
  assert.equal(provider.calls.filter(call => call.method === "prepareExecuteAndWait").length, 2);
  assert.equal(groftyError({ code: 4100 }).message.includes("Unlock"), true);
  session.dispose?.();
});

test("account switch invalidates once, clears listeners and blocks stale authority", async () => {
  let forgotten = 0;
  const { session, provider } = await ready(new FakeProvider(), () => { forgotten++; });
  const reasons: string[] = [];
  session.onInvalidated?.(reason => reasons.push(reason));
  provider.emit("accountsChanged", [{ ...provider.account, partyId: "bob::namespace" }]);
  provider.emit("connected", { isConnected: false });
  assert.equal(reasons.length, 1);
  assert.equal(forgotten, 1);
  assert.equal(provider.listenerCount(), 0);
  await assert.rejects(session.read(), WalletSessionChanged);
  await assert.rejects(session.submit(commands), WalletSessionChanged);
  assert.equal(provider.calls.some(call => call.method === "prepareExecuteAndWait"), false);
});

test("network changes, disconnects and account changes without events fail closed", async () => {
  for (const mutate of [
    (p: FakeProvider) => { p.network = "canton:da-devnet"; },
    (p: FakeProvider) => { p.status.connection.isConnected = false; },
    (p: FakeProvider) => { p.account.partyId = "bob::namespace"; },
    (p: FakeProvider) => { p.status.provider.version = "2.0.3"; },
  ]) {
    const { session, provider } = await ready();
    let invalidated = false; session.onInvalidated?.(() => { invalidated = true; }); mutate(provider);
    await assert.rejects(session.submit(commands), WalletSessionChanged);
    assert.equal(invalidated, true);
    assert.equal(provider.listenerCount(), 0);
    assert.equal(provider.calls.some(call => call.method === "prepareExecuteAndWait"), false);
  }
});

test("concurrent approval is blocked and a committed transaction after account change is reported accurately", async () => {
  const { session, provider } = await ready();
  let resolveExecution!: (value: unknown) => void;
  let announceStarted!: () => void;
  const started = new Promise<void>(resolve => { announceStarted = resolve; });
  let commandId = "";
  provider.execute = params => { commandId = params.commandId; announceStarted(); return new Promise(resolve => { resolveExecution = resolve; }); };
  const pending = session.submit(commands);
  await started;
  await assert.rejects(session.submit(commands), /approval is already pending/);
  provider.emit("accountsChanged", [{ ...provider.account, partyId: "bob::namespace" }]);
  resolveExecution({ tx: { status: "executed", commandId, payload: { updateId: "committed-before-change", completionOffset: 55 } } });
  await assert.rejects(pending, /committed-before-change committed for the previous party/);
  assert.equal(provider.calls.filter(call => call.method === "prepareExecuteAndWait").length, 1);
});

test("local disposal removes subscriptions without revoking permission; explicit disconnect revokes", async () => {
  const { session, provider } = await ready();
  assert.equal(provider.listenerCount(), 3);
  session.dispose?.();
  assert.equal(provider.listenerCount(), 0);
  assert.equal(provider.calls.some(call => call.method === "disconnect"), false);
  await assert.rejects(session.read(), WalletSessionChanged);
  const next = await openGroftySession(new GroftyClient(provider), false);
  assert.ok(next);
  await next.disconnect();
  assert.equal(provider.listenerCount(), 0);
  assert.equal(provider.calls.filter(call => call.method === "disconnect").length, 1);
});

test("matching deployment restores silently and a delayed restore cannot replace a newer connection", async () => {
  const provider = new FakeProvider();
  const storage = new Map<string, string>();
  const priorWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const priorStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const priorFetch = globalThis.fetch;
  const { loadDeployment, defaultDeployment } = await import("../src/ledger/deployment.ts");
  globalThis.fetch = async () => new Response(JSON.stringify({ ...defaultDeployment, network: "mainnet", walletNetwork: "mainnet" }));
  await loadDeployment();
  Object.defineProperty(globalThis, "window", { configurable: true, value: Object.assign(new EventTarget(), {
    cantonWallet: provider, location: { hostname: "symbolon.example" },
  }) });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    setItem: (key: string, value: string) => storage.set(key, value),
    getItem: (key: string) => storage.get(key) ?? null,
    removeItem: (key: string) => storage.delete(key),
  } });
  try {
    await assert.rejects(connectWallet("grofty", "devnet"), /MainNet only/);
    assert.equal(provider.calls.length, 0);
    const connected = await connectWallet("grofty", "mainnet");
    const beforeSigning = provider.calls.length;
    await assert.rejects(connected.submit(commands), /MainNet trading is disabled/);
    assert.equal(provider.calls.length, beforeSigning, "release gate blocks before a wallet signing request");
    assert.deepEqual(JSON.parse(storage.get("symbolon.session.v3")!), { kind: "wallet", walletId: "grofty", network: "mainnet" });
    assert.deepEqual(rememberedSession(), { kind: "wallet", walletId: "grofty", network: "mainnet" });
    assert.equal(storage.size, 1);
    connected.dispose?.();
    const restored = await restoreSession();
    assert.equal(restored?.party, provider.account.partyId);
    assert.equal(provider.calls.filter(call => call.method === "connect").length, 1);
    const originalRequest = provider.request.bind(provider);
    let delayNextAccount = true;
    let announceStarted!: () => void;
    let releaseAccount!: () => void;
    const started = new Promise<void>(resolve => { announceStarted = resolve; });
    const blocked = new Promise<void>(resolve => { releaseAccount = resolve; });
    provider.request = async args => {
      if (args.method === "getPrimaryAccount" && delayNextAccount) {
        delayNextAccount = false; announceStarted(); await blocked;
      }
      return originalRequest(args);
    };
    const staleRestore = restoreSession();
    await started;
    const newest = await connectWallet("grofty", "mainnet");
    releaseAccount();
    assert.equal(await staleRestore, null);
    assert.equal((await newest.read()).length, 1);
    assert.equal(provider.listenerCount(), 3);
    assert.equal(storage.size, 1);
    provider.emit("accountsChanged", []);
    assert.equal(storage.size, 0);
    assert.equal(await restoreSession(), null);
  } finally {
    globalThis.fetch = async () => new Response(JSON.stringify(defaultDeployment));
    await loadDeployment();
    globalThis.fetch = priorFetch;
    if (priorWindow) Object.defineProperty(globalThis, "window", priorWindow); else Reflect.deleteProperty(globalThis, "window");
    if (priorStorage) Object.defineProperty(globalThis, "localStorage", priorStorage); else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
