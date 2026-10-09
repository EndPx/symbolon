import { create, exercise, dec, int, type Contract, type Command, type SubmissionOptions } from "../ledger/api";
import type { Session } from "../ledger/session";
import { deployment } from "../ledger/deployment";
import { SubmissionUncertain, type CommittedReceipt } from "../ledger/canton-v2";
import { checkedDiscoveryTerms, sameDiscoveryTerms, numeric10, type DiscoveryTerms } from "../ledger/discovery-model";
import type { LenderMarket } from "../ledger/lender-directory-model";
import type { OpenRfqPublishProof, OpenRfqQuoteProof, OpenRfqRequest, OwnedOpenRequest } from "../ledger/open-rfq-model";
import { TPL, type RepoQuote } from "../ledger/symbolon";
import { exactHolding } from "./actions";
import { retainOpenRfqIntent, type OpenRfqIntentDraft } from "./open-rfq-intents";

export class OpenRfqProofError extends Error {
  constructor(readonly kind: "publish" | "quote", readonly updateId: string, message: string, readonly contractId?: string, readonly quoteContractId?: string) {
    super(message); this.name="OpenRfqProofError";
  }
}

function openTemplate(session: Session): string {
  const config = deployment();
  if (session.kind !== "account" || config.network !== "devnet" || !config.openRfqPackageId || !config.synchronizerId) throw new Error("Connect your authorized HackCanton account on the configured Open RFQ release.");
  if (session.pendingCommand?.()) throw new Error("Check the original pending command before submitting again.");
  return `${config.openRfqPackageId}:Symbolon.OpenRequest:OpenRequest`;
}
function confirmed(session: Session, updateId: string): CommittedReceipt {
  const receipt = session.lastReceipt?.();
  if (!receipt || receipt.updateId !== updateId || receipt.synchronizerId !== deployment().synchronizerId) throw new Error("The ledger action may have committed. Recover its original receipt before trying again.");
  return receipt;
}
const created = (receipt: CommittedReceipt, templateId: string) => receipt.events.flatMap(value => {
  const event = (value as {CreatedEvent?: {contractId?: string; templateId?: string; createArgument?: Record<string,unknown>}})?.CreatedEvent;
  return event?.contractId && event.templateId === templateId && event.createArgument ? [event as {contractId:string;templateId:string;createArgument:Record<string,unknown>}] : [];
});
const termObject = (payload: Record<string, unknown>, terms: DiscoveryTerms) => {
  const value = Object.fromEntries(Object.keys(terms).map(field => [field, payload[field]]));
  for (const field of ["termDays", "cureSeconds", "maxPriceAgeSeconds"]) if (typeof value[field] === "string") value[field] = Number(value[field]);
  return value;
};
function validateRequest(session: Session, request: OpenRfqRequest) {
  const template = openTemplate(session);
  if (request.disclosure.templateId !== template || request.disclosure.synchronizerId !== deployment().synchronizerId) throw new Error("This request belongs to another package or synchronizer.");
  return template;
}
function checkedTerms(terms: DiscoveryTerms): DiscoveryTerms {
  const d=deployment();
  if (!d.synchronizerId || !d.corePackageId || !d.publicDesk || terms.oracle !== d.publicDesk.operator || terms.collateralIssuer !== d.assets.collateral.admin || terms.cashIssuer !== d.assets.cash.admin || terms.collateralInstrument !== d.assets.collateral.symbol || terms.cashInstrument !== d.assets.cash.symbol) throw new Error("Select the configured Open RFQ market.");
  const market: LenderMarket={network:"devnet",synchronizerId:d.synchronizerId,corePackageId:d.corePackageId,oracle:terms.oracle,collateralIssuer:terms.collateralIssuer,collateralInstrument:terms.collateralInstrument,cashIssuer:terms.cashIssuer,cashInstrument:terms.cashInstrument};
  return checkedDiscoveryTerms(terms,market);
}
function marketForTerms(terms:DiscoveryTerms):LenderMarket {
  const d=deployment();return {network:"devnet",synchronizerId:d.synchronizerId!,corePackageId:d.corePackageId!,oracle:terms.oracle,collateralIssuer:terms.collateralIssuer,collateralInstrument:terms.collateralInstrument,cashIssuer:terms.cashIssuer,cashInstrument:terms.cashInstrument};
}
async function submitFinal(session:Session,commands:Command[],options:SubmissionOptions|undefined,intent:OpenRfqIntentDraft) {
  try{return await session.submit(commands,options);}catch(error){if(error instanceof SubmissionUncertain)retainOpenRfqIntent(session,intent);throw error;}
}

export async function createOpenRequest(session: Session, terms: DiscoveryTerms): Promise<OpenRfqPublishProof> {
  const template = openTemplate(session);
  terms=checkedTerms(terms);
  const scopeKey=[terms.oracle,terms.collateralIssuer,terms.collateralInstrument,terms.cashIssuer,terms.cashInstrument].join("|");
  const updateId = await submitFinal(session,[create(template, {...terms, borrower:session.party, termDays:int(terms.termDays), cureSeconds:int(terms.cureSeconds), maxPriceAgeSeconds:int(terms.maxPriceAgeSeconds)})],undefined,{kind:"publish",scopeKey,market:marketForTerms(terms),openTemplate:template,terms});
  const events = created(confirmed(session, updateId), template);
  const matches = events.filter(event => {
    if(event.createArgument.borrower!==session.party)return false;
    try{return sameDiscoveryTerms(checkedTerms(termObject(event.createArgument,terms) as DiscoveryTerms),terms);}catch{return false;}
  });
  if (matches.length !== 1) throw new OpenRfqProofError("publish",updateId,"The request committed, but its local creation proof needs recovery. Use the original receipt instead of creating another request.",events.length===1?events[0].contractId:undefined);
  return {updateId, contractId:matches[0].contractId};
}

export async function sendOpenQuote(session: Session, request: OpenRfqRequest, rate: number | string, validSeconds: number): Promise<OpenRfqQuoteProof> {
  const template = validateRequest(session, request);
  const requestedRate = numeric10(typeof rate === "number" ? dec(rate) : rate);
  if (request.status !== "open" || request.borrower === session.party || BigInt(requestedRate.replace(".","")) > 10000000000n || !Number.isInteger(validSeconds) || validSeconds < 1 || validSeconds > 86400) throw new Error("Check the request, annualized rate and quote validity before sending.");
  const cashCid = await exactHolding(session, request.terms.cashInstrument, request.terms.cashIssuer, request.terms.cashAmount);
  const updateId = await submitFinal(session,[exercise(template, request.disclosure.contractId, "SubmitOpenQuote", {dealer:session.party,rate:requestedRate,validSeconds:int(validSeconds),cashCid})], {disclosedContracts:[request.disclosure]},{kind:"quote",scopeKey:request.id,market:request.market,openTemplate:template,terms:request.terms,borrower:request.borrower,requestContractId:request.disclosure.contractId,rate:requestedRate});
  const events = created(confirmed(session, updateId), TPL.RepoQuote);
  const matches = events.filter(event => {
    const payload=event.createArgument;
    if (payload.borrower !== request.borrower || payload.dealer !== session.party || typeof payload.rate !== "string" || numeric10(payload.rate) !== requestedRate) return false;
    try {return sameDiscoveryTerms(checkedDiscoveryTerms(termObject(payload,request.terms),request.market),request.terms);} catch {return false;}
  });
  if (matches.length !== 1) throw new OpenRfqProofError("quote",updateId,"The funded quote committed, but its local proof needs recovery. Use the original receipt instead of reserving cash again.",undefined,events.length===1?events[0].contractId:undefined);
  return {updateId,quoteContractId:matches[0].contractId};
}

export function withdrawOpenRequest(session: Session, request: OpenRfqRequest): Promise<string> {
  const template = validateRequest(session,request);
  if (request.borrower !== session.party) throw new Error("Only this request's borrower can close it.");
  return submitFinal(session,[exercise(template,request.disclosure.contractId,"WithdrawOpenRequest",{})],{disclosedContracts:[request.disclosure]},{kind:"close",scopeKey:request.id,market:request.market,openTemplate:template,requestContractId:request.disclosure.contractId});
}

/** Accept the chosen offer, close its open request, and release other linked offers. */
export async function acceptOpenRfqQuote(session: Session, quote: Contract<RepoQuote>, feedCid: string, request: OwnedOpenRequest): Promise<string> {
  const template = validateRequest(session,request);
  if (session.party !== request.borrower || quote.payload.borrower !== session.party || !request.quotes.some(record=>record.quoteContractId===quote.contractId)) throw new Error("This offer is not linked to your open request.");
  const collateralCid = await exactHolding(session,quote.payload.collateralInstrument,quote.payload.collateralIssuer,quote.payload.collateralAmount);
  const current = await session.read();
  if (!current.some(contract=>contract.contractId===quote.contractId && contract.templateId===TPL.RepoQuote)) throw new Error("This offer is no longer active. Refresh before accepting.");
  const requestActive = current.some(contract=>contract.contractId===request.disclosure.contractId && contract.templateId===template);
  if (request.status === "open" && !requestActive) throw new Error("This request was already closed on ledger. Sync its original withdrawal receipt before accepting the remaining funded offer.");
  const otherIds = new Set(request.quotes.filter(record=>record.quoteContractId!==quote.contractId).map(record=>record.quoteContractId));
  const others = current.filter(contract=>contract.templateId===TPL.RepoQuote && otherIds.has(contract.contractId) && contract.payload.borrower===session.party);
  const commands = [exercise(TPL.RepoQuote,quote.contractId,"AcceptQuote",{collateralCid,feedCid})];
  if (requestActive) commands.push(exercise(template,request.disclosure.contractId,"WithdrawOpenRequest",{}));
  commands.push(...others.map(contract=>exercise(TPL.RepoQuote,contract.contractId,"RejectQuote",{})));
  if(requestActive)return submitFinal(session,commands,{disclosedContracts:[request.disclosure]},{kind:"close",scopeKey:request.id,market:request.market,openTemplate:template,requestContractId:request.disclosure.contractId});
  return session.submit(commands,{disclosedContracts:[request.disclosure]});
}
