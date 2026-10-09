/** Publish a simulated mark through the installed 2-of-3 LocalNet committee.
 * All three member roles are controlled by the demo operator on one host.
 * This helper has no remote-network mode and never accepts live credentials.
 */
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { LedgerApi, create, dec } from "../web/src/ledger/api.ts";
import { deskState, decimalUnits } from "../web/src/ledger/symbolon.ts";
import { checkedReceipt, partyEventFormat } from "../web/src/ledger/canton-v2.ts";

const args = process.argv.slice(2);
assert.ok(args.includes("--local-only"), "Pass --local-only: this operates only the disposable/local test committee.");
const priceText = args[args.indexOf("--price") + 1];
assert.ok(args.includes("--price") && /^\d+(\.\d{1,10})?$/.test(priceText ?? "") && decimalUnits(priceText) > 0n
  && priceText.split(".")[0].replace(/^0+/,"").length <= 28,
  "Provide a positive simulated --price with at most 10 decimal places.");
const home = resolve(process.env.BITSAFE_LOCALNET_HOME ?? ".omc/bitsafe-localnet");
assert.equal(execFileSync("git", ["rev-parse", "HEAD"], {cwd:home,encoding:"utf8"}).trim(),
  "21ffdedf64366b1f2824301c434b427bf4726663", "The tested BitSafe source pin is required.");
const source = await readFile(resolve(home,"hackathon/localnet.sh"),"utf8");
const token = source.match(/^LOCALNET_CANTON_TOKEN=["']?([A-Za-z0-9_.-]+)/m)?.[1];
assert.ok(token,"The official unsafe LocalNet-only token is required.");
const state = Object.fromEntries((await readFile(resolve(home,"hackathon/.state"),"utf8")).split(/\r?\n/)
  .filter(line=>/^[A-Z_0-9]+=/.test(line)).map(line=>{const i=line.indexOf("=");return [line.slice(0,i),line.slice(i+1).replace(/^["']|["']$/g,"")];}));
const previous = JSON.parse(await readFile(".omc/evidence/bitsafe-localnet.json","utf8"));
assert.equal(previous.result,"passed");
assert.equal(previous.decentralizedParty,state.DEC_PARTY_ID,"Use evidence from this running LocalNet, not another environment.");
const party=state.DEC_PARTY_ID, members=[state.MEMBER_1,state.MEMBER_2,state.MEMBER_3];
assert.ok(party && members.every(Boolean) && new Set(members).size===3);
async function request(port,path,method="GET",body,ledger=false,allowError=false) {
  assert.ok([3975,8081,8082,8083].includes(port));
  const response=await fetch(`http://127.0.0.1:${port}${path}`,{method,signal:AbortSignal.timeout(90000),
    headers:{...(body?{"Content-Type":"application/json"}:{}),...(ledger?{Authorization:`Bearer ${token}`}:{})},
    body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text();
  let data;try {data=JSON.parse(text||"{}");} catch {data={error:text.replaceAll(token,"[redacted]").slice(0,1000)};}
  if(!response.ok&&!allowError) throw new Error(`LocalNet HTTP ${response.status}: ${text.replaceAll(token,"[redacted]").slice(0,1000)}`);
  return allowError?{status:response.status,data}:data;
}
async function poll(read,accept) {
  const start=Date.now();
  while(Date.now()-start<90000) {
    const value=await read();if(accept(value))return value;
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  throw new Error("Timed out observing the original proposal. Inspect it before attempting any new submission.");
}
const api=new LedgerApi({kind:"sandbox",request:(method,path,body)=>request(3975,path,method,body,true)},"ledger-api-user");
const nodes=await Promise.all([8081,8082,8083].map(p=>request(p,"/node-config")));
assert.deepEqual(nodes.map(n=>n.node.participant_id),previous.participantIds,"Participant topology must match the retained run.");
const feeds=deskState(await api.activeContracts(previous.roles.borrower)).feeds.filter(f=>f.payload.oracle===party);
assert.equal(feeds.length,1,"Exactly one agreed committee feed must exist for this borrower.");
const feed=feeds[0];
const governance=await Promise.all([8081,8082,8083].map(port=>request(port,`/governance/state?party_id=${encodeURIComponent(party)}`)));
for(const {state:rule} of governance) {
  assert.equal(rule.governance_party,party);assert.equal(rule.threshold,2);
  assert.deepEqual([...rule.members].sort(),[...members].sort(),"Live rules must still represent the original 2-of-3 committee.");
  assert.equal(rule.out_of_date,false);
}
assert.ok(governance.every(g=>g.state.contract_id===governance[0].state.contract_id));
const configs=await Promise.all([8081,8082,8083].map(port=>request(port,`/party-config/${encodeURIComponent(party)}`)));
configs.forEach((config,index)=>{assert.equal(config.dec_party_id,party);assert.equal(config.member_party_id,members[index]);assert.equal(config.user_id,"ledger-api-user");});
const rules=governance[0].state.contract_id;
const active=await api.activeContracts(party);
assert.ok(!active.some(c=>c.templateId.endsWith(":PriceMarkProposal")&&c.payload.feedCid===feed.contractId),
  "An active proposal already targets this feed. Inspect or finish it before creating another.");
const commandId=`symbolon-localnet-mark-${randomUUID()}`;
const output={checkedAt:new Date().toISOString(),environment:"private three-participant LocalNet on one operator host",party,
  commandId,before:feed,requestedPrice:priceText,governance:governance.map(g=>g.state),status:"prepared"};
await mkdir(".omc/evidence",{recursive:true});
const outputPath=`.omc/evidence/mark-${commandId}.json`;
const pendingPath=".omc/evidence/localnet-mark-pending.json";
// Exclusive creation blocks a second command after a lost/ambiguous response.
try { await writeFile(pendingPath,JSON.stringify(output,null,2)+"\n",{flag:"wx"}); }
catch(error) { if(error.code==="EEXIST") throw new Error("A mark command is unresolved. Inspect localnet-mark-pending.json and its original ledger/proposal before another submission."); throw error; }
await writeFile(outputPath,JSON.stringify(output,null,2)+"\n");
const proposed=checkedReceipt(await request(3975,"/v2/commands/submit-and-wait-for-transaction","POST",{
  commands:{commands:[create("#symbolon-bitsafe:Symbolon.BitSafe.PriceMarkProposal:PriceMarkProposal",{
    governanceParty:party,proposer:members[0],feedCid:feed.contractId,newPrice:dec(priceText)})],
    commandId,userId:"ledger-api-user",actAs:[members[0]],readAs:[members[0]],synchronizerId:previous.closedRepo.synchronizerId},
  transactionFormat:{eventFormat:partyEventFormat(members[0]),transactionShape:"TRANSACTION_SHAPE_LEDGER_EFFECTS"},
},true),commandId,previous.closedRepo.synchronizerId);
const created=proposed.events.map(event=>event.CreatedEvent).filter(event=>event?.templateId?.endsWith(":PriceMarkProposal"));
assert.equal(created.length,1,"The original command must create exactly one price proposal.");
const createdProposal=created[0];
assert.ok(createdProposal.contractId && createdProposal.createArgument.governanceParty===party
  &&createdProposal.createArgument.proposer===members[0]&&createdProposal.createArgument.feedCid===feed.contractId
  &&decimalUnits(createdProposal.createArgument.newPrice)===decimalUnits(priceText),"Proposal receipt differs from the prepared command.");
const cid=createdProposal.contractId;
output.proposalCid=cid;output.proposalUpdateId=proposed.updateId;output.status="proposed";
await writeFile(pendingPath,JSON.stringify(output,null,2)+"\n");
await writeFile(outputPath,JSON.stringify(output,null,2)+"\n");
const common={party_id:party,rules_contract_id:rules,action:{type:"governance_set_threshold",new_threshold:0},
  governance_type:"core_domain",proposal_cid:cid}; // action is ignored for the supplied custom proposal CID.
const confirmations=async port=>(await request(port,`/governance/confirmations?party_id=${encodeURIComponent(party)}`))
  .domain_actions?.find(p=>p.proposal_cid===cid);
await poll(()=>confirmations(8081),Boolean);
await request(8081,"/governance/confirm","POST",common);
const first=await poll(()=>confirmations(8083),p=>p?.confirmations?.length===1);
assert.equal(first.can_execute,false);
const rejected=await request(8083,"/governance/execute","POST",{...common,confirmation_cids:first.confirmations.map(c=>c.contract_id),disclosed_contracts:[]},false,true);
output.oneConfirmationFailure=rejected;
await writeFile(outputPath,JSON.stringify(output,null,2)+"\n");
assert.ok(rejected.status>=400&&/enough confirmations|threshold|insufficient/i.test(JSON.stringify(rejected.data)),
  "One-confirmation execution must fail for the actual threshold requirement.");
assert.equal((await api.activeContracts(previous.roles.borrower)).filter(c=>c.contractId===feed.contractId).length,1);
await request(8082,"/governance/confirm","POST",common);
const ready=await poll(()=>confirmations(8083),p=>p?.can_execute&&p.confirmations?.length>=2);
output.execution=await request(8083,"/governance/execute","POST",{...common,confirmation_cids:ready.confirmations.map(c=>c.contract_id),disclosed_contracts:[]});
output.status="execution-acknowledged";
await writeFile(outputPath,JSON.stringify(output,null,2)+"\n");
await writeFile(pendingPath,JSON.stringify(output,null,2)+"\n");
const audits=await Promise.all([8081,8082,8083].map(port=>poll(()=>request(port,
  `/governance/chain-audit?party_id=${encodeURIComponent(party)}&limit=50&refresh=true`),
  data=>data.entries?.some(e=>e.event_type==="execute"&&e.contract_id===cid&&e.choice==="GovernableAction_Execute"&&e.update_id))));
const executionIds=audits.map(a=>new Set(a.entries.filter(e=>e.event_type==="execute"&&e.contract_id===cid&&e.choice==="GovernableAction_Execute").map(e=>e.update_id)));
assert.ok(executionIds.every(ids=>ids.size===1));
const executionUpdateId=[...executionIds[0]][0];
assert.ok(executionIds.every(ids=>ids.has(executionUpdateId)),"All participant audits must agree on this proposal's execution update.");
const executed=await request(3975,"/v2/updates/transaction-by-id","POST",{updateId:executionUpdateId,
  transactionFormat:{eventFormat:partyEventFormat(party),transactionShape:"TRANSACTION_SHAPE_LEDGER_EFFECTS"}},true);
assert.equal(executed.transaction.updateId,executionUpdateId);
assert.equal(executed.transaction.synchronizerId,previous.closedRepo.synchronizerId);
const identity=["oracle","instrumentIssuer","instrument","cashIssuer","cashInstrument"];
const matching=p=>identity.every(key=>p[key]===feed.payload[key])&&decimalUnits(p.price)===decimalUnits(priceText);
const replacements=executed.transaction.events.map(e=>e.CreatedEvent).filter(e=>e?.templateId===feed.templateId&&matching(e.createArgument));
assert.equal(replacements.length,1,"Execution must create exactly one replacement for the full agreed feed identity.");
assert.ok(executed.transaction.events.some(e=>e.ArchivedEvent?.contractId===feed.contractId
  ||e.ExercisedEvent?.contractId===feed.contractId&&e.ExercisedEvent.choice==="SetPrice"&&e.ExercisedEvent.consuming===true),
  "The original mark must be consumed by this execution.");
const replacement=replacements[0];
const after=await poll(()=>api.activeContracts(previous.roles.borrower),rows=>!rows.some(c=>c.contractId===feed.contractId)
  &&rows.some(c=>c.contractId===replacement.contractId));
const matched=deskState(after).feeds.filter(c=>matching(c.payload));
assert.equal(matched.length,1);assert.equal(matched[0].contractId,replacement.contractId);
output.after=matched[0];output.executionUpdateId=executionUpdateId;output.audits=audits;
output.result="passed";
output.status="committed";
await writeFile(outputPath,JSON.stringify(output,null,2)+"\n");
await unlink(pendingPath);
console.log(`Committee mark committed at ${output.after.payload.price}; one confirmation rejected, two succeeded. Evidence: ${outputPath}`);
