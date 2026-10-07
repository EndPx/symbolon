import { useState } from "react";
import { deployment } from "../ledger/deployment";
import type { Session } from "../ledger/session";
import { claimDevnetAssets, createPublicDesk, publicDeploymentFromContract, refreshReferenceMark } from "../ledger/public-desk";
import { balanceOf, fmtAmount, partyLabel, type DeskState } from "../ledger/symbolon";
import { uploadPublicAccessPackage } from "../ledger/account";

export function PublicAccess({session,state,busy,run}: {
  session:Session;state:DeskState|null;busy:boolean;run(label:string,action:()=>Promise<string>):Promise<boolean>;
}) {
  const d=deployment();
  if(!d.publicDesk||session.kind==="browse"||session.party===d.publicDesk.operator)return null;
  const collateral=balanceOf(state?.holdings??[],session.party,"cBTC-demo",d.publicDesk.operator);
  const cash=balanceOf(state?.holdings??[],session.party,"USDCx-demo",d.publicDesk.operator);
  const feed=(state?.feeds??[]).filter(f=>f.payload.oracle===d.publicDesk!.operator
    && f.payload.instrument==="cBTC-demo"&&f.payload.cashInstrument==="USDCx-demo")
    .sort((a,b)=>Date.parse(b.payload.asOf)-Date.parse(a.payload.asOf))[0];
  return <section className="panel public-access" aria-labelledby="public-access-title">
    <h2 id="public-access-title">Your DevNet balance</h2>
    <p className="panel-lede">Get ledger-issued test assets, then request a funded quote from {d.publicDesk.label}. These assets have no monetary value.</p>
    <div className="public-access-balances"><div><span>Available collateral</span><strong>{fmtAmount(collateral,4)} cBTC-demo</strong></div>
      <div><span>Available cash</span><strong>{fmtAmount(cash)} USDCx-demo</strong></div></div>
    <div className="acts wrap"><button className="seal sm" disabled={busy} onClick={()=>void run("DevNet assets issued",()=>claimDevnetAssets(session))}>Get DevNet assets</button>
      {feed&&<button className="ghost sm" disabled={busy} onClick={()=>void run("Reference mark refreshed",()=>refreshReferenceMark(session,feed.contractId))}>Refresh reference mark</button>}
      {feed&&<a className="quiet" href="#request-repo">Request financing</a>}</div>
    <p className="sm muted">The reference mark is simulated. Your private quote sets the fixed rate and repayment amount.</p>
  </section>;
}

export function PublicMarket({onConnect}:{onConnect():void}) {
  const d=deployment();
  if(!d.publicDesk)return null;
  return <section className="market-overview" id="markets" aria-labelledby="public-market-title">
    <div className="market-heading"><div><p className="market-eyebrow">Symbolon private desk</p><h1 id="public-market-title">Fixed-rate financing</h1>
      <p>Know your repayment amount before settlement. Connect to request your own private quote.</p></div><span className="market-private-label">Canton DevNet</span></div>
    <div className="market-layout"><div className="market-list"><div className="market-list-head"><span>Collateral / cash</span><span>Environment</span><span>Dealer</span><span>Your quote</span></div>
      <div className="market-row"><span className="market-pair"><strong>cBTC-demo / USDCx-demo</strong><small>Ledger-issued test assets</small></span>
        <span className="market-state">DevNet</span><span>{d.publicDesk.label}</span><span className="market-number">Connect to view</span></div>
    </div><aside className="market-detail" aria-label="Public financing pair"><p className="market-eyebrow">PAIR DETAIL</p><h2>cBTC-demo / USDCx-demo</h2>
      <p className="market-detail-copy">Request a dealer-funded quote and review the rate, term and exact repurchase amount before accepting.</p>
      <dl className="market-facts"><div><dt>Quote principal limit</dt><dd>{fmtAmount(d.publicDesk.maxPrincipal)} USDCx-demo</dd></div>
        <div><dt>Current mark</dt><dd>Connect for your authorized feed</dd></div><div><dt>Settlement</dt><dd>Cash against collateral</dd></div></dl>
      <button className="seal market-action" onClick={onConnect}>Connect</button>
      <p className="market-disclosure">Public pair information does not expose private balances, requests or positions.</p>
    </aside></div>
  </section>;
}

export function PublicDeskSetup({session,onRefresh}:{session:Session;onRefresh():Promise<void>}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[profile,setProfile]=useState("");
  const d=deployment();
  if(session.kind!=="account"||d.publicDesk||!d.publicPackageId)return null;
  const publish=async()=>{
    if(busy)return;setBusy(true);setError(null);
    try {
      await createPublicDesk(session);
      const contracts=await session.read();
      const candidate=contracts.filter(c=>c.templateId===`${d.publicPackageId}:Symbolon.PublicDesk:PublicDesk`&&c.payload.operator===session.party).at(-1);
      if(!candidate)throw new Error("The public desk creation was not found in this party's ledger view.");
      setProfile(JSON.stringify(publicDeploymentFromContract(candidate),null,2));await onRefresh();
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  };
  return <section className="panel"><details className="party-detail"><summary>Operator setup</summary>
    <p>Create a DevNet dealer contract as {partyLabel(session.party)}. The access package must already be installed on this participant.</p>
    <div className="acts wrap"><button className="ghost sm" disabled={busy} onClick={()=>{
      if(!d.synchronizerId)return;setBusy(true);setError(null);
      void uploadPublicAccessPackage(d.synchronizerId).then(()=>onRefresh()).catch(e=>setError(e.message)).finally(()=>setBusy(false));
    }}>Install tested access package</button><button className="seal sm" disabled={busy} onClick={()=>void publish()}>{busy?"Working on participant…":"Create public DevNet desk"}</button></div>
    {error&&<p className="err" role="alert">{error}</p>}
    {profile&&<label className="desk-field"><span>Public deployment profile</span><textarea rows={8} readOnly value={profile} aria-label="Public deployment profile"/><small>This contains public contract data, not account credentials.</small></label>}
  </details></section>;
}
