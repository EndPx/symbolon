import test from "node:test";
import assert from "node:assert/strict";
import type { SpliceProvider } from "@sigilry/dapp/provider";
import { openSendTestnet } from "../src/ledger/send-testnet.ts";
import { symbolonCorePackage } from "../src/ledger/participant-probe.ts";

function fake() {
  const calls: Array<{method: string;params?: unknown}> = [];
  let party = "alice::test", network = "canton:testnet", connected = true, endpoint: string | undefined;
  let afterRead = () => {};
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const provider: SpliceProvider = {
    request: (async (args: {method: string;params?: unknown}) => {
      calls.push(args);
      switch (args.method) {
        case "status": return {provider:{id:"send-extension",providerType:"browser"},connection:{isConnected:connected,isNetworkConnected:true}};
        case "getActiveNetwork": return {networkId:network,...(endpoint ? {ledgerApi:endpoint,accessToken:"synthetic-test-token"}: {})};
        case "getPrimaryAccount": return {primary:true,partyId:party,status:"allocated",networkId:network};
        case "listAccounts": return [{primary:true,partyId:party,status:"allocated",networkId:network}];
        case "connect": connected = true; return {isConnected:true,isNetworkConnected:true};
        case "disconnect": connected = false; return null;
        case "ledgerApi": {
          const input = args.params as {resource: string};
          if (input.resource === "/v2/state/ledger-end") return {offset:42};
          if (input.resource === "/v2/version") return {version:"3.5.8"};
          if (input.resource === "/v2/packages") return {packageIds:[symbolonCorePackage]};
          if (input.resource.startsWith("/v2/state/connected-synchronizers")) return {connectedSynchronizers:[{permission:"PARTICIPANT_PERMISSION_SUBMISSION"}]};
          afterRead();
          return [];
        }
        default: throw new Error("Unexpected signing or mutation request");
      }
    }) as SpliceProvider["request"],
    on(event, handler) { const set = listeners.get(event) ?? new Set();set.add(handler);listeners.set(event,set);return provider; },
    removeListener(event, handler) { listeners.get(event)?.delete(handler);return provider; },
    emit(event, ...args) { listeners.get(event)?.forEach(handler => handler(...args));return true; },
  };
  return {provider,calls,changeParty:()=>{party="bob::test";},mainnet:()=>{network="canton:mainnet";},gateway:(value:string)=>{endpoint=value;},lock:()=>{connected=false;},onRead:(handler:()=>void)=>{afterRead=handler;}};
}
test("Send native TestNet resumes existing permission without another connect and reads raw JSON", async () => {
  const f = fake();
  const s = await openSendTestnet(f.provider,true,()=>{});
  assert.ok(s);
  assert.equal(f.calls.some(call=>call.method==="connect"),false);
  assert.deepEqual(await s.read(),[]);
  const input = f.calls.find(call=>call.method==="ledgerApi" && (call.params as any).resource.endsWith("active-contracts"))!.params as any;
  assert.deepEqual(Object.keys(input.body.eventFormat.filtersByParty),["alice::test"]);
  await assert.rejects(s.submit([]),/read-only/);
  assert.equal(f.calls.some(call=>call.method.includes("prepareExecute")),false);
  s.dispose?.();
});
test("Send TestNet rejects MainNet and discards another party's late read", async () => {
  const wrong = fake();wrong.mainnet();
  await assert.rejects(openSendTestnet(wrong.provider,true,()=>{}),/changed party, network/);
  const f = fake();let forgotten=false;
  const s = await openSendTestnet(f.provider,true,()=>{forgotten=true;});assert.ok(s);
  f.onRead(f.changeParty);
  await assert.rejects(s.read(),/changed party, network/);
  assert.equal(forgotten,true);s.dispose?.();
});
test("Send package check uses live read endpoints and never equates installation with vetting", async () => {
  const f = fake();const s = await openSendTestnet(f.provider,true,()=>{});assert.ok(s);
  const result = await s.inspectParticipant!();
  assert.equal(result.checks.find(check=>check.label==="Symbolon core package")?.status,"passed");
  assert.match(result.checks.find(check=>check.label==="Symbolon core package")!.detail,/does not confirm vetting/);
  assert.equal(f.calls.filter(call=>call.method==="ledgerApi").every(call=>(call.params as any).requestMethod==="get"),true);
  s.dispose?.();
});
test("DAR installation attempt refuses absent or foreign upload authority before any HTTP request", async () => {
  const originalFetch = globalThis.fetch;let requests=0;
  globalThis.fetch = async () => { requests++; throw new Error("No network request should be sent"); };
  try {
    const f=fake(),s=await openSendTestnet(f.provider,true,()=>{});assert.ok(s);
    const missing=await s.tryInstallApplication!();
    assert.match(missing.checks[0].detail,/did not provide an authenticated binary/);
    f.gateway("https://foreign.example/api");
    const foreign=await s.tryInstallApplication!();
    assert.match(foreign.checks[0].detail,/not the approved Send TestNet gateway/);
    assert.equal(requests,0);s.dispose?.();
  } finally { globalThis.fetch=originalFetch; }
});
test("already installed application code is not uploaded a second time", async () => {
  const f=fake();f.gateway("https://api-testnet.cantonwallet.com");
  const s=await openSendTestnet(f.provider,true,()=>{});assert.ok(s);
  const report=await s.tryInstallApplication!();
  assert.match(report.checks[0].detail,/already installed/);s.dispose?.();
});
