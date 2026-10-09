import { requestQuotes, type RequestTerms } from "./actions";
import type { Session } from "../ledger/session";
import { eligibleLenders, sameRecipients, type LenderMarket, type RegisteredLender } from "../ledger/lender-directory-model";

export async function sendRegisteredRequests(session: Session, terms: Omit<RequestTerms, "dealers">, market: LenderMarket | null,
  reviewed: RegisteredLender[], consent: boolean, load: () => Promise<RegisteredLender[]>) {
  if (!consent || !reviewed.length || reviewed.some(lender => lender.party === session.party)) throw new Error("Review and approve the lender recipients before sending.");
  if (market && (terms.oracle !== market.oracle || terms.collateralIssuer !== market.collateralIssuer || terms.collateralInstrument !== market.collateralInstrument
    || terms.cashIssuer !== market.cashIssuer || terms.cashInstrument !== market.cashInstrument)) throw new Error("The market changed. Review the request again.");
  const recipients = eligibleLenders(await load(), session.party);
  if (!sameRecipients(recipients, eligibleLenders(reviewed, session.party))) throw new Error("The lender list changed. No requests were sent; review again.");
  // This transaction creates one private RFQ per recipient. It deliberately
  // contains no funded-quote, asset-issuance or settlement commands.
  return requestQuotes(session, {...terms, dealers: recipients.map(lender => lender.party)});
}
