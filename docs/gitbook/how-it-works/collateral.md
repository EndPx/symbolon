# Collateral and Health

A fixed repayment amount does not fix the collateral's value. Symbolon compares the current agreed mark with the position's maintenance requirement.

## Understand health factor

```text
Required collateral value = principal × maintenance cover
Health factor = collateral quantity × agreed price ÷ required value
```

At **1.00**, the agreed requirement is exactly covered. Below **1.00**, a valid fresh mark proves a shortfall. The app's green/amber display bands help reading; they do not change this contract boundary.

## Example: where can a margin call start?

Alex borrowed 1,000, with 105% maintenance cover and 0.0250 cBTC-demo pledged. Required value is 1,050. The threshold price is:

```text
Margin-call threshold = 1,050 ÷ 0.0250 = 42,000
```

| Simulated price | Collateral value | Health, approximately | Meaning |
| --- | --- | --- | --- |
| 60,000 | 1,500 | 1.43 | Covers the maintenance requirement. |
| 42,000 | 1,050 | 1.00 | Exactly on the boundary. |
| 36,000 | 900 | 0.86 | A fresh agreed mark can enable a margin call. |

Crossing 42,000 does not automatically liquidate the position. The lender must issue a margin call, the cure window must expire, and a fresh mark published at or after the cure deadline must still prove a shortfall.

## Restore coverage

The borrower can add valid collateral that restores the required margin, or propose a lender-approved substitution while the permitted window remains open.

**Example:** at 36,000, adding 0.0050 cBTC-demo makes the pledged quantity 0.0300. Its value becomes 1,080 and health becomes about 1.03. Financing rate and agreed repayment do not change.

## Expired prices and default

An expired agreed feed can show a neutral Last mark estimate, which is not current collateral health. Missing, invalid or future-dated prices show no usable estimate. Price-sensitive actions need a current valid mark.

Maturity default is separate from health-factor liquidation. The demo's permitted closeout releases pledged collateral to the lender; it does not model a collateral sale or surplus/deficiency accounting.
