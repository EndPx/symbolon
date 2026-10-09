# Public evidence for fixed financing and controlled disclosure

Verified on 9 October 2026. This brief supports Symbolon's GitBook and pitch. It is external context, not evidence of Symbolon customer adoption. Historical observations below are not current market quotes.

## Recommended claims

| Topic | Supported statement | Evidence and scope | Use |
| --- | --- | --- | --- |
| Why rates can move | Aave borrowing rates respond to pool utilization and governance parameters. | Official Aave borrowing documentation, accessed 9 October 2026. | Explain the mechanism before presenting a financing example. |
| Historical rate pressure | Onchain stablecoin borrow rates exceeded 15% during the March 2024 upswing. | Galaxy Research, 14 April 2025, pp. 22–23; selected Ethereum markets. | A dated historical callout, not a daily volatility statistic. |
| Debt and health | Increasing borrow value can reduce health factor even when collateral value is unchanged. | Aave's documented health-factor formula divides adjusted collateral value by borrow value. | Explain an interest-related risk channel; do not claim it caused a particular share of liquidations. |
| Privacy in institutional workflows | A Canton pilot demonstrated permissioned data views across connected financial applications. | The November–December 2023 pilot involved 45 firms, 22 applications and over 350 simulated transactions; the report describes each participant seeing its relevant permissioned subset. | Infrastructure and industry context, not a privacy-demand survey or Symbolon validation. |

## Primary sources

### Aave: variable-rate mechanism

- [Borrow Tokens](https://aave.com/help/borrowing/borrow-tokens): utilization and governance parameters determine borrowing rates; interest starts accruing on borrowing.
- [Health Factor & Liquidations](https://aave.com/help/borrowing/liquidations): adjusted collateral value divided by total borrow value; liquidation eligibility can result from collateral losing value or borrow value increasing.

The inference for Symbolon is that later rate changes can change the interest expense a borrower must plan for. This does not establish that fixed financing is always cheaper. Aave and Symbolon use different collateral and closeout mechanisms.

### Galaxy Research: historical stablecoin borrowing rates

- [The State of Crypto Lending, 14 April 2025](https://www.galaxy.com/insights/research/the-state-of-crypto-lending).
- [Report PDF, pp. 22–23](https://assets.ctfassets.net/h62aj7eo1csj/4vkA9567QmK4pyYoPBtrQa/fb039fd97d657d8151dcf4d3e969e481/The_State_of_Crypto_Lending_-_Galaxy_Research.pdf#page=22).

The chart sample is weighted weekly USDC/USDT rates on Aave V2/V3 and Compound V2/V3, Ethereum mainnet, through 31 March 2025. Use borrow-rate terminology, not daily percentage changes or realized lender APY. Do not reconstruct an exact daily series from chart pixels.

### Canton / Digital Asset: privacy-preserving financial connectivity

- [Digital Asset pilot announcement, 12 March 2024](https://blog.digitalasset.com/press-release/the-canton-network-completes-the-most-comprehensive-blockchain-pilot-to-date-for-tokenized-real-world-assets).
- [Connected capital markets take flight: pilot report](https://www.canton.network/hubfs/Canton%20Network%20Files/Images/Pilot%20Program/Canton%20Network%20Pilot%20Report-1548ed.pdf): pp. 2–5 give the pilot dates, scale and simulated scope; p. 29 describes permissioned views.

The report concerns infrastructure testing by industry participants. It does not demonstrate willingness to buy Symbolon, anonymity, legal compliance for Symbolon, or production readiness of its token adapters.

## Ready-to-use GitBook copy

### Why fixed rate?

You can know today's borrowing rate and still be uncertain about the final interest bill. Aave documents that borrowing rates change with utilization and governance parameters. A borrower keeping a position open must budget for the rates that apply later, too. [Source: Aave](https://aave.com/help/borrowing/borrow-tokens).

**A historical example:** Onchain stablecoin borrow rates exceeded 15% during the March 2024 upswing. Historical selected Ethereum markets; not today's quote. [Source: Galaxy Research, pp. 22–23](https://assets.ctfassets.net/h62aj7eo1csj/4vkA9567QmK4pyYoPBtrQa/fb039fd97d657d8151dcf4d3e969e481/The_State_of_Crypto_Lending_-_Galaxy_Research.pdf#page=22).

In Symbolon, the borrower compares lender offers and accepts a fixed annualized rate, term and contractual repayment before settlement. Later market-rate changes do not reprice that accepted agreement. Collateral value, margin obligations, maturity and network fees still need attention.

### Why privacy matters

A financing request tells counterparties how much cash a borrower needs and which assets it can pledge. A lender's quote reveals its pricing. Those details can be commercially sensitive even when the parties want a shared settlement record.

Canton provides a relevant precedent: an industry pilot spanning 45 firms and 22 applications completed over 350 simulated transactions with permissioned views of relevant data. The lesson is controlled disclosure across a financial workflow, not total secrecy. [Source: Canton pilot report, pp. 2–5 and 29](https://www.canton.network/hubfs/Canton%20Network%20Files/Images/Pilot%20Program/Canton%20Network%20Pilot%20Report-1548ed.pdf).

For Symbolon, the borrower approves sharing its request with eligible registered lenders. Each quote remains between that lender and the borrower; the resulting position is shared with the borrower and winning lender. Issuers and hosting operators remain trust dependencies.

## Pitch-ready wording and footnotes

**Problem slide headline:** “A rate you see today is not necessarily the financing cost you will repay.”

**Historical evidence callout:** “Onchain stablecoin borrowing rates exceeded 15% during the March 2024 upswing.”

**Footnote:** Galaxy Research, 14 Apr 2025, pp. 22–23. Historical weighted weekly USDC/USDT rates on selected Ethereum markets, through 31 Mar 2025.

**Privacy slide headline:** “Compare lender offers without exposing every negotiated quote to competing lenders.”

**Context callout:** “Canton's 2023 pilot connected 45 firms and 22 applications in 350+ simulated transactions with permissioned data views.”

**Footnote:** Digital Asset, Canton Network Pilot Report, pp. 2–5, 29; pilot Nov–Dec 2023, announcement 12 Mar 2024. Infrastructure evidence; not Symbolon adoption.

Keep the team's own informal borrower interview separate from these public facts. It is one human problem signal, not a representative market survey.

## Visualization that does not invent market data

Use a two-part page: a dated historical evidence card, then an explicitly illustrative repayment example. Do not draw a fabricated historical line and label it Aave data.

For a simple teaching example, User A borrows 1,000 units for 60 days. The table uses simple interest and ACT/360 solely to isolate changes in rate. It does not simulate Aave's compounding or exact accrual mechanics.

| Illustrative scenario | Rate assumption | Interest after 60 days |
| --- | --- | ---: |
| Floating rate stays lower | 5% for all 60 days | 8.33 |
| Floating rate increases | 5% for 30 days, then 15% for 30 days | 16.67 |
| Accepted fixed offer | 7% for all 60 days | 11.67 |

The fixed amount is predictable in both floating scenarios. It is cheaper in the second scenario and more expensive in the first. Figures are rounded to two decimals, exclude fees, and are hypothetical—not promises or historical outcomes.

## Claims to exclude

- “78%+ daily rate swing” and protocol-specific daily volatility percentages without a reproducible dataset, date range and definition of relative change versus percentage points.
- “80% of liquidations are rate-driven.” The reviewed primary sources do not establish that statistic.
- Survey percentages such as 67%, 75% or 60% attributed to Symbolon without its own documented sample and method.
- The pilot's 100% interoperability response as a privacy-preference result. It measures a different question and does not disclose a respondent denominator in the reviewed figure.
- “Fixed rates eliminate liquidation,” “set and forget,” “guaranteed cheaper,” or automatic compliance claims.
- An Aave risk-curve parameter (for example, slope1) presented as an observed live borrowing rate.
