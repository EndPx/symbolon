/** Authenticated shared-DevNet proof. No LocalNet/MainNet fallback and no browser-token extraction.
 * Run with: node web/node_modules/tsx/dist/cli.mjs scripts/shared-devnet.mjs [--execute] --auth-stdin
 * The PowerShell helper supplies one access token through process stdin, never arguments/files.
 */
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { LedgerApi, create, exercise, dec } from "../web/src/ledger/api.ts";
import { deskState, health, decimalUnits } from "../web/src/ledger/symbolon.ts";
import { requestQuotes, sendQuote, acceptQuote, issueMarginCall, topUp, repay } from "../web/src/app/actions.ts";
import { DEVNET_ORIGIN, PACKAGES, reviewedOrigin, redact, tokenSubject, eventFormat,
  pinCommands, committedTransaction, exerciseResult, preparedRoles } from "./lib/shared-devnet.mjs";

const require = createRequire(new URL("../web/package.json", import.meta.url));
const yaml = require("yaml");
const root = ".omc/devnet";
const execute = process.argv.includes("--execute");
const origin = reviewedOrigin(process.env.SYMBOLON_DEVNET_URL ?? DEVNET_ORIGIN);
let token = process.env.SYMBOLON_DEVNET_ACCESS_TOKEN ?? "";
if (process.argv.includes("--auth-stdin")) {
  const chunks = []; for await (const chunk of process.stdin) chunks.push(chunk);
  token = Buffer.concat(chunks).toString("utf8").trim();
}
await mkdir(root, { recursive: true });
const proof = { schemaVersion: 1, result: "preflight", capturedAt: new Date().toISOString(),
  network: "shared HackCanton DevNet", endpoint: origin, packages: PACKAGES,
  sourceRevision: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  assets: "simulated cBTC-demo / USDCx-demo", walletInvolved: false,
  governanceTopology: "ordinary hosted oracle party; one participant and one operator",
  decentralizedPartyDeployment: false, decmanServiceUsed: false, steps: [], snapshots: [] };
let directory = root;
proof.sourceFilesSha256 = Object.fromEntries(await Promise.all([
  "scripts/shared-devnet.mjs", "scripts/lib/shared-devnet.mjs", "web/src/app/actions.ts",
  "web/src/ledger/api.ts", "web/src/ledger/symbolon.ts",
].map(async file => [file, createHash("sha256").update(await readFile(new URL("../" + file, import.meta.url))).digest("hex")])));
const save = async () => writeFile(`${directory}/evidence.json`, JSON.stringify(proof, null, 2));
async function request(method, resource, body, auth = true) {
  assert.ok(resource.startsWith("/v2/") || resource === "/docs/openapi", "Reviewed API resources only");
  const target = new URL(origin + resource);
  assert.equal(target.origin, origin, "No cross-origin credential forwarding");
  const response = await fetch(target, { method, redirect: "error", signal: AbortSignal.timeout(90000),
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(redact(`HTTP ${response.status}: ${text}`, token).slice(0, 2500));
    error.status = response.status; throw error;
  }
  return resource === "/docs/openapi" ? text : JSON.parse(text || "{}");
}

try {
  const version = await request("GET", "/v2/version", undefined, false);
  const specification = await request("GET", "/docs/openapi", undefined, false);
  const schema = yaml.parse(specification);
  proof.cantonVersion = version.version;
  proof.openapiSha256 = createHash("sha256").update(specification).digest("hex");
  assert.ok(schema.components.schemas.GetActiveContractsRequest.properties.eventFormat,
    "The reviewed eventFormat API is required");
  if (!token) {
    proof.result = "authentication-required"; await save();
    console.log(`Shared DevNet ${proof.cantonVersion} is reachable. Authenticated ledger execution has NOT run.`);
    process.exitCode = 2;
  } else {
    const subject = tokenSubject(token);
    const profile = JSON.parse(await readFile(`${root}/profile.json`, "utf8"));
    assert.equal(subject, profile.ledgerUserId, "Token subject does not match the reviewed Console account");
    const participant = await request("GET", "/v2/parties/participant-id");
    assert.equal(participant.participantId, profile.participantId, "Different participant than the reviewed Console");
    proof.participantId = participant.participantId;
    const user = (await request("GET", `/v2/users/${encodeURIComponent(subject)}`)).user;
    assert.equal(user.id, subject); assert.notEqual(user.isDeactivated, true, "Ledger user is deactivated");
    const known = await request("GET", "/v2/packages");
    const packageIds = known.packageIds ?? [];
    proof.packageAvailability = Object.fromEntries(Object.entries(PACKAGES).map(([name,id]) => [name, packageIds.includes(id)]));
    assert.ok(Object.values(proof.packageAvailability).every(Boolean), "Upload/vet the reviewed DARs before execution");
    const rights = (await request("GET", `/v2/users/${encodeURIComponent(subject)}/rights`)).rights ?? [];
    proof.roles = preparedRoles(profile, rights);
    proof.roleBatch = profile.roleBatch;
    proof.roleProvisioning = "NODERS Console; existing parties and can-act-as verified before execution";
    let synchronizerId;
    for (const party of Object.values(proof.roles)) {
      const connected = await request("GET", `/v2/state/connected-synchronizers?party=${encodeURIComponent(party)}`);
      const active = connected.connectedSynchronizers?.filter(s => s.permission === "PARTICIPANT_PERMISSION_SUBMISSION");
      assert.equal(active?.length, 1, "One explicit submission synchronizer required for every proof role");
      synchronizerId ??= active[0].synchronizerId;
      assert.equal(active[0].synchronizerId, synchronizerId, "All proof roles must share the reviewed synchronizer");
    }
    proof.synchronizerId = synchronizerId;
    if (!execute) {
      proof.result = "authenticated-preflight-only"; await save();
      console.log("Participant and package preflight passed. No repo transaction submitted.");
    } else {
      const runId = randomUUID().slice(0, 8);
      directory = `${root}/${runId}`; await mkdir(directory, { recursive: true });
      proof.runId = runId; proof.result = "in-progress";
      proof.ledgerOffsetBefore = (await request("GET", "/v2/state/ledger-end")).offset;
      await save();
      const roles = proof.roles;
      const owned = new Set(Object.values(roles));
      const transport = {
        // Reuse the client serializer; CLI bearer authentication is recorded separately from a wallet flow.
        kind: "wallet",
        request: async (method, resource, body) => {
          if (resource === "/v2/state/active-contracts") {
            const parties = Object.keys(body.filter?.filtersByParty ?? {});
            assert.ok(parties.every(p => owned.has(p)), "Only this run's parties may be queried");
            return request(method, resource, { activeAtOffset: body.activeAtOffset, eventFormat: eventFormat(parties) });
          }
          return request(method, resource, body);
        },
      };
      const api = new LedgerApi(transport);
      // Existing contracts could be an earlier committed/ambiguous attempt.
      // Never restart this lifecycle on a dirty party batch.
      for (const [role, party] of Object.entries(roles)) {
        assert.equal((await api.activeContracts(party)).length, 0,
          `Proof party ${role} is not empty. Inspect prior evidence; do not replay automatically.`);
      }
      const book = async party => deskState(await api.activeContracts(party));
      const only = (items,label) => { assert.equal(items.length,1,label); return items[0]; };
      async function submit(label, party, commands, additionalReaders = []) {
        assert.ok(owned.has(party) && additionalReaders.every(p => owned.has(p)), "Only isolated proof actors may submit/read");
        const commandId = `symbolon-devnet-${runId}-${randomUUID()}`;
        const step = { label, actAs: party, commandId, status: "submitted", submittedAt: new Date().toISOString() };
        proof.steps.push(step); await save();
        try {
          const readAs = [...new Set([party,...additionalReaders])];
          const response = await request("POST", "/v2/commands/submit-and-wait-for-transaction", {
            commands: { commandId, commands: pinCommands(commands), actAs: [party], readAs, synchronizerId,
              packageIdSelectionPreference: Object.values(PACKAGES) },
            transactionFormat: { eventFormat: eventFormat(readAs), transactionShape: "TRANSACTION_SHAPE_LEDGER_EFFECTS" },
          });
          step.transaction = committedTransaction(response,commandId,synchronizerId);
          step.status = "committed"; await save(); return step.transaction;
        } catch (error) {
          step.status = "failed-or-unconfirmed"; step.error = redact(error.message, token); await save(); throw error;
        }
      }
      const actor = (party,label) => ({ party,label,read:()=>api.activeContracts(party),
        submit: commands=>submit(label,party,commands).then(tx=>tx.updateId), disconnect:async()=>{} });
      const borrower = actor(roles.borrower,"borrower action"), dealer = actor(roles.dealer,"dealer action");
      const tpl = entity => `${PACKAGES.core}:Symbolon.Repo:${entity}`;
      const proposalTpl = entity => `${PACKAGES.adapter}:Symbolon.BitSafe.PriceMarkProposal:${entity}`;
      const rulesTpl = `${PACKAGES.governance}:Governance.Rules:GovernanceRules`;
      const initializedRules = await submit("Create 2-of-3 rules", roles.governance, [create(rulesTpl, {
        governanceParty: roles.governance, members: { map: [roles.proposer,roles.confirmer,roles.executor].sort().map(p=>[p,{}]) },
        threshold:"2", actionConfirmationTimeout:{microseconds:"1800000000"}, additionalProposers:null,
      })]);
      const rulesEvent = initializedRules.events.map(e=>e.CreatedEvent).find(e=>e?.templateId===rulesTpl);
      assert.ok(rulesEvent?.contractId,"GovernanceRules creation event missing");
      const rulesCid = rulesEvent.contractId;
      async function govern(entity, fields, label, negative = false) {
        const created = await submit(`${label}: proposal`,roles.proposer,[create(proposalTpl(entity),{
          governanceParty:roles.governance,proposer:roles.proposer,...fields,
        })]);
        const proposal = created.events.map(e=>e.CreatedEvent).find(e=>e?.templateId===proposalTpl(entity));
        assert.ok(proposal?.contractId,"Proposal CID missing");
        const confirm = async member => {
          const tx = await submit(`${label}: confirmation`,member,[exercise(rulesTpl,rulesCid,"GovernanceRules_ConfirmAction",{
            confirmer:member,actionProposalCid:proposal.contractId,
          })],[roles.governance]);
          return exerciseResult(tx,"GovernanceRules_ConfirmAction").confirmationCid;
        };
        const first = await confirm(roles.proposer);
        const command = confirmations => exercise(rulesTpl,rulesCid,"GovernanceRules_ExecuteConfirmedAction",{
          executor:roles.executor,actionProposalCid:proposal.contractId,confirmations,
        });
        if (negative) {
          await assert.rejects(submit(`${label}: one confirmation must fail`,roles.executor,[command([first])],[roles.governance]),
            error=>/DAML_FAILURE/.test(error.message)&&/Enough confirmations to execute action/.test(error.message));
          const feed = only((await book(roles.borrower)).feeds,"Original feed survives rejection");
          assert.equal(Number(feed.payload.price),60000);
          proof.oneConfirmationRejected = true; await save();
        }
        const second = await confirm(roles.confirmer);
        assert.notEqual(first,second,"Distinct confirmations required");
        const tx = await submit(`${label}: execute with two confirmations`,roles.executor,[command([first,second])],[roles.governance]);
        return {proposalCid:proposal.contractId,confirmationCids:[first,second],transaction:tx};
      }
      proof.initialization = await govern("InitializePriceFeedProposal",{
        instrumentIssuer:roles.issuer,instrument:"cBTC-demo",cashIssuer:roles.issuer,cashInstrument:"USDCx-demo",
        initialPrice:dec(60000),readers:[roles.borrower,roles.dealer],
      },"Governed initialization");
      await submit("Issue isolated simulated holdings",roles.issuer, [
        [roles.borrower,"cBTC-demo",0.1],[roles.borrower,"USDCx-demo",2000],[roles.dealer,"USDCx-demo",100000],
      ].map(([owner,instrument,amount])=>create(`${PACKAGES.core}:Symbolon.DemoAsset:Holding`,{
        issuer:roles.issuer,owner,instrument,amount:dec(amount),viewers:[],lockParties:[],
      })));
      await requestQuotes(borrower,{dealers:[roles.dealer],oracle:roles.governance,
        collateralIssuer:roles.issuer,collateralInstrument:"cBTC-demo",collateralAmount:0.025,
        cashIssuer:roles.issuer,cashInstrument:"USDCx-demo",cashAmount:1000,termDays:30,
        marginThresholdPct:1.05,cureSeconds:600,maxPriceAgeSeconds:3600});
      await sendQuote(dealer,only((await book(roles.dealer)).requests,"Private RFQ"),0.052,3600);
      const quote = only((await book(roles.borrower)).quotes,"Funded quote");
      const feed = only((await book(roles.borrower)).feeds,"Initial feed");
      await acceptQuote(borrower,quote,feed.contractId);
      let position = only((await book(roles.borrower)).positions,"Settled position");
      assert.equal(decimalUnits(position.payload.repurchasePrice),decimalUnits("1004.3333333333"));
      async function snapshot(label) {
        const state = await book(roles.borrower);
        proof.snapshots.push({label,capturedAt:new Date().toISOString(),ledgerOffset:await api.ledgerEnd(),state,
          health:state.positions.map(p=>health(p.payload,state.feeds))}); await save();
      }
      await snapshot("Before governed mark");
      proof.markExecution = await govern("PriceMarkProposal",{feedCid:feed.contractId,newPrice:dec(36000)},"Governed price mark",true);
      const lowFeed = only((await book(roles.borrower)).feeds,"Governed replacement feed");
      assert.equal(Number(lowFeed.payload.price),36000);
      assert.equal(health(position.payload,[lowFeed]).healthy,false);
      await snapshot("After governed mark");
      await issueMarginCall(dealer,position.contractId,lowFeed.contractId);
      position = only((await book(roles.borrower)).positions,"UnderCall position");
      assert.equal(position.payload.status.tag,"UnderCall"); await snapshot("Margin call");
      await topUp(borrower,position,0.005,lowFeed.contractId);
      position = only((await book(roles.borrower)).positions,"Cured position");
      assert.equal(position.payload.status.tag,"Active"); assert.equal(health(position.payload,[lowFeed]).healthy,true);
      await snapshot("Margin restored");
      await repay(borrower,position);
      const closed = only((await book(roles.borrower)).closed,"Closing record");
      assert.equal(closed.payload.outcome,"Repurchased"); proof.closedRepo = closed;
      await snapshot("Repurchased");
      proof.ledgerOffsetAfter = await api.ledgerEnd(); proof.completedAt = new Date().toISOString(); proof.result = "passed";
      await save(); console.log(`Shared DevNet repurchase completed. Evidence: ${directory}/evidence.json`);
    }
  }
} catch (error) {
  proof.result = "incomplete"; proof.error = redact(error.message,token); await save();
  console.error(proof.error); console.error(`Partial evidence: ${directory}/evidence.json. Do not retry ambiguous submissions automatically.`);
  process.exitCode = 1;
} finally { token = ""; }
