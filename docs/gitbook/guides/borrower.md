---
description: Request financing, compare fixed-rate offers and know the amount you must repay.
---
# Borrowers

Borrowers receive cash against collateral and agree to repay a fixed amount to recover that collateral. The lender's funded offer supplies the APR and exact repayment; sending a request does not create an offer or transfer assets.

## Prerequisites

- A connected account using the intended borrower party.
- Available collateral from the issuer named by the market.
- At least one registered lender in the same market.
- An agreed price source and collateral terms you understand.

## Quick Start

1. **Open Borrow.** Select the market, enter cash amount and duration, and check required collateral.
2. **Review the audience.** All registered lenders for that exact market receive separate requests. The review lists the recipients and asks for sharing consent.
3. **Send the request.** After the ledger confirms it, Offers shows requests awaiting lender quotes. No automatic APR is assigned.
4. **Compare offers.** Review lender, APR, term interest, total repayment, expiry and collateral terms.
5. **Accept and settle.** Accept one funded offer. Cash and collateral exchange together; an open position appears after confirmation.
6. **Manage and repay.** Monitor health, address any margin call and pay the full agreed amount before the applicable deadline.

## Example: borrow 1,000 for 30 days

At a simulated 60,000 price and 150% initial cover, the form requires **0.0250 cBTC-demo** for **1,000 USDCx-demo**. Blair offers 7% APR; Casey offers 7.5%.

| Lender | APR | Approximate repayment |
| --- | --- | --- |
| Blair | 7% | 1,005.83 USDCx-demo |
| Casey | 7.5% | 1,006.25 USDCx-demo |

Alex reviews Blair's full terms and accepts. Alex receives 1,000 cash; the collateral transfers to Blair and remains restricted under the position. Rates quoted in later requests do not change Alex's agreed repayment.

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

If you select Blair, separately reject unused offers or withdraw remaining requests. Other lenders' reservations do not automatically disappear when one offer settles.
