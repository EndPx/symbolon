# Rate, time, and amount conventions

## Annualized simple rate

Rates are decimal fractions: 5% is `0.05`. The contract calculates:

```text
P = cashAmount
r = rate
d = termDays

I = P × r × d / 360
R = P + I
```

`P` is the purchase price, `I` the term interest, and `R` the repurchase price. `termDays` is a positive whole number. Maturity is ledger acceptance time plus that many days. The contract does not implement a calendar with business-day adjustments, holidays, settlement lags, or different year bases.

Calling the rate ACT/360 describes the whole-day term divided by 360 in this prototype. It does not mean that closing early recalculates interest from actual elapsed time. A future day-count or early-termination policy would require a contract change.

## Example

| Term | Value |
| --- | ---: |
| Cash purchase price | 100,000 CUSD |
| Annualized rate | 0.05 |
| Tenor | 30 days |
| Interest | 416.666666… CUSD |
| Repurchase price | 100,416.666666… CUSD |

The exact Daml Decimal result is authoritative. The UI may format fewer decimal places for readability. Clients must submit a cash holding that satisfies the actual amount, not a rounded-down label. JSON Ledger API decimal values are encoded as strings; use the reference client helpers or explicit decimal strings.

## Coverage is separate from interest

```text
collateralValue = collateralAmount × price
requiredValue = cashAmount × marginThresholdPct
coverage = collateralValue / requiredValue
shortfall = max(0, requiredValue - collateralValue)
```

A threshold of `1.05` requires collateral value of at least 105% of the purchase price. With P=100,000, required value is 105,000. If value falls to 102,000, the shortfall is 3,000. At a valid price of 85 per unit, a same-asset top-up must supply enough units to restore at least 105,000 in total value.

The base is `cashAmount`, not `repurchasePrice`. This is the present contract policy; it does not assert that this is the correct economic risk model for every asset or tenor. A production risk review should assess interest exposure, liquidation costs, liquidity, concentration, and price gaps.

## Repurchase, maturity and default

The current model does not reduce the repurchase price for early payment or partial repayment. A borrower that wants a different term requests a new trade. No position renews automatically, and there is no late-interest calculation.

Ledger time determines contract checks. Browser countdowns can be imprecise or stale; the participant's execution result decides whether an action remains available. See [API reference](api.md) for exact comparison boundaries in the current contract.

## Fees

The repo model does not currently levy a Symbolon protocol fee. This does not imply zero wallet, network, hosting, token, or external asset costs. Those must be established for the selected network and asset adapter before displaying an all-in financing cost.
