# GTM — Go-to-Market

This is a proposed pilot strategy. No customers, partnerships, outreach responses or revenue are claimed.

## 1. Positioning

For **treasury managers at digital-asset funds who need a predictable repayment budget**, **Symbolon** is a **private fixed-rate financing desk on Canton** that **lets borrowers agree a dealer's offered rate and exact principal-plus-interest amount before settlement**. Unlike a floating-rate borrowing position, the accepted agreement does not reprice its interest with later pool utilization.

The agreement is bilateral: a dealer supplies and reserves the cash, the borrower pledges collateral, and Daml records the terms and enforces settlement and subsequent collateral actions. Symbolon supplies the workflow, not its own lending capital or a pooled interest-rate market.

- **Current alternatives:** Floating-rate borrowing on markets supporting the user's assets, separate fixed-term dealer financing, or postponing the borrowing. We do not offer automatic migration of an Aave debt or assume Canton collateral is directly accepted there.
- **Why Canton:** The intended assets are on Canton, and counterparties need private terms, Daml authorization and atomic asset settlement. Fixed-rate mathematics is not unique to Canton. Quotes are scoped to their addressed parties; issuers and participant operators remain trust dependencies.

## 2. First customers

- **Segment:** A small or mid-sized digital-asset fund's treasury operator with borrowing experience, Canton asset exposure or a concrete adoption plan, and authority to sponsor a controlled rehearsal.
- **Why first:** A limited borrower/dealer pair lets us test demand for an agreed repayment amount and operational fit before building a broad liquidity venue. Whether these funds feel the pain strongly or can adopt quickly is a hypothesis.
- **Discovery targets:** [QCP](https://www.qcpgroup.com/), [G-20 Group](https://g20.group/) and [Cumberland DRW](https://www.cumberland.io/) for treasury/dealer research and introductions; BitSafe and NODERS for technical feedback and ecosystem introductions. These are research/support targets, not customers, partners or promised liquidity. We still need a verified smaller-fund borrower list.

## 3. Distribution channels

| Channel | Why it may reach users | First concrete action | Proposed effort / cost |
| --- | --- | --- | --- |
| Canton ecosystem introductions | Connects asset, treasury and dealer operators | Request introductions to 3 borrower-side operators and 2 dealer-side operators through existing ecosystem channels | Founder time; no paid campaign budget assumed |
| Direct treasury/operations outreach | Tests actual rate-budgeting pain with relevant roles | Build a named 20-contact research list and send individual requests for a 15-minute discovery conversation | One focused research/outreach session per week |
| Reusable BitSafe LocalNet example and developer community | Reaches integrators who could enable a pilot | Share the pinned reproduction and ask 3 independent developers to run it and report blockers | Engineering/support time; this is an integration channel, not a borrower count |

No outreach has been sent under this plan yet.

## 4. Acquisition hypotheses

| Hypothesis | How we test it | Proposed success metric | Status |
| --- | --- | --- | --- |
| Treasury operators with floating-rate exposure value a known repayment amount | Ask about the last financing decision before showing the product | At least 3 of 8 relevant interviews report a concrete budgeting consequence and explain an acceptable fixed-rate trade-off | Untested |
| A private fixed quote can activate a borrower/dealer pair | Observe a simulated request-to-repurchase rehearsal | One external pair completes it and correctly explains repayment and margin risk | Untested with external operators |
| Ecosystem introductions produce qualified discovery conversations | Track intro requests, responses and role/asset fit | 5 qualified conversations from the first 10 introduction requests | Untested |
| The LocalNet integration can be reused outside the builder's setup | Give fresh users the public instructions | 2 of 3 independent developers reproduce the governed mark and repo effect | Untested with external developers |

If interviews show little rate-budgeting pain, fixed-rate premiums are unacceptable, or no compatible dealer/assets exist, narrow the segment or stop that pilot path rather than inventing traction.

## 5. Business model

- **Who pays and for what:** Hypothesis: a fund's CFO/head of treasury pays for a financing workflow workspace and operational support. The dealer earns the contractual financing interest; that is not Symbolon revenue.
- **Pricing hypothesis:** Test a B2B workspace subscription around USD 200–500 per organization/month after observing a useful rehearsal. This is a proposed interview price range, not an implemented fee or customer agreement.
- **Revenue on Canton:** Current Symbolon fees, subscriptions and revenue are **0**. Network fees are separate. A workflow fee or service license could be tested later; Featured App rewards are not an assumed business model or approved status.
- **Why now:** Canton asset and cash infrastructure makes a focused native financing pilot possible; readiness still depends on supported assets, permissions and counterparties.

## 6. First 90 days after the hackathon

| Period | Proposed milestone | Completion evidence |
| --- | --- | --- |
| Weeks 1–4 | Conduct 8 operator interviews and 3 observed prototype walkthroughs | Dated consent-aware notes; actual pain, premium tolerance and adoption blockers recorded |
| Weeks 5–8 | Rehearse one borrower/dealer pair with simulated holdings, observe 2 additional walkthrough participants, and complete adapter/oracle feasibility work | External pair's completed cycle; 5 total observed participants across weeks 1–8; verified integration requirements and named operational owners |
| Weeks 9–12 | Complete 3 external simulated cycles and decide whether a real-asset pilot is justified | Repeat-use decision, observed metrics and documented release gates. MainNet proceeds only if real-token adapters, permissions, oracle lineage, closeout accounting and review are ready. |

The current prototype fixes principal-plus-interest for an agreed term, but early repurchase still pays that full amount. Price drops can require a margin top-up or lead to closeout. Production funding and MainNet deployment are not promised by this timetable.

## 7. Risks and what we need

- **Adoption blockers:** Dealer liquidity, compatible assets, fixed-rate pricing, early repayment terms, integration effort, custody/participant trust and regulatory/operational approval. Software cannot create a dealer's capital or asset eligibility.
- **Ecosystem needs:** Borrower/dealer introductions, issuer/token-adapter guidance, oracle/operator feedback and infrastructure support for a controlled pilot. No sponsor partnership or funding commitment is claimed.
- **Current challenge scope:** BitSafe Contribution Pool. DecMan's 2-of-3 governed oracle action is reproduced on three-participant LocalNet on one CI host. The separate shared DevNet record is ordinary hosted-party Ledger API execution. Real cBTC/USDCx, wallet signing and DevNet/MainNet decentralized-party deployment remain unverified.

## Checklist

- [x] One-sentence positioning and specific first segment.
- [x] Multiple channels with concrete next actions.
- [x] At least three testable acquisition hypotheses.
- [x] Payer, value and pricing hypothesis explicit.
- [x] Canton fit and operational dependencies explained.
- [ ] Channels, commercial demand and external adoption validated.
