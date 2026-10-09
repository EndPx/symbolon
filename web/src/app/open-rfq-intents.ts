import type { Session } from "../ledger/session";
import type { CommittedReceipt } from "../ledger/canton-v2";
import { checkedDiscoveryTerms, sameDiscoveryTerms, numeric10, type DiscoveryTerms } from "../ledger/discovery-model";
import type { LenderMarket } from "../ledger/lender-directory-model";

export type OpenRfqIntent = {
  kind: "publish" | "quote" | "close"; scopeKey: string; commandId: string; party: string;
  market: LenderMarket; openTemplate: string; terms?: DiscoveryTerms; borrower?: string;
  requestContractId?: string; rate?: string;
};
export type OpenRfqIntentDraft = Omit<OpenRfqIntent,"commandId"|"party">;
const intents = new Map<string,OpenRfqIntent>();
const key=(party:string)=>`symbolon.open-rfq-intent.v1.${party}`;
/** Called only for the final RFQ command, never holding consolidation or split. */
export function retainOpenRfqIntent(session: Session, intent: OpenRfqIntentDraft) {
  const pending=session.pendingCommand?.();
  if (!pending || pending.party!==session.party || pending.synchronizerId!==intent.market.synchronizerId) return;
  const value:OpenRfqIntent={...intent,party:session.party,commandId:pending.commandId};
  intents.set(key(session.party),value);
  try {sessionStorage.setItem(key(session.party),JSON.stringify(value));}catch{/* Memory fallback. */}
}
export function clearOpenRfqIntent(session: Session) {
  intents.delete(key(session.party));
  try {sessionStorage.removeItem(key(session.party));}catch{/* Memory fallback. */}
}
function readIntent(session: Session): OpenRfqIntent|null {
  let value:unknown=intents.get(key(session.party));
  if (!value)try{value=JSON.parse(sessionStorage.getItem(key(session.party))??"null");}catch{return null;}
  const intent=value as OpenRfqIntent|null;
  return intent && intent.party===session.party && ["publish","quote","close"].includes(intent.kind) && typeof intent.commandId==="string" && typeof intent.scopeKey==="string" ? intent : null;
}
function sameTerms(payload:Record<string,unknown>,intent:OpenRfqIntent) {
  if (!intent.terms)return false;
  const terms=Object.fromEntries(Object.keys(intent.terms).map(field=>[field,payload[field]]));
  for(const field of ["termDays","cureSeconds","maxPriceAgeSeconds"])if(typeof terms[field]==="string")terms[field]=Number(terms[field]);
  try{return sameDiscoveryTerms(checkedDiscoveryTerms(terms,intent.market),intent.terms);}catch{return false;}
}
/** Restore confirmed identifiers before the transaction guard permits a new action. */
export function recoverOpenRfqIntent(session:Session,receipt:CommittedReceipt,save:(kind:string,party:string,id:string,proof:{updateId:string;contractId?:string;quoteContractId?:string})=>void):boolean {
  const intent=readIntent(session);
  if (!intent || receipt.commandId!==intent.commandId || receipt.synchronizerId!==intent.market.synchronizerId) return false;
  const events=receipt.events as Array<{CreatedEvent?:Record<string,unknown>;ExercisedEvent?:Record<string,unknown>}>;
  let proof:{updateId:string;contractId?:string;quoteContractId?:string}={updateId:receipt.updateId};
  if(intent.kind==="publish") {
    const matches=events.flatMap(row=>{
      const e=row.CreatedEvent,p=e?.createArgument as Record<string,unknown>|undefined;
      return e?.templateId===intent.openTemplate && typeof e.contractId==="string" && p?.borrower===session.party && sameTerms(p,intent) ? [e.contractId] : [];
    });
    if(matches.length===1)proof.contractId=matches[0];
  } else if(intent.kind==="quote") {
    const wrapper=events.some(row=>row.ExercisedEvent?.templateId===intent.openTemplate && row.ExercisedEvent.contractId===intent.requestContractId && row.ExercisedEvent.choice==="SubmitOpenQuote");
    const matches=wrapper?events.flatMap(row=>{
      const e=row.CreatedEvent,p=e?.createArgument as Record<string,unknown>|undefined;
      if(e?.templateId!==`${intent.market.corePackageId}:Symbolon.Repo:RepoQuote` || typeof e.contractId!=="string" || p?.borrower!==intent.borrower || p?.dealer!==session.party || !sameTerms(p,intent))return [];
      try{return numeric10(p.rate)===intent.rate?[e.contractId]:[];}catch{return [];}
    }):[];
    if(matches.length===1)proof.quoteContractId=matches[0];
  } else {
    const withdrawal=events.some(row=>row.ExercisedEvent?.templateId===intent.openTemplate && row.ExercisedEvent.contractId===intent.requestContractId && row.ExercisedEvent.choice==="WithdrawOpenRequest" && row.ExercisedEvent.consuming===true);
    if(!withdrawal)return false;
  }
  // An incomplete known commit stays locked to receipt recovery, never re-submission.
  save(intent.kind,session.party,intent.scopeKey,proof);
  clearOpenRfqIntent(session);
  return true;
}
