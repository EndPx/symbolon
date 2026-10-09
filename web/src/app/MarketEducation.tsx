import { useId } from "react";
import type { TradeSide } from "./terminal-state";
import { deployment } from "../ledger/deployment";

const borrowing = [
  ["Request", "Choose cash amount, collateral and duration. Approve sharing with all registered lenders for this market. A request does not give you cash."],
  ["Receive offer", "Your lender quotes a fixed APR and the exact repayment amount."],
  ["Accept & settle", "Review the offer, then exchange collateral for cash in one ledger transaction."],
  ["Repay", "Pay the full agreed amount before the applicable deadline to recover collateral."],
];
const lending = [
  ["Receive request", "Register your lender party for this market. New borrower requests are addressed separately to each registered lender."],
  ["Quote", "Set your fixed rate. Sending a funded offer reserves cash for that borrower."],
  ["Settle", "Borrower acceptance exchanges your reserved cash for locked collateral."],
  ["Receive repayment", "Full repayment returns cash to you and collateral to the borrower."],
];

export function MarketEducation({side}:{side:TradeSide}) {
  const id=useId();
  const discovery = !!deployment().publicDesk;
  const journey = side === "lend" ? lending : borrowing;
  const first = side === "lend" ? ["Find an opportunity", "Request detail access from the open board. The borrower approves a private request to your party before you set an APR. No lender registration is required."] : ["Publish an opportunity", "Choose the cash amount, collateral and duration. Publish a minimal listing, then approve each lender before sharing your full terms. Publishing does not give you cash."];
  return <div className="market-education">
    <section className="market-journey" aria-labelledby={`${id}-journey`}>
      <h3 id={`${id}-journey`}>{side==="lend"?"How lending works":"How borrowing works"}</h3>
      <ol>{(discovery ? [first, ...journey.slice(1)] : journey).map(([title,text],index)=><li key={title}><span className="journey-number" aria-hidden="true">{index+1}</span><div><h4>{title}</h4><p>{text}</p></div></li>)}</ol>
    </section>
    <div className="market-assurance-grid">
      <section aria-labelledby={`${id}-cost`}><h3 id={`${id}-cost`}>{side==="lend"?"Know the agreed cash return":"Know the repayment before you accept"}</h3><p>Reference APR is indicative. The accepted offer fixes the rate and principal-plus-interest repayment. Early repayment still costs the full agreed amount.</p><p className="sm muted">Fixed repayment does not remove collateral risk. Network fees remain separate. Duration starts at settlement; this prototype has no automatic rollover.</p>
        <details className="education-disclosure"><summary>Rates and collateral explained</summary><dl>
          <div><dt>Repo / repurchase</dt><dd>Cash against collateral, with an agreement to repay and recover those assets. Collateral title transfers to the lender at settlement.</dd></div>
          <div><dt>Annualized ACT/360</dt><dd>Simple interest = principal × annual rate × days ÷ 360. APR is an annual rate, not the percentage charged for a shorter agreement.</dd></div>
          <div><dt>Cover and margin</dt><dd>150% initial cover means collateral is initially worth 1.5× the cash borrowed. A 105% maintenance margin requires its value to cover 1.05× that cash.</dd></div>
          <div><dt>Cure window</dt><dd>Time after a lender issues a margin call to restore margin. Liquidation still requires a fresh post-cure mark showing a shortfall; maturity default is separate.</dd></div>
          <div><dt>Fees and test assets</dt><dd>This prototype has no Symbolon protocol fee. Network charges are separate. Demo assets and simulated prices do not represent real cBTC/USDCx funding.</dd></div>
        </dl></details>
      </section>
      <section aria-labelledby={`${id}-privacy`}><h3 id={`${id}-privacy`}>Who can see your deal?</h3><p>{discovery ? "The open board reveals the market and listing status. You choose which lenders receive your identity, amount, collateral quantity and duration. Each receives a separate private request and sees its own quote. The accepted position is shared with the borrower and winning lender." : "A request is visible to its borrower and addressed lender. Each lender sees its own quote; the borrower compares their offers. The accepted position is shared with the borrower and winning lender."}</p><p className="sm muted">The application operator can access stored discovery details. Asset issuers can observe their holdings and asset movements. Hosting operators remain a trust dependency.</p>
        <details className="education-disclosure"><summary>Why Canton?</summary><p>Canton supports party-specific contract visibility and atomic cash/collateral settlement. That lets counterparties agree confidential terms and settle together. Privacy means controlled access, not anonymity.</p></details>
      </section>
    </div>
  </div>;
}
