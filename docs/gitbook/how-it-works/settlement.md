# Settlement and repurchase

## Opening exchange

`AcceptQuote` is the settlement action. It consumes a valid quote, transfers reserved cash to the borrower, transfers collateral title to the dealer under the position's restrictions, and creates `RepoPosition`. Daml transaction atomicity means these effects either commit together or fail together.

The settlement does not create a pool share or tradable lender token. It creates an agreement between the identified borrower and dealer. The current demo ledger records the dealer as the owner of the pledged holdings, while the lock mechanism prevents unilateral spending that would defeat the repurchase workflow.

| After successful acceptance | Borrower | Dealer |
| --- | --- | --- |
| Cash | Receives purchase price | Reserved cash is consumed by settlement |
| Collateral | No longer owner; retains relevant visibility and contractual authority | Holds title subject to position restrictions |
| Position | Sees and can perform borrower choices | Sees and can perform dealer choices |
| Future cash obligation | Full agreed repurchase price | Contractual receipt on successful repurchase |

The trusted demo issuer remains involved in holdings. This is not a production custody arrangement; see [asset adapters](../architecture/adapters.md).

## Closing exchange

Before maturity or an open cure deadline is reached, the borrower can exercise `Repurchase` with cash of the agreed issuer and instrument. The supplied holding must equal the stored repurchase price exactly. The cash moves to the dealer and every pledged holding moves back to the borrower without the position lock. The open position is consumed and a `ClosedRepo` receipt records the result.

Early repurchase uses the same full amount. It does not prorate interest down to the day of closing. A borrower should therefore use the displayed **repurchase price**, not infer a payoff from the elapsed number of days.

## Precision and cash fragmentation

An account can own several holdings of the same asset after previous transfers have created change. The browser may merge compatible unlocked holdings and split out the exact amount before submitting the final action. This preparation is separate from the atomic repo settlement and can require multiple commands.

All incoming asset holdings passed into a bilateral repo choice must be exact-sized and unlocked. Split an oversized holding in an owner-only transaction first. This keeps the original balance and change out of the counterparty's bilateral transaction view. The contract rejects both too-small and too-large inputs; sufficient aggregate balance alone is not the input format.

A displayed total must not combine unrelated issuers, locked holdings, and free holdings into one spendable balance. If the transaction cannot find a suitable holding, review asset identity and restrictions as well as the numeric total.

## Receipt meaning

The closing receipt records counterparties, collateral description, cash instrument, repurchase amount, outcome and time. It is a ledger record of this model's result. It is not a tax statement, bank confirmation, or legal opinion on the transfer of an underlying security.
