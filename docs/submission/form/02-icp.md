# ICP — Ideal Customer Profile

Our initial customer is a digital-asset fund treasury operator who needs collateralized financing and prioritizes a known repayment budget over an open-ended floating rate. This is a targeting hypothesis, not a validated customer base.

## 1. Who they are

| | Initial profile |
| --- | --- |
| **Segment** | Digital-asset fund treasury teams with Canton asset exposure or a concrete Canton adoption plan, and experience managing collateralized borrowing. |
| **Company size / stage** | A small or mid-sized fund with a lean treasury/operations team able to sponsor a controlled pilot. No validated AUM or headcount threshold yet. |
| **User** | Treasury manager or borrowing/operations lead who selects financing terms, monitors collateral and prepares repayment. |
| **Buyer** | CFO, head of treasury or fund principal who approves software spend and operational adoption. |
| **Required counterparty** | A financing dealer with eligible cash inventory, acceptable risk policy and authority to quote. Symbolon itself does not lend its own funds. |
| **Geography** | Initial discovery through globally accessible Canton/digital-asset networks. A production pilot requires an approved jurisdiction and operating arrangement; no universal regulatory eligibility is claimed. |

## 2. Their pain

- **Top pain point:** “I can see today's borrowing rate, but I cannot lock the financing expense for the period I am budgeting.”
- **How often it happens:** Exposure continues while a floating-rate position is open; actual borrowing frequency and material rate-change frequency have not been measured for this segment.
- **What it costs them:** Unexpected interest expense and repeated budget updates. We have no measured loss or savings figure.
- **How they solve it today:** For assets supported on an EVM market, floating-rate protocols such as Aave are an alternative; users can monitor, repay or arrange separate fixed-term financing. Canton-native collateral would require a suitable Canton counterparty or another supported arrangement. We do not assume native cBTC can be deposited into Aave or automatically migrated into Symbolon.

Privacy matters because a treasury's funding request and a dealer's offered rate reveal commercially sensitive decisions. Symbolon limits direct quote visibility to the addressed counterparties; issuers and hosting operators remain part of the trust boundary.

## 3. What they want

**Job to be done:** “When I need cash against assets I intend to recover, I want to agree the rate and full repayment amount before settlement, so I can budget financing without future rate changes altering that amount.”

**What would make them switch:** A suitable dealer, compatible assets, an acceptable fixed quote, operational permission and a clearly understood repayment/collateral workflow. Our current prototype is a private bilateral repo-style agreement: dealer cash backs the quote, acceptance settles cash against pledged collateral, and the borrower repurchases for the agreed amount.

**What would stop them:** A fixed-rate premium, the current full-price early repayment policy, lack of dealer liquidity, unsupported tokens, custody/permission requirements, trust in the issuer/oracle/operator, integration effort and compliance review. Price falls can still cause a margin call or closeout.

## 4. Where to find them

- **Channels:** Canton ecosystem introductions, digital-asset treasury/collateral operations groups, relevant institutional events, and direct outreach to treasury leads.
- **Existing tools to investigate:** Wallet/custody services, internal treasury records, dealer RFQ channels and borrowing protocols. No particular tool stack has been confirmed with our target users.

**Three real discovery targets — not confirmed customers or partners:**

| Organization | Public basis for researching it | Discovery role |
| --- | --- | --- |
| [QCP](https://www.qcpgroup.com/) | Publicly offers institutional digital-asset trading, investment solutions and asset management. | Investigate treasury budgeting needs and potential borrower/dealer introductions. |
| [G-20 Group](https://g20.group/) | Publicly describes digital-asset liquidity and treasury-management services. | Investigate financing operations and counterparty fit. |
| [Cumberland DRW](https://www.cumberland.io/) | Publicly provides institutional cryptoasset liquidity. | Potential dealer-side interview or ecosystem introduction. |

[Circle's USDCx announcement](https://www.circle.com/blog/usdcx-on-canton-now-available-via-circle-xreserve) names QCP, G20 and Cumberland DRW among launch participants. That does not prove current holdings, use of floating-rate borrowing, appetite for our product or a relationship with Symbolon. We still need a verified list of smaller funds matching the primary borrower profile; the organizations above are ecosystem discovery leads, not proof of that list.

## 5. Who is NOT our customer for now

- Retail users seeking unsecured loans or a guaranteed yield product.
- Users seeking the lowest possible spot borrowing rate rather than a known contractual repayment amount.
- Borrowers requiring automatic refinancing, cross-chain collateral or pooled lending; those features are not implemented.
- Institutions requiring a production-ready, audited real-asset service immediately. Current execution uses simulated holdings; official cBTC/USDCx adapters and production review remain open.

## Checklist

- [x] Specific user, buyer and financing counterparty identified.
- [x] Pain and job to be done stated from the user's perspective.
- [x] Discovery channels and real ecosystem leads named.
- [ ] Primary borrower prospects, pain and willingness to switch verified through interviews.
- [x] Initial exclusions and adoption barriers explicit.
