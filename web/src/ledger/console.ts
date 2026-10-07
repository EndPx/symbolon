import { consoleWallet, type GetAccountResponse, type StatusEvent } from "@console-wallet/dapp-sdk";
import { parseResponse } from "./api";
import { CantonV2Client } from "./canton-v2";
import { deployment, normalizeNetwork, tradingBlocker } from "./deployment";
import type { Session } from "./session";
import { WalletSessionChanged } from "./grofty";

function checkAccount(account: GetAccountResponse, status: StatusEvent) {
  if (!status.connection?.isConnected || !account?.partyId?.includes("::") || account.status !== "allocated") {
    throw new WalletSessionChanged("Allocate and connect your Console Wallet party before continuing.");
  }
  const network = normalizeNetwork(status.network?.networkId ?? account.networkId);
  if (network !== deployment().network) throw new WalletSessionChanged(`Switch Console Wallet to ${deployment().network}, then reconnect.`);
  return {party:account.partyId,network};
}

export async function openConsoleSession(interactive: boolean): Promise<Session | null> {
  // SDK "local" selects the browser extension, independently of Canton network.
  if (interactive) await consoleWallet.connect({name:"Symbolon",icon:`${window.location.origin}/brand/logo-mark.png`,target:"local"});
  const status = await consoleWallet.status();
  if (!status.connection?.isConnected) return null;
  const account = await consoleWallet.getPrimaryAccount();
  const identity = checkAccount(account,status);
  const d = deployment();
  if (!d.corePackageId || !d.synchronizerId) throw new Error("The Symbolon participant and package are not configured.");
  let disposed = false;
  let invalid: string | null = null;
  const listeners = new Set<(reason:string)=>void>();
  const invalidate = (reason:string) => {
    if (disposed || invalid) return;
    invalid=reason; listeners.forEach(fn=>fn(reason));
  };
  const bound = async () => {
    if (disposed || invalid) throw new WalletSessionChanged(invalid ?? "This wallet session closed.");
    const nextStatus=await consoleWallet.status();
    const nextAccount=await consoleWallet.getPrimaryAccount();
    const next=checkAccount(nextAccount,nextStatus);
    if(next.party!==identity.party||next.network!==identity.network){invalidate("The Console Wallet account or network changed. Reconnect.");throw new WalletSessionChanged(invalid!);}
    return {status:nextStatus,account:nextAccount!};
  };
  const client=new CantonV2Client({party:identity.party,corePackageId:d.corePackageId,
    ...(d.publicPackageId?{publicPackageId:d.publicPackageId}:{}),synchronizerId:d.synchronizerId,
    store:sessionStorage,
    request:async(method,resource,body)=>{
      const current=await bound();
      const result=await consoleWallet.ledgerApi({requestMethod:method,resource,
        ...(body===undefined?{}:{body:JSON.stringify(body)}),network:current.account.networkId,
        accessToken:current.status.session?.accessToken??current.status.network?.accessToken??""});
      return parseResponse(typeof result === "string" ? result : result.response);
    }});
  await client.preflight();
  return {kind:"wallet",party:identity.party,label:"Console Wallet",wallet:"Console Wallet",networkId:identity.network,ledgerRead:true,
    read:()=>client.read(),
    async submit(commands,options){
      await bound();
      const reason=tradingBlocker(identity.network);
      if(reason)throw new Error(reason);
      return client.submit(commands,options,payload=>consoleWallet.prepareExecuteAndWait(payload));
    },
    pendingCommand:()=>client.pendingCommand(),reconcilePending:()=>client.reconcile(),lastReceipt:()=>client.lastReceipt,
    onInvalidated(listener){listeners.add(listener);return()=>{listeners.delete(listener);};},
    dispose(){disposed=true;listeners.clear();},
    async disconnect(){disposed=true;listeners.clear();await consoleWallet.disconnect();},
  };
}
