import assert from "node:assert/strict";
import test from "node:test";
import { DEVNET_ORIGIN, PACKAGES, reviewedOrigin, redact, pinCommands, eventFormat,
  committedTransaction, preparedRoles, PROOF_ROLES } from "../lib/shared-devnet.mjs";

test("shared proof refuses MainNet, loopback, lookalike hosts and credential-bearing URLs", () => {
  assert.equal(reviewedOrigin(DEVNET_ORIGIN), DEVNET_ORIGIN);
  for (const url of ["http://127.0.0.1:6864", "https://ledger-api.mainnet.example", DEVNET_ORIGIN + ".evil.example",
    DEVNET_ORIGIN + "/proxy", DEVNET_ORIGIN + "?target=mainnet", DEVNET_ORIGIN.replace("https://", "https://token@")]) {
    assert.throws(() => reviewedOrigin(url));
  }
});

test("commands are pinned to reviewed demo packages and cannot invoke a real asset package", () => {
  const command = { CreateCommand: { templateId: "#symbolon-v2:Symbolon.DemoAsset:Holding", createArguments: {} } };
  const [pinned] = pinCommands([command]);
  assert.equal(pinned.CreateCommand.templateId, PACKAGES.core + ":Symbolon.DemoAsset:Holding");
  assert.equal(command.CreateCommand.templateId, "#symbolon-v2:Symbolon.DemoAsset:Holding");
  assert.throws(() => pinCommands([{ ExerciseCommand: { templateId: "unknown-token-package:USDCx:Transfer", contractId:"cid",choice:"Transfer" } }]));
});

test("evidence redacts the supplied token and bearer/JWT values", () => {
  const secret="operator-token-sentinel";
  const output=redact(`token=${secret} Authorization: Bearer another-secret eyJabc.def.ghi`,secret);
  assert.ok(!output.includes(secret)); assert.ok(!output.includes("another-secret")); assert.ok(!output.includes("eyJabc"));
});

test("active-contract queries stay party-scoped and have no any-party filter", () => {
  const format=eventFormat(["borrower::id","borrower::id","dealer::id"]);
  assert.deepEqual(Object.keys(format.filtersByParty),["borrower::id","dealer::id"]);
  assert.equal(format.filtersForAnyParty,undefined);
  assert.throws(()=>eventFormat([]));
});

test("Console roles require own namespace, one fresh batch and actual can-act-as; wallet primary party cannot be reused", () => {
  const suffix = "1220" + "a".repeat(64);
  const profile = { namespace: "1234abcd-", roleBatch: "aabbccdd", participantId: "participant::" + suffix };
  profile.roles = Object.fromEntries(PROOF_ROLES.map(role => [role, `${profile.namespace}symbolon-proof-${profile.roleBatch}-${role}::${suffix}`]));
  const rights = Object.values(profile.roles).map(party => ({ kind: { CanActAs: { value: { party } } } }));
  assert.deepEqual(preparedRoles(profile, rights), profile.roles);
  assert.throws(() => preparedRoles(profile, rights.slice(1)), /can-act-as/);
  for (const badParty of ["wallet-primary::" + suffix, profile.roles.borrower.replace("1234abcd-", "deadbeef-"), profile.roles.dealer]) {
    assert.throws(() => preparedRoles({ ...profile, roles: { ...profile.roles, borrower: badParty } }, rights));
  }
  assert.throws(() => preparedRoles({ ...profile, roleBatch: undefined }, rights));
});

test("only a matching committed transaction with ledger offset and timestamps is evidence", () => {
  const tx={updateId:"ledger-update",commandId:"original-command",synchronizerId:"devnet-sync",offset:42,
    recordTime:"2026-10-07T00:00:00Z",effectiveAt:"2026-10-07T00:00:00Z",events:[]};
  assert.equal(committedTransaction({transaction:tx},"original-command","devnet-sync"),tx);
  for(const changed of [{...tx,commandId:"different"},{...tx,synchronizerId:"mainnet-sync"},{...tx,offset:0},{...tx,recordTime:""}]) {
    assert.throws(()=>committedTransaction({transaction:changed},"original-command","devnet-sync"));
  }
  assert.throws(()=>committedTransaction({updateId:"submitted-only"},"original-command","devnet-sync"));
});
