# Settlement and Repayment

Acceptance is the point at which financing opens. The ledger checks the quote, asset identities, collateral and agreed mark before committing the cash and collateral movements together.

## What moves at settlement?

| Asset or record | Before acceptance | After confirmed acceptance |
| --- | --- | --- |
| Lender cash | Reserved for the offer. | Transferred to the borrower. |
| Borrower collateral | Available to the borrower. | Title transfers to the lender, restricted under the position. |
| Position | No settled repo from this offer. | Repayment, maturity and collateral terms are recorded. |

## Example: opening the repo

Alex accepts Blair's 7% APR offer for 1,000 USDCx-demo over 30 days. Alex receives 1,000 cash. The agreed 0.0250 cBTC-demo moves to Blair under locks, and a position records the fixed repayment and maturity.

If the quote expired or the agreed mark is unusable, acceptance fails rather than partially transferring one side.

## Calculate the agreed repayment

```text
Term interest ≈ principal × annualized APR × term days ÷ 360
Repayment = principal + agreed term interest
```

For this example, 1,000 × 7% × 30 ÷ 360 is approximately 5.83 interest. The exact ledger amount follows Numeric 10 rounding and the contract's operation order; the review dialog displays it before acceptance.

## Repay and recover collateral

The borrower pays the full agreed amount using compatible cash before the applicable deadline. The ledger transfers that cash to the lender, returns the pledged collateral and records Repurchased.

**Example:** paying approximately 1,005.83 returns Alex's pledged 0.0250 cBTC-demo. Paying on day 10 still requires the full contractual amount; interest is not recalculated for ten days.

Maturity and an open cure deadline can close the ordinary repayment window. Network fees remain separate from contractual principal plus interest.
