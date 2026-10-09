# User validation and pilot plan

The initial customer profile is a treasury operator at a small or mid-sized digital-asset fund with Canton asset exposure or a concrete adoption plan, together with a lender willing to finance an agreed collateral type. This is a targeting hypothesis. One informal borrower discussion and a follow-up about a real Aave borrowing episode have started discovery. Institutional ICP interviews, external app use, design partners, signed pilots and willingness to pay remain unvalidated.

The borrower reported borrowing USDC against ETH at approximately 60% LTV and closing after roughly two months. They were concerned that floating rates could increase accrued debt and weaken health factor, and valued fixed financing terms and confidential bilateral terms after hearing the concept. No actual rate spike or budget disruption was quantified. The follow-up is the same participant, not a second interview; no app trial or switching commitment was reported.

## Questions to test

| Hypothesis | Evidence to seek | Evidence against it |
| --- | --- | --- |
| Floating-rate changes materially disrupt a treasury's repayment budget | Last actual rate change, revised expense and decision made | Rate uncertainty is immaterial or an existing fixed arrangement already meets the need |
| A known repayment amount justifies fixed-term trade-offs | Accepted premium, term and early repayment policy after a concrete example | Users prefer flexible floating borrowing or reject the fixed quote's cost |
| Temporary funding against held assets is a recurring need | Recent concrete transactions and frequency | Need is rare or assets are not financeable |
| Coordination is a material source of friction | Time spent, handoffs, failed settlement or reconciliation work | Existing tools resolve it adequately |
| Private dealer comparison matters | Specific information the operator cannot publish | Users prefer a public venue or have no relevant concern |
| Post-trade workflow creates value | Actual margin, substitution and repayment pain | Those events are rare or already automated |
| Both sides can adopt a Canton workflow | Access to parties, assets and operational approval | Counterparty or token access blocks adoption |

## Discovery interviews

Seek an initial group of 5–8 relevant operators across both sides of the trade. Before showing the product, ask about the last financing decision, how its interest expense was budgeted, whether the realized rate changed, and whether that change caused a concrete decision or loss. Then investigate fixed-rate premium tolerance, early repayment needs, counterparty/asset access and operational exceptions. Do not substitute liking a hypothetical fixed-rate product for observed pain or willingness to switch.

Show the prototype only after recording the current process. Ask the respondent to request a quote, interpret the due amount, respond to a margin call, and explain what information another dealer should see. Record observed confusion separately from suggestions and compliments.

Keep an evidence log with date, respondent role, consent for attribution, anonymized workflow facts, and what changed in our hypothesis. Do not turn a friendly conversation into an implied customer commitment.

## Proposed pilot

1. Select one borrower, one dealer, one collateral identity and one cash identity.
2. Confirm participant access, token transfer rules, oracle policy and operational owner.
3. Rehearse the workflow with simulated holdings and controlled marks.
4. Compare the prototype workflow with the team's current process using the same example.
5. Decide whether a further authorized pilot is justified; real assets require separate integration and operating agreements.

Candidate measures are completion without developer intervention, time between confirmed request and committed settlement, number of manual handoffs, correctness of the participant's understanding of payoff and deadlines, and successful recovery from stale inputs. Set target values with pilot participants rather than inventing market benchmarks.

## Distribution hypothesis

Start with direct outreach to treasury operators, Canton asset issuers and financing counterparties that can make both sides of a pilot possible. A usable workflow alone cannot create a dealer's balance sheet or token eligibility. Distribution needs access to those relationships as well as a frontend.

Pricing remains unvalidated. Possible future models include software/service fees or usage-based workflow fees, but the current contract does not levy a Symbolon fee. Interview willingness to pay for a specific improvement only after observing the present workflow and verifying the integration costs.

## Decision gates

Continue if both sides identify a repeated problem, can use the same supported assets/network, and complete a rehearsal with an improvement they value. Narrow the scope if only a single post-trade action is valuable. Reconsider the initial customer profile if current tools already solve the problem or if token and counterparty access dominate the cost.
