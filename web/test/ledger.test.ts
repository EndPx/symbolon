import test from "node:test";
import assert from "node:assert/strict";
import { LedgerApi, LedgerError, create, walletTransport, type Transport } from "../src/ledger/api.ts";

test("CIP-0103 JSON string responses are decoded before reading contract state", async () => {
  const transport = walletTransport({ ledgerApi: async () => ({ response: '{"offset":42}' }) });
  assert.equal(await new LedgerApi(transport).ledgerEnd(), 42);
});

test("wallet errors and malformed responses cannot masquerade as an empty book", async () => {
  for (const response of ['{"code":"PERMISSION_DENIED","cause":"No read rights"}', "<html>sign in</html>", "null", "{}"] ) {
    const transport = walletTransport({ ledgerApi: async () => ({ response }) });
    await assert.rejects(new LedgerApi(transport).ledgerEnd(), LedgerError);
  }
});

test("wallet submission leaves the authenticated user to the participant and requires a receipt", async () => {
  let sent: Record<string, unknown> = {};
  const transport: Transport = { kind: "wallet", async request<T>(_method, _path, body) {
    sent = body as Record<string, unknown>;
    return { updateId: "update-123" } as T;
  } };
  const api = new LedgerApi(transport);
  assert.equal(await api.submit("borrower::party", [create("#symbolon:Repo:Test", {})]), "update-123");
  assert.deepEqual(sent.actAs, ["borrower::party"]);
  assert.equal("userId" in sent, false);
  assert.match(String(sent.commandId), /^symbolon-/);
  const noReceipt: Transport = { kind: "wallet", async request<T>() { return {} as T; } };
  await assert.rejects(new LedgerApi(noReceipt).submit("borrower", [create("template", {})]), /Refresh the book/);
});

test("contract reads use a ledger offset and a filter scoped to the connected party", async () => {
  let filter: unknown;
  const transport: Transport = { kind: "wallet", async request<T>(_method, path, body) {
    if (path.endsWith("ledger-end")) return { offset: 99 } as T;
    filter = body;
    return [{ contractEntry: { JsActiveContract: { createdEvent: {
      contractId: "cid", templateId: "template", createArgument: { borrower: "alice" },
    } } } }] as T;
  } };
  const contracts = await new LedgerApi(transport).activeContracts("alice");
  assert.deepEqual(Object.keys((filter as any).filter.filtersByParty), ["alice"]);
  assert.equal((filter as any).activeAtOffset, 99);
  assert.equal(contracts[0].payload.borrower, "alice");
});

test("a missing party or empty command cannot create a phantom transaction", async () => {
  const transport: Transport = { kind: "wallet", async request<T>() { throw new Error("must not send"); } };
  await assert.rejects(new LedgerApi(transport).submit("", [create("template", {})]), /party/);
  await assert.rejects(new LedgerApi(transport).submit("alice", []), /command/);
});
