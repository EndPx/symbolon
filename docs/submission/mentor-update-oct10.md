# Symbolon — journal update for 10 October 2026

Please update our project journal and assess submission readiness using the evidence below. Separate a complete evidence section from completed market validation.

Symbolon addresses repayment-budget uncertainty. A floating borrowing rate can change while a position remains open. Our initial customer hypothesis is a treasury manager at a small or mid-sized digital-asset fund with Canton exposure or a concrete adoption plan. Symbolon lets borrowers compare lender-funded bilateral offers and agree a fixed annualized rate, duration and contractual principal-plus-interest repayment before settlement. Collateral, counterparty and operating risks remain.

**Product and network progress**

The active public application runs on shared HackCanton DevNet. We have returned to DevNet because TestNet custom-package/operator access and wallet compatibility are unresolved. The app uses Symbolon-issued cBTC-demo and USDCx-demo holdings and simulated marks. Native faucet assets are not integrated into financing.

The latest release simplifies the workflow to **publish an open request → lenders quote directly → borrower compares private APRs → settle → repay**. There is no lender registration, manual lender-name entry or borrower approval loop before quoting. Publishing creates a Canton `OpenRequest` and requires consent to disclose borrower identity and full request terms to authenticated connected Symbolon users. The unauthenticated board exposes only request ID, market, status and listing time. Each funded quote and accepted position remains bilateral. The application operator, asset issuer and hosted participant remain trust dependencies; information already disclosed cannot be revoked retroactively.

Requests and private offers now share one panel. Closed requests appear in a collapsed Archive. The market layout uses the available desktop width, and panels follow their content rather than leaving large fixed-height gaps. The README and GitBook explain the same final workflow and include a contract visibility matrix and a borrower/lender overview illustration.

**Technical execution evidence**

On 10 October WIB, one new full direct-request cycle completed through the public app using two synthetic parties authorized under the same founder-operated HackCanton account:

1. The borrower published a request for 1,000 USDCx-demo, 30 days and 0.0250 cBTC-demo collateral.
2. The lender read the request directly and submitted a private funded quote at 7% annualized APR. The quote reserved exactly 1,000 cash.
3. The borrower accepted and settled. The linked open request was withdrawn in the same update.
4. The borrower paid the full 1,005.8333333333 USDCx-demo repurchase price. Canton recorded `ClosedRepo: Repurchased`, and collateral returned to the borrower.

Settlement offset: **2790006**. Repurchase offset: **2790169**. A quote-indexing error was corrected by preserving database timestamp precision. The original committed quote receipt was synced successfully; a second cash reservation was not made. Identifiers, screenshots and evidence limits are in the linked direct Open RFQ report.

The frontend/API/helper suite passed 185 tests and build checks at revision `3e7bdef`; the independent Open RFQ package passed 9 Daml Script tests. Existing core, governance, LocalNet and shared-DevNet receipts remain separate retained evidence. These are engineering checks, not a security audit or proof of production-token compatibility.

Our BitSafe entry is **Contribution Pool**, not Gold. The retained integration has a reproducible three-participant LocalNet setup, three DecMan services and a 2-of-3 governed collateral-mark action with a demonstrated repo effect. All services run on one operator host. This demonstrates threshold behavior and application integration, not independent-operator decentralization or live Gold eligibility.

**Validation evidence**

- **Technical feasibility:** LocalNet, retained shared-DevNet workflows and the newly completed direct Open RFQ cycle demonstrate simulated-asset execution at their stated scope.
- **Borrower discovery:** One relevant borrower described a past USDC loan on Aave against ETH at approximately 60% LTV, closed after roughly two months. They preferred predictable financing terms and valued confidentiality. Their concern about floating rates and position health supports further discovery; we have not measured budget losses or a willingness to switch.
- **Hands-on product feedback:** The founder reports approximately 3–5 people from Web3 communities and their personal Web3 network explored the application and gave informal feedback. Reported themes include fixed-rate financing as another Canton option, confidentiality and accessing liquidity against assets. Exact count, roles, dates and completed steps are not documented. These reports support early product interest, not verified external end-to-end completion or institutional demand.
- **Still unvalidated:** Institutional ICP fit, willingness to switch, willingness to pay, an independently operated external borrower/lender cycle and pilot commitment. Fictional persona scenarios are test-planning tools and are excluded from all user counts.

**Business model and next steps**

The proposed fee is **0.1% of term interest from the borrower and 0.1% from the lender**, or **0.2% of interest in total**. It is not a fee on principal. If a deal generates 5,000 in term interest, each side would contribute 5 and Symbolon would receive 10. The current prototype collects zero protocol fees and has zero revenue. Fee collection, rounding, default treatment and willingness to pay remain future work.

The next customer work is two additional interviews about real past borrowing episodes, followed by an observed external borrower/lender rehearsal. Proposed channels are Canton ecosystem introductions, direct treasury outreach and the developer community around the reproducible integration. A real-asset pilot requires token adapters, a verified price source, permissions, closeout accounting and operating arrangements.

Please treat the **Validation Evidence section as submission-ready**, while keeping its market-validation gaps open. The Problem, ICP hypothesis, Solution, technical MVP, proposed GTM and Pitch can be assessed for clarity without converting hypotheses into verified demand. An editable pitch deck and narration are prepared for the submission package; the final hackathon form has not been published by this update.

Project: https://github.com/EndPx/symbolon

Live app: https://symbolon.endpx.cloud/app

Documentation: https://symbolon.gitbook.io/symbolon-docs/

Latest technical evidence: https://github.com/EndPx/symbolon/blob/main/docs/submission/evidence/open-rfq-devnet.md
