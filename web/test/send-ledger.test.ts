import test from "node:test";
import assert from "node:assert/strict";
import type { SendAccount, SendStatusResponse } from "@partylayer/adapter-send";
import { attachSendLedger, attachSendReadOnly, verifySendIdentity } from "../src/ledger/send-ledger.ts";
import { defaultDeployment } from "../src/ledger/deployment.ts";
import type { Session } from "../src/ledger/session.ts";

const party = "alice::party", core = "a".repeat(64), publicPkg = "b".repeat(64), sync = "global::domain";
const status = { connection: { isConnected: true }, isNetworkConnected: true, network: { networkId: "canton:devnet" } } as SendStatusResponse;
const account = { partyId: party, status: "allocated", networkId: "canton:devnet" } as SendAccount;
const d = { ...defaultDeployment, corePackageId: core, publicPackageId: publicPkg, synchronizerId: sync };
test("Send TestNet reads only its own party before any Symbolon package deployment and never signs", async () => {
  const requests: Array<{resource: string; body?: unknown}> = [];
  const p = { ...provider(),
    status: async () => ({ ...status, network: { networkId: "canton:testnet" } }),
    getPrimaryAccount: async () => ({ ...account, networkId: "canton:da-testnet" }),
    ledgerApi: async (input: {resource: string; body?: unknown}) => { requests.push(input); return {response: JSON.stringify(input.resource.endsWith("ledger-end") ? {offset: 10} : [])}; },
  };
  const s = { ...session(), networkId: "testnet" };
  attachSendReadOnly(s, async () => {}, () => {}, p);
  assert.deepEqual(await s.read(), []);
  assert.deepEqual(requests.map(x => x.resource), ["/v2/state/ledger-end", "/v2/state/active-contracts"]);
  assert.deepEqual(Object.keys((requests[1].body as any).eventFormat.filtersByParty), [party]);
  await assert.rejects(s.submit([{CreateCommand:{templateId:"unvetted:App:Trade",createArguments:{}}}]), /read-only/);
});
test("Send TestNet discards a read when the native wallet party changes", async () => {
  let changed = false, invalidated = false;
  const p = { ...provider(),
    status: async () => ({ ...status, network: { networkId: "canton:testnet" } }),
    getPrimaryAccount: async () => ({ ...account, networkId: "canton:testnet", partyId: changed ? "other::party" : party }),
    ledgerApi: async () => { changed = true; return {response: JSON.stringify({offset: 10})}; },
  };
  const s = { ...session(), networkId: "testnet" };
  attachSendReadOnly(s, async () => {}, () => { invalidated = true; }, p);
  await assert.rejects(s.read(), /primary party differs/);
  assert.equal(invalidated, true);
});
function session(): Session { return { kind: "wallet", party, networkId: "devnet", label: "Send", wallet: "send", read: async () => [], submit: async () => "", disconnect: async () => {} }; }
function provider(onRead?: (resource:string, body:unknown) => void, installed = [core, publicPkg]) {
  return { status: async () => status, getPrimaryAccount: async () => account, prepareExecuteAndWait: async () => { throw new Error("Signing is not part of read tests"); }, ledgerApi: async ({resource, body}: {resource:string;body?:unknown}) => {
    onRead?.(resource, body);
    const data = resource === "/v2/version" ? { version: "3.5.6" } : resource === "/v2/packages" ? { packageIds: installed }
      : resource.startsWith("/v2/state/connected-synchronizers?") ? { connectedSynchronizers: [{ synchronizerId: sync, permission: "PARTICIPANT_PERMISSION_SUBMISSION" }] }
      : resource === "/v2/state/ledger-end" ? { offset: 10 } : [];
    return { response: JSON.stringify(data) };
  } };
}
test("Send read uses the wallet's native Ledger API and the connected party's v3.5 event format", async () => {
  let query: unknown;
  const s = attachSendLedger(session(), async () => {}, () => {}, provider((resource, body) => { if (resource === "/v2/state/active-contracts") query = body; }), d);
  assert.deepEqual(await s.read(), []);
  const q = query as { eventFormat: { filtersByParty: object }; activeAtOffset: number; filter?: unknown };
  assert.equal(q.activeAtOffset, 10);
  assert.deepEqual(Object.keys(q.eventFormat.filtersByParty), [party]);
  assert.equal(q.filter, undefined);
});
test("missing packages are an explicit compatibility error rather than an empty private book", async () => {
  const s = attachSendLedger(session(), async () => {}, () => {}, provider(undefined, [core]), d);
  await assert.rejects(s.read(), /packages are not installed/);
});
test("a rejected readiness check can recover once the participant installs the reviewed packages", async () => {
  const installed = [core];
  const s = attachSendLedger(session(), async () => {}, () => {}, provider(undefined, installed), d);
  await assert.rejects(s.read(), /packages are not installed/);
  installed.push(publicPkg);
  assert.deepEqual(await s.read(), []);
});
test("Send validates live party, allocation, network and connection, including known network aliases", () => {
  verifySendIdentity(status, account, party, "devnet");
  for (const change of [{ partyId: "bob::party" }, { status: "initialized" }, { networkId: "canton:mainnet" }, { disabled: true }]) assert.throws(() => verifySendIdentity(status, { ...account, ...change }, party, "devnet"));
  assert.throws(() => verifySendIdentity({ ...status, connection: { isConnected: false } }, account, party, "devnet"));
});
test("a wallet account change during a read invalidates the session and discards the old response", async () => {
  let current = account, invalidated = false;
  const p = { ...provider(), getPrimaryAccount: async () => current, ledgerApi: async () => { current = { ...account, partyId: "bob::party" }; return { response: '{}' }; } };
  const s = attachSendLedger(session(), async () => {}, () => { invalidated = true; }, p, d);
  await assert.rejects(s.read(), /Send primary party differs/);
  assert.equal(invalidated, true);
});
