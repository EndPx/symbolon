import { useId, type ReactNode } from "react";
import type { Contract } from "../ledger/api";
import { displayDecimal } from "./financing-display";
import type { QuoteRequest } from "../ledger/symbolon";

export function PendingRequests({ requests, busy, renderLender, onWithdraw }: {
  requests: Contract<QuoteRequest>[];
  busy: boolean;
  renderLender(party: string): ReactNode;
  onWithdraw(request: Contract<QuoteRequest>): void;
}) {
  const headingId = useId();
  if (!requests.length) return null;
  return <section className="pending-requests" aria-labelledby={headingId}>
    <header className="pending-requests-heading"><h3 id={headingId}>Pending requests</h3>
      <span className="terminal-status">{requests.length} request{requests.length === 1 ? "" : "s"}</span></header>
    <div className="pending-request-list">{requests.map(request => <article className="pending-request" key={request.contractId}>
      <dl className="pending-request-terms">
        <div className="pending-request-lender"><dt>Lender</dt><dd>{renderLender(request.payload.dealer)}</dd>
          <span className="offer-status">Awaiting quote</span></div>
        <div><dt>Amount requested</dt><dd className="pending-request-amount">{displayDecimal(request.payload.cashAmount, 2)}</dd>
          <small>{request.payload.cashInstrument}</small></div>
        <div><dt>Duration</dt><dd>{request.payload.termDays} days</dd></div>
      </dl>
      <button type="button" className="ghost sm" disabled={busy} onClick={() => onWithdraw(request)}>Withdraw</button>
    </article>)}</div>
    <div className="pending-request-next"><strong>What happens next</strong>
      <p>Lenders set their APR and send a funded offer. You review and accept an offer before settlement.</p>
      <details className="pending-request-help"><summary>Testing both sides?</summary>
        <p>Switch to the authorized lender party, open Lend and send an offer. Return to the borrower to review it. Borrow/Lend alone does not change the signing party.</p>
      </details>
    </div>
  </section>;
}
