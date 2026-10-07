// Export public test identities, and privately stage the upstream sandbox script.
// No token, private key or live credential belongs in the frontend manifest.
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
const evidence=JSON.parse(await readFile(".omc/evidence/bitsafe-localnet.json","utf8"));
assert.equal(evidence.result,"passed");
assert.equal(evidence.sourceCommit,"21ffdedf64366b1f2824301c434b427bf4726663");
const home=resolve(process.env.BITSAFE_LOCALNET_HOME??".omc/bitsafe-localnet");
assert.equal(execFileSync("git",["rev-parse","HEAD"],{cwd:home,encoding:"utf8"}).trim(),evidence.sourceCommit);
const script=execFileSync("git",["show",`${evidence.sourceCommit}:hackathon/localnet.sh`],{cwd:home,encoding:"utf8"});
assert.equal(new Set(evidence.participantIds).size,3);
const corePackageId=evidence.closedRepo.templateId.split(":")[0];
assert.match(corePackageId,/^[a-f0-9]{64}$/);
const issuer=evidence.roles.issuer;
const asset=symbol=>({symbol,admin:issuer,adapter:"demo-holding",packageIds:[corePackageId]});
const data={deployment:{schemaVersion:1,network:"localnet",walletNetwork:"localnet",participant:null,
    synchronizerId:evidence.closedRepo.synchronizerId,corePackageId,tradingEnabled:false,
    releaseEvidence:"https://github.com/EndPx/symbolon/blob/main/docs/submission/evidence/bitsafe-localnet.json",
    assets:{collateral:asset("cBTC-demo"),cash:asset("USDCx-demo")}},
  parties:[evidence.roles.borrower,evidence.roles.dealer,evidence.roles.issuer,evidence.roles.outsider]};
assert.ok(data.parties.every(p=>typeof p==="string"&&p.includes("::")));
await mkdir(".omc/decman-localnet",{recursive:true});
await writeFile(".omc/decman-localnet/app.json",JSON.stringify(data,null,2)+"\n");
await writeFile(".omc/decman-localnet/localnet.sh",script,{mode:0o600});
console.log("LocalNet frontend identities exported; official sandbox token source staged for the loopback server only.");
