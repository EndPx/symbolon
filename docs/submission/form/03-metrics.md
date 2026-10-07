# Metrics

We have engineering evidence. We have no external customers, completed customer interviews, measured savings or revenue. Internal test parties and transactions are not counted as users.

## 1. North Star metric

- **Metric:** Completed financing cycles per month by external borrower/dealer pairs who chose a fixed quote and closed through repurchase.
- **Why this one:** A cycle requires both usable financing and successful repayment of the pre-agreed amount. It measures use of the core product rather than page views or internal transaction volume.
- **Measurement:** Link a committed settlement to `ClosedRepo: Repurchased`, record the external operators with consent, and exclude developer-run tests. Separate simulated pilot cycles from real-asset production cycles. Current external cycles: **0**.

## 2. What we needed to validate

| Assumption | Why it matters | Status |
| --- | --- | --- |
| Floating-rate markets change borrowing cost over time | Establishes the proposed financial problem | Confirmed as a mechanism in [Aave's documentation](https://www.aave.com/docs/aave-v3/overview); its materiality for our target users is untested. |
| Our target treasury teams experience material budgeting pain | Establishes customer need | Untested; no interviews. |
| They would choose fixed terms over a floating alternative | Establishes willingness to switch | Untested; price premium and early repayment trade-offs need research. |
| Borrower and dealer can complete our agreement | Establishes technical feasibility | Demonstrated with simulated assets on local Canton and shared DevNet. |
| Governed marks can affect collateral management | Establishes BitSafe application relevance | Demonstrated through the three-participant LocalNet and separately ordinary-party DevNet governance. |
| A buyer will pay for the workflow | Establishes a business model | Untested; no collected fees or revenue. |

## 3. Conversations

**Completed potential-customer conversations: 0.** The following are planned interview roles, not interviews that have happened.

| # | Planned respondent | Date | Key takeaway |
| --- | --- | --- | --- |
| 1 | Treasury manager at a fund with collateralized borrowing experience | Not conducted | No finding yet. |
| 2 | Borrowing/collateral operations lead | Not conducted | No finding yet. |
| 3 | Dealer or liquidity desk able to assess Canton financing | Not conducted | No finding yet. |

**Strongest quote:** None collected. We will not invent a customer quote.

## 4. Tests and results

**Local browser test:** The recorded workflow compared 5.2% and 5.8% quotes, accepted 5.2%, handled a simulated collateral decline and top-up, and closed at `Repurchased`. The 145.96-second recording uses simulated CETH/CUSD and a local role picker. [Browser record](https://github.com/EndPx/symbolon/blob/main/docs/submission/evidence/browser-repurchase.json)

**Shared DevNet test, 7 October 2026:** One end-to-end repo on Canton 3.5.19, 20 committed transactions, one expected below-threshold rejection and five timestamped snapshots. The 1,000 USDCx-demo / 30-day / 5.2% agreement retained `1,004.3333333333` as its repurchase amount through margin handling. The borrower added 0.005 cBTC-demo, restored coverage and repurchased. Seven synthetic roles belonged to one account on one participant; no wallet signing or DecMan service ran in this test. [Original receipts and operator-log corroboration](https://github.com/EndPx/symbolon/blob/main/docs/submission/evidence/shared-devnet.md)

**BitSafe LocalNet test:** Three participants and three DecMan services on one disposable CI host. An attempt to execute the price action with one valid member confirmation was rejected; after a second distinct member confirmation, execution succeeded. The proposer, confirmer and executor are three configured member roles. The governed action publishes a simulated collateral mark through the designated oracle party; it does not set financing interest or prove the mark is economically correct. The changed mark led to margin/top-up/repurchase. This is LocalNet decentralized-party integration, not independent operators or a DevNet decentralized party. [Evidence](https://github.com/EndPx/symbolon/blob/main/docs/submission/evidence/bitsafe-localnet.json)

**Other implemented branches:** Local Daml lifecycle checks exercise collateral substitution, dealer-led liquidation after an uncured call and fresh qualifying mark, and maturity default. Maturity nonpayment permits the dealer's default action even with healthy collateral. These branches release demo collateral and record closure; the named shared DevNet evidence is a repurchase path, not a demonstration of realized collateral-sale accounting or every branch.

**What changed through engineering checks:** Exact-sized holdings and reservations protect committed funds; party-scoped checks cover competing quotes and positions; cure/freshness checks constrain closeout; authenticated setup and source-hash verification were hardened. These are engineering findings, not customer feedback.

## 5. Product and on-ledger metrics

All targets below are proposed goals, not achieved results or promises.

| Metric | How measured | Now | Target by submission |
| --- | --- | --- | --- |
| External people who tried the demo | Consented unique operators, excluding the builder and AI reviewers | 0 | 3 |
| External borrower/dealer pairs completing the core rehearsal | Observed quote-to-repurchase cycle operated by both sides | 0 pairs | 1 simulated pair |
| Completed customer interviews | Dated research notes | 0 | 3; remain marked incomplete if not achieved |
| Shared DevNet committed transactions | Retained matching ledger receipts for run d2602fd8 | 20 engineering transactions | Existing verified bundle retained; no extra transactions solely to raise the count |
| Shared DevNet completed repos | Settlement linked to repurchased closing record | 1 internal simulated-asset run | 1 reproducible evidence record |
| MainNet transactions | Verified real-network receipts | 0 | No MainNet target for current submission scope |
| Actor parties in the DevNet run | Named roles in retained mapping | 7 synthetic roles / 1 account | Clearly labeled as roles, not users |
| BitSafe LocalNet topology | Participant IDs and all-node audits | 3 participants / 3 DecMan services / 1 host | Reproducible pinned setup |
| Automated checks | Dated test/CI results | 11 core Daml Script entries, 2 BitSafe scripts, 27 frontend tests, 7 runner/helper tests passed in their recorded local runs | Preserve tested revision and scope; no security-audit claim |

## 6. Success criteria after the hackathon

| Metric | Proposed target in 90 days |
| --- | --- |
| Discovery interviews | 8 relevant operators across borrower and dealer roles |
| External simulated rehearsals | 3 completed financing cycles with recorded understanding and friction |
| Pilot readiness | One willing borrower/dealer pair with identified asset, network, operational owners and approval requirements |
| Repayment understanding | At least 4 of 5 observed walkthrough participants correctly explain the amount, term and remaining collateral risk without coaching |
| Commercial evidence | At least one budget-owner discussion comparing proposed pricing with an identified benefit; no revenue assumed |

## 7. What we still do not know

Whether rate uncertainty is material for this segment; acceptable fixed-rate premiums; preferred terms and early repayment policy; dealer liquidity; asset eligibility; willingness to pay; oracle methodology; production custody and closeout accounting. Interviews and simulated bilateral rehearsals come first. Real-value pilots require verified token adapters, oracle lineage, permissions, accounting and operating arrangements.

## Checklist

- [x] North Star and exclusion rules defined.
- [ ] At least three potential-customer conversations completed.
- [x] Financial mechanism, customer hypotheses and software results separated.
- [x] Tests have traceable counts and original evidence.
- [x] Current values and proposed targets explicit.
- [x] Engineering changes described without implying customer validation.
