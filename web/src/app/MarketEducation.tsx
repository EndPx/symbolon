import { useId } from "react";
import type { TradeSide } from "./terminal-state";

const borrowing = [
  ["Request", "Choose cash amount, collateral and duration. A request does not give you cash."],
  ["Receive offer", "Your lender quotes a fixed APR and the exact repayment amount."],
  ["Accept & settle", "Review the offer, then exchange collateral for cash in one ledger transaction."],
  ["Repay", "Pay the full agreed amount before the applicable deadline to recover collateral."],
];
const lending = [
  ["Receive request", "Share your party ID. Borrowers send requests addressed to your account."],
  ["Quote", "Set your fixed rate. Sending a funded offer reserves cash for that borrower."],
  ["Settle", "Borrower acceptance exchanges your reserved cash for locked collateral."],
  ["Receive repayment", "Full repayment returns cash to you and collateral to the borrower."],
];

export function MarketEducation({side}:{side:TradeSide}) {
  const id=useId();
  return <div className="market-education">
    <section className="market-journey" aria-labelledby={`${id}-journey`}>
      <h3 id={`${id}-journey`}>{side==="lend"?"How lending works":"How borrowing works"}</h3>
      <ol>{(side==="lend"?lending:borrowing).map(([title,text],index)=><li key={title}><span className="journey-number" aria-hidden="true">{index+1}</span><div><h4>{title}</h4><p>{text}</p></div></li>)}</ol>
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
      <section aria-labelledby={`${id}-privacy`}><h3 id={`${id}-privacy`}>Who can see your deal?</h3><p>Each lender receives its own request and quote. The accepted position and terms are shared with the borrower and winning lender, not unrelated counterparties.</p><p className="sm muted">Asset issuers can observe asset movements. Hosting operators remain a trust dependency.</p>
        <details className="education-disclosure"><summary>Why Canton?</summary><p>Canton supports party-specific contract visibility and atomic cash/collateral settlement. That lets counterparties agree confidential terms and settle together. Privacy means controlled access, not anonymity.</p></details>
      </section>
    </div>
  </div>;
}
