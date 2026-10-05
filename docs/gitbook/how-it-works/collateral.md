# Health factor, margin, and liquidation

## Checking coverage

The position compares collateral quantity multiplied by an agreed price with `cashAmount × marginThresholdPct`. Symbolon calls their ratio the **health factor**:

```text
health factor = collateral amount × agreed mark / (cash amount × margin threshold)
```

At `1.00`, the agreed margin is exactly covered; below `1.00`, the dealer may issue a margin call. A valid feed must refer to the agreed oracle, collateral identity and cash denomination. It must have a positive price, fall within the configured age window, and not claim a future timestamp. The UI previews the factor; the Daml choices repeat the comparison on the ledger.

A price that passes these structural checks is not necessarily an accurate market price. The oracle operator remains a trust dependency. The prototype oracle is manually controlled and every mark must be described as simulated.

## Margin call

The dealer can issue a margin call only when the current position is active, it is still within its permitted term, and the valid mark demonstrates a shortfall. A healthy position rejects the action. A successful call creates `UnderCall deadline`; the deadline is the earlier of maturity and ledger time plus the agreed cure duration.

The margin call is a command from the dealer. The browser's coverage meter does not trigger it automatically. A future risk agent would act under the dealer's authorization and would be subject to the same Daml checks.

## Top-up

The borrower supplies an additional unlocked holding of the same collateral identity and a positive quantity. The resulting total must restore required coverage under a valid mark. An insufficient contribution fails atomically rather than leaving the position partially cured. A successful top-up creates a replacement active position with the enlarged pledged holdings list.

If the mark recovers without a top-up, the borrower can exercise `ResolveMarginCall` with a fresh agreed feed. This is allowed after the cure deadline but before maturity, provided the health factor is at least `1.00`. A dealer cannot use that recovered mark to liquidate.

## Substitution

The borrower exercises the position's nonconsuming `ProposeSubstitution` choice with a new issuer/instrument, quantity, exact-sized unlocked holding, and matching feed. That action reserves the replacement holding under the dealer's lock and creates a bilateral proposal. The dealer accepts it to execute the exchange. Execution checks the replacement asset and value, transfers the replacement into the position, and returns the previous collateral in the same transaction. Rate, maturity, purchase price and repurchase price do not change.

A proposal does not reserve a price forever. By the time the dealer accepts, the position or feed may have changed, or the feed may be stale. Acceptance must fail if its inputs are no longer valid. The borrower can withdraw, or the dealer can reject, a proposal to release its replacement holding even if the referenced position is no longer active. Recreate the proposal from fresh state instead of treating old contract IDs as durable identifiers.

## Cure deadline, liquidation, and maturity default

Repurchase, top-up and substitution close when ledger time reaches maturity or an open cure deadline. An expired cure window does not by itself transfer collateral. For `Liquidate`, the position must still be under a margin call, the cure deadline must have passed, and an agreed oracle mark **published at or after that deadline** must still put the health factor below `1.00`. The dealer submits that choice; the receipt records the closeout mark and factor. A healthy position or a mark from before the deadline rejects liquidation. At maturity, the dealer has a separate `DeclareDefault` choice for missed repurchase.

Both closeout choices consume the position and release the pledged holdings to the dealer. There is no auction, open liquidator network, sale of collateral, surplus calculation, or deficiency claim in the demo. The contract result does not establish how an external agreement would require a dealer to realize collateral or account for its value. A fresh mark's structural validity does not prove its economic correctness; the oracle is trusted and multiple active feeds for one pair are possible.

## Example demo sequence

With 30 CETH marked at 100 and cash of 2,000, a 1.05 threshold requires value 2,100. The health factor is `3,000 / 2,100 = 1.43`. A simulated mark of 60 makes the 30 units worth 1,800, and the factor becomes `0.86`, enabling a call. Adding 5 CETH restores value to exactly 2,100 and the factor to `1.00`. If the borrower does not cure, and a fresh mark still proves a factor below `1.00` after the deadline, the dealer may liquidate. These values demonstrate contract arithmetic and state transitions; they are not proposed risk parameters for a real asset.
