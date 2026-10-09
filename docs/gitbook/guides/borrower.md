---
description: Request financing, compare fixed-rate offers and know the amount you must repay.
---


# Borrowers

Borrowers receive cash against collateral and agree to repay a fixed amount to recover that collateral. The lender's funded offer supplies the APR and exact repayment; sending a request does not create an offer or transfer assets.

## Prerequisites

- A connected account using the intended borrower party.
- Available collateral from the issuer named by the market.
- A supported market and compatible counterparties able to fund quotes.
- An agreed price source and collateral terms you understand.

## Quick Start

1. **Prepare the request terms.** Select the market, cash amount and duration, and check required collateral.
2. **Review publication consent.** Full borrower identity, cash amount, collateral quantity, tenor and financing rules will be readable by all authenticated connected Symbolon parties. Unauthenticated visitors get only the minimal four-field board.
3. **Sign and publish once.** Create the OpenRequest and publish its confirmed disclosure. This moves no cash or collateral and assigns no automatic APR.
4. **Receive private funded quotes in Offers.** Lenders can set APRs directly with their own existing cash; you do not approve each lender or need to stay online for quote creation.
5. **Compare and accept offers.** Review the lender, APR, interest, full repayment, expiry and collateral terms. Acceptance of one funded offer exchanges cash and collateral together.
6. **Manage and repay.** Monitor health, address any margin call and pay the full agreed amount before the applicable deadline.

## Example: borrow 1,000 for 30 days

At a simulated 60,000 price and 150% initial cover, the form requires **0.0250 cBTC-demo** for **1,000 USDCx**. After Alex publishes the full request, Blair directly funds 7% APR and Casey directly funds 7.5% APR.

| Lender | APR | Approximate repayment |
| --- | --- | --- |
| Blair | 7% | 1,005.83 USDCx |
| Casey | 7.5% | 1,006.25 USDCx |

Alex reviews Blair's full terms and accepts. Alex receives 1,000 cash; the collateral transfers to Blair and remains restricted under the position. Rates quoted in later requests do not change Alex's agreed repayment.

For the simulated public reference, refresh a stale mark in offer review before acceptance. Other price sources still need their authorized publisher. A current timestamp does not establish a real-market price.

## Understand your position

| Field | What to read |
| --- | --- |
| Fixed rate | The accepted annualized APR. |
| Repayment | The contractual full amount, not a live floating debt forecast. |
| Maturity | The due time, with the app's displayed timezone. |
| Health | Current collateral value relative to the agreed maintenance requirement. |
| Price status | Whether health uses a current mark, an expired last mark, or has no usable price. |

**Example:** with 105% maintenance cover, 1,000 principal requires 1,050 collateral value. At 60,000, 0.0250 collateral is worth 1,500 and health is about 1.43. A price below 42,000 can enable a margin call when a valid fresh mark confirms it.

## Repay or restore collateral

Use Position Details to review repayment or add collateral. Paying early still costs the full agreed amount. A lender-approved substitution can replace collateral without changing financing terms. A proposal alone does not release the existing collateral.

After selecting Blair, confirm the actual acceptance/request-withdrawal result and inspect remaining offers. The app can reject other known linked active offers in the same submission; unrelated or unknown core offers retain their own lifecycle. Withdrawal alone stops new quotes, not existing cash reservations. Closed request history is in the collapsed Archive section of Offers. Other lenders' reservations do not automatically disappear when one offer settles.
