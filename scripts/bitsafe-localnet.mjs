/** Real DecMan integration, confined to the official disposable LocalNet.
 * Run with tsx after hackathon/up.sh + seed.sh; creates isolated demo parties.
 * Never use this unauthenticated harness against a shared DevNet/MainNet.
 */
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { LedgerApi, create, dec } from "../web/src/ledger/api.ts";
import { TPL, deskState, health, balanceOf } from "../web/src/ledger/symbolon.ts";
import { requestQuotes, sendQuote, acceptQuote, issueMarginCall, topUp, repay } from "../web/src/app/actions.ts";

const commit = "21ffdedf64366b1f2824301c434b427bf4726663";
const home = resolve(process.env.BITSAFE_LOCALNET_HOME ?? ".omc/bitsafe-localnet");
assert.equal(execFileSync("git", ["rev-parse", "HEAD"], { cwd: home, encoding: "utf8" }).trim(), commit, "Pinned BitSafe source required");
const localnet = await readFile(resolve(home, "hackathon/localnet.sh"), "utf8");
const token = localnet.match(/^LOCALNET_CANTON_TOKEN=['"]?([A-Za-z0-9_.-]+)/m)?.[1];
assert.ok(token, "Official LocalNet bearer token not found; never pass real credentials");
const stateText = await readFile(resolve(home, "hackathon/.state"), "utf8");
const state = Object.fromEntries(stateText.split(/\r?\n/).filter(line => /^[A-Z_0-9]+=/.test(line))
  .map(line => { const at = line.indexOf("="); return [line.slice(0, at), line.slice(at + 1).replace(/^['"]|['"]$/g, "")]; }));
const party = state.DEC_PARTY_ID;
const members = [state.MEMBER_1, state.MEMBER_2, state.MEMBER_3];
assert.ok(party && members.every(Boolean), "Run the official seed.sh first");
const dmPorts = [8081, 8082, 8083];
const ledgerPorts = [3975, 2975, 4975];
const receipts = [];
const step = message => console.log(`[bitsafe-localnet] ${message}`);
async function request(port, path, method = "GET", body, ledger = false, allowError = false) {
  assert.ok([...dmPorts, ...ledgerPorts].includes(port));
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method, signal: AbortSignal.timeout(120000),
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(ledger ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await response.text();
  let data; try { data = JSON.parse(raw || "{}"); } catch { throw new Error(`Non-JSON LocalNet response: ${port}${path}`); }
  if (!response.ok && !allowError) throw new Error(`${port}${path}: HTTP ${response.status}: ${raw.replaceAll(token, "[redacted]").slice(0, 1500)}`);
  return allowError ? { status: response.status, data } : data;
}
async function poll(label, read, accept, timeout = 180000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = await read();
    if (accept(value)) return value;
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  throw new Error(`Timed out: ${label}`);
}
const apis = ledgerPorts.map(port => new LedgerApi({ kind: "sandbox",
  request: (method, path, body) => request(port, path, method, body, true),
}, "ledger-api-user"));
const session = p => ({ kind: "sandbox", party: p, label: p,
  read: () => apis[0].activeContracts(p),
  submit: async commands => { const id = await apis[0].submit(p, commands); receipts.push(id); return id; },
  disconnect: async () => {},
});
const book = async p => deskState(await apis[0].activeContracts(p));
const one = (items, label) => { assert.equal(items.length, 1, label); return items[0]; };
const source = "#symbolon-bitsafe:Symbolon.BitSafe.PriceMarkProposal";
await Promise.all(dmPorts.map(port => request(port, "/healthz")));
const nodes = await Promise.all(dmPorts.map(port => request(port, "/node-config")));
const pids = nodes.map(node => node.node.participant_id);
assert.equal(new Set(pids).size, 3, "Three distinct Canton participant identities");
const rules = (await request(8081, `/governance/state?party_id=${encodeURIComponent(party)}`)).state.contract_id;
assert.ok(rules, "Live governance rules CID required");
step("Distributing application DARs to three participants.");
const darFiles = await Promise.all([
  "daml/.daml/dist/symbolon-v2-0.2.0.dar", "daml-bitsafe/.daml/dist/symbolon-bitsafe-0.2.0.dar",
].map(async path => ({ filename: path.split("/").at(-1), data: (await readFile(path)).toString("base64") })));
await request(8081, "/dars/distribute", "POST", { dar_files: darFiles, peer_ids: pids.slice(1) });
await Promise.all([8082, 8083].map(async port => {
  const invitation = await poll(`DAR invitation on ${port}`, () => request(port, "/invitations"),
    value => value.invitations?.some(item => item.invitation_type === "Dars"));
  await request(port, "/invitations/accept", "POST", { id: invitation.invitations.find(item => item.invitation_type === "Dars").id });
}));
await poll("DAR distribution", () => request(8081, "/dars/distribute/status"), value => {
  if (["failed", "cancelled"].includes(value.status)) throw new Error(`DAR distribution ${value.status}: ${value.error}`);
  return value.status === "completed";
});
const vetting = await Promise.all(dmPorts.map(port => request(port, "/packages/vetted")));
const runId = randomUUID().slice(0, 8);
const roles = {};
for (const name of ["issuer", "borrower", "dealer", "outsider"]) {
  const result = await request(3975, "/v2/parties", "POST", { party_id_hint: `symbolon-${name}-${runId}`, local_metadata: { annotations: {} } }, true);
  roles[name] = result.partyDetails.party;
}
await request(3975, "/v2/users/ledger-api-user/rights", "POST", {
  userId: "ledger-api-user", identityProviderId: "",
  rights: Object.values(roles).flatMap(p => [{ kind: { CanActAs: { value: { party: p } } } }, { kind: { CanReadAs: { value: { party: p } } } }]),
}, true);
async function confirmations(port, cid) {
  const result = await request(port, `/governance/confirmations?party_id=${encodeURIComponent(party)}`);
  return result.domain_actions?.find(item => item.proposal_cid === cid);
}
async function executeProposal(template, fields, label, negative = false) {
  const before = new Set((await apis[0].activeContracts(party)).map(item => item.contractId));
  receipts.push(await apis[0].submit(members[0], [create(`${source}:${template}`, { governanceParty: party, proposer: members[0], ...fields })]));
  const proposal = await poll(label, () => apis[0].activeContracts(party), items => items.some(item => !before.has(item.contractId) && item.templateId.endsWith(`:${template}`)));
  const cid = proposal.find(item => !before.has(item.contractId) && item.templateId.endsWith(`:${template}`)).contractId;
  const common = { party_id: party, rules_contract_id: rules, action: { type: "governance_set_threshold", new_threshold: 0 }, governance_type: "core_domain", proposal_cid: cid };
  await poll("proposal visibility", () => confirmations(8081, cid), Boolean);
  await request(8081, "/governance/confirm", "POST", common);
  const first = await poll("first confirmation", () => confirmations(8083, cid), item => item?.confirmations?.length === 1);
  assert.equal(first.can_execute, false, "One member must not meet threshold");
  let rejected;
  if (negative) {
    rejected = await request(8083, "/governance/execute", "POST", { ...common, confirmation_cids: first.confirmations.map(item => item.contract_id), disclosed_contracts: [] }, false, true);
    assert.ok(rejected.status >= 400, "Execution with one confirmation must fail");
    assert.match(JSON.stringify(rejected.data), /threshold|confirmations|insufficient|enough/i, "Threshold rejection must be genuine");
    const current = one((await book(roles.borrower)).feeds, "Old mark must remain active");
    assert.equal(Number(current.payload.price), 60000);
  }
  await request(8082, "/governance/confirm", "POST", common);
  const ready = await poll("two-member threshold", () => confirmations(8083, cid), item => item?.can_execute && item.confirmations?.length >= 2);
  const executed = await request(8083, "/governance/execute", "POST", { ...common, confirmation_cids: ready.confirmations.map(item => item.contract_id), disclosed_contracts: [] });
  return { label, proposalCid: cid, rejected, executed };
}
const before = await apis[0].ledgerEnd();
step("Initializing the decentralized oracle through a 2-of-3 GovernableAction.");
const initialized = await executeProposal("InitializePriceFeedProposal", {
  instrumentIssuer: roles.issuer, instrument: "cBTC-demo", cashIssuer: roles.issuer,
  cashInstrument: "USDCx-demo", initialPrice: dec(60000), readers: [roles.borrower, roles.dealer],
}, "InitializeSymbolonMark");
await poll("initial mark", () => book(roles.borrower), value => value.feeds.length === 1);
const [issuer, borrower, dealer] = ["issuer", "borrower", "dealer"].map(role => session(roles[role]));
await issuer.submit([[roles.borrower, "cBTC-demo", 0.1], [roles.borrower, "USDCx-demo", 5000], [roles.dealer, "USDCx-demo", 20000]].map(([owner, instrument, amount]) =>
  create(TPL.Holding, { issuer: roles.issuer, owner, instrument, amount: dec(amount), viewers: [], lockParties: [] })));
await requestQuotes(borrower, { dealers: [dealer.party], oracle: party,
  collateralIssuer: issuer.party, collateralInstrument: "cBTC-demo", collateralAmount: 0.025,
  cashIssuer: issuer.party, cashInstrument: "USDCx-demo", cashAmount: 1000, termDays: 30,
  marginThresholdPct: 1.05, cureSeconds: 600, maxPriceAgeSeconds: 3600 });
await sendQuote(dealer, one((await book(dealer.party)).requests, "RFQ"), 0.052, 3600);
await acceptQuote(borrower, one((await book(borrower.party)).quotes, "funded quote"), one((await book(borrower.party)).feeds, "initial mark").contractId);
const initial = one((await book(borrower.party)).positions, "opened repo");
assert.equal(initial.payload.repurchasePrice, "1004.3333333333");
assert.equal(health(initial.payload, (await book(borrower.party)).feeds).healthy, true);
assert.equal((await apis[0].activeContracts(roles.outsider)).length, 0, "Unrelated party privacy");
step("One confirmation cannot change the mark; two approvals publish the lower price.");
const oldFeed = one((await book(borrower.party)).feeds, "old mark");
const marked = await executeProposal("PriceMarkProposal", { feedCid: oldFeed.contractId, newPrice: dec(36000) }, "SetSymbolonMark", true);
await poll("approved replacement mark", () => book(borrower.party), value => value.feeds.some(feed => Number(feed.payload.price) === 36000));
const approvedFeed = one((await book(borrower.party)).feeds, "new mark");
assert.notEqual(approvedFeed.contractId, oldFeed.contractId);
assert.ok(health(initial.payload, [approvedFeed]).factor < 1);
await issueMarginCall(dealer, initial.contractId, approvedFeed.contractId);
const called = one((await book(borrower.party)).positions, "called repo");
assert.equal(called.payload.status.tag, "UnderCall");
await topUp(borrower, called, 0.005, approvedFeed.contractId);
const cured = one((await book(borrower.party)).positions, "cured repo");
assert.equal(cured.payload.status.tag, "Active");
assert.ok(health(cured.payload, [approvedFeed]).factor >= 1);
await repay(borrower, cured);
const closed = one((await book(borrower.party)).closed, "closing receipt");
assert.equal(closed.payload.outcome, "Repurchased");
assert.equal(balanceOf((await book(borrower.party)).holdings, borrower.party, "cBTC-demo", issuer.party), 0.1);
const audits = await Promise.all(dmPorts.map(port => poll(`chain audit on ${port}`, () => request(port, `/governance/chain-audit?party_id=${encodeURIComponent(party)}&limit=50&refresh=true`),
  data => new Set((data.entries ?? []).filter(entry => entry.event_type === "execute" && entry.update_id).map(entry => entry.update_id)).size >= 2)));
// Each node must see the same committed executions, not merely local REST logs.
const updates = audits.map(data => new Set(data.entries.filter(entry => entry.event_type === "execute").map(entry => entry.update_id)));
assert.ok(updates.every(ids => ids.size >= 2 && ids.size === updates[0].size), "Two distinct, equally observed execution updates per participant");
assert.ok([...updates[0]].every(id => id && updates[1].has(id) && updates[2].has(id)), "Consistent execution receipts across participants");
const evidence = { checkedAt: new Date().toISOString(), environment: "official disposable BitSafe three-participant LocalNet",
  sourceCommit: commit, decentralizedParty: party, participantIds: pids, roles, initialized, marked, vetting, audits,
  ledgerOffsetBefore: before, ledgerOffsetAfter: await apis[0].ledgerEnd(), updateIds: receipts,
  closedRepo: closed, assets: "simulated cBTC-demo / USDCx-demo", result: "passed" };
await mkdir(".omc/evidence", { recursive: true });
await writeFile(".omc/evidence/bitsafe-localnet.json", JSON.stringify(evidence, null, 2) + "\n");
step(`Passed: threshold control → margin call → top-up → Repurchased; ${receipts.length} application receipts; all-node chain audit saved.`);
