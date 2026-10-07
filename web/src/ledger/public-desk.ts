import { create, dec, exercise, type Contract, type DisclosedContract } from "./api";
import { deployment, type Deployment } from "./deployment";
import type { Session } from "./session";
import { deskState } from "./symbolon";

export const publicDeskTemplate = () => {
  const id = deployment().publicPackageId;
  if (!id) throw new Error("The public access package is not configured.");
  return `${id}:Symbolon.PublicDesk:PublicDesk`;
};
export function publicDisclosure(): DisclosedContract[] {
  const d = deployment();
  if (!d.publicDesk || !d.synchronizerId) throw new Error("The public desk has not been published.");
  return [{ templateId: publicDeskTemplate(), contractId: d.publicDesk.contractId,
    createdEventBlob: d.publicDesk.createdEventBlob, synchronizerId: d.synchronizerId }];
}
export async function claimDevnetAssets(session: Session) {
  const d = deployment();
  if (d.network !== "devnet" || !d.publicDesk || session.party === d.publicDesk.operator) throw new Error("Connect a borrower account different from the public dealer.");
  return session.submit([exercise(publicDeskTemplate(),d.publicDesk.contractId,"ClaimDevnetAssets",{claimant:session.party})], {disclosedContracts:publicDisclosure()});
}
export async function requestPublicQuote(session: Session, requestCid: string) {
  const d = deployment();
  if (!d.publicDesk) throw new Error("The public dealer is unavailable.");
  return session.submit([exercise(publicDeskTemplate(),d.publicDesk.contractId,"RequestFundedQuote",{borrower:session.party,requestCid})], {disclosedContracts:publicDisclosure()});
}
export async function refreshReferenceMark(session: Session, feedCid: string) {
  const d = deployment();
  if (!d.publicDesk) throw new Error("The public dealer is unavailable.");
  return session.submit([exercise(publicDeskTemplate(),d.publicDesk.contractId,"RefreshReferenceMark",{requester:session.party,feedCid})], {disclosedContracts:publicDisclosure()});
}
export async function createPublicDesk(session: Session) {
  return session.submit([create(publicDeskTemplate(),{operator:session.party,label:"Symbolon DevNet dealer",rate:dec(0.052),
    referencePrice:dec(60000),quoteValiditySeconds:"3600",maxPrincipal:dec(10000),readers:[]})]);
}
export function publicDeploymentFromContract(contract: Contract, source = deployment()): Deployment {
  const p = contract.payload;
  if (contract.templateId !== `${source.publicPackageId}:Symbolon.PublicDesk:PublicDesk` || !contract.createdEventBlob
    || contract.synchronizerId !== source.synchronizerId || typeof p.operator !== "string") throw new Error("A verified public contract disclosure is required.");
  return {...source,tradingEnabled:true,releaseEvidence:`https://github.com/EndPx/symbolon/blob/main/docs/submission/evidence/public-devnet.md`,
    assets:{collateral:{symbol:"cBTC-demo",admin:p.operator,adapter:"demo-holding",packageIds:[source.corePackageId!]},
      cash:{symbol:"USDCx-demo",admin:p.operator,adapter:"demo-holding",packageIds:[source.corePackageId!]}},
    publicDesk:{contractId:contract.contractId,createdEventBlob:contract.createdEventBlob,operator:p.operator,label:String(p.label),
      referencePrice:String(p.referencePrice),rate:String(p.rate),maxPrincipal:String(p.maxPrincipal)}};
}
export async function completePublicRequests(session: Session) {
  const d = deployment();
  if (!d.publicDesk) return;
  const state = deskState(await session.read());
  const matching = state.requests.filter(r => r.payload.borrower === session.party && r.payload.dealer === d.publicDesk!.operator
    && r.payload.collateralIssuer === d.publicDesk!.operator && r.payload.cashIssuer === d.publicDesk!.operator
    && r.payload.collateralInstrument === "cBTC-demo" && r.payload.cashInstrument === "USDCx-demo"
    && r.payload.oracle === d.publicDesk!.operator);
  for (const request of matching) await requestPublicQuote(session,request.contractId);
}
