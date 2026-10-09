# Position Lifecycle

A position's state explains what happened and which action can follow. An OpenRequest stays active across independent nonconsuming quote submissions until withdrawn. Each funded quote then follows the bilateral lifecycle below; a submitted command, a funded quote and a settled position are different stages.

```mermaid
stateDiagram-v2
    [*] --> Requested
    Requested --> FundedOffer: Nonconsuming open quote reserves lender cash
    FundedOffer --> Active: Borrower accepts and settles
    Active --> UnderCall: Lender confirms fresh shortfall
    UnderCall --> Active: Coverage restored and call resolved
    Active --> Repurchased: Full agreed repayment
    UnderCall --> Repurchased: Repayment within the permitted window
    UnderCall --> Liquidated: Cure expired and fresh post-cure shortfall
    Active --> Defaulted: Missed maturity repayment
    UnderCall --> Defaulted: Missed maturity repayment
```

## Example: a successful repayment

Alex publishes an OpenRequest; Blair directly funds a private 7% offer; Alex accepts it. The position is Active. Alex pays the full agreed cash within the allowed window, collateral returns, and Activity records Repurchased.

## Closing outcomes compared

| Outcome | What happened | What it does not imply |
| --- | --- | --- |
| Repurchased | Full agreed repayment and collateral return committed. | A floating interest rebate. |
| Liquidated | A permitted post-cure shortfall closeout released pledged collateral to the lender. | A collateral auction or realized sale proceeds. |
| Defaulted | A permitted maturity-default closeout released pledged collateral to the lender. | That the cash repayment was received. |

**Example:** Activity showing Defaulted must not be interpreted as Blair receiving principal plus interest. The recorded outcome and collateral movement differ from Repurchased.

During any stage, an uncertain submission stays unresolved until its original receipt or failure is reconciled. Refreshing a page or dismissing a notification is not proof that a transaction committed.
