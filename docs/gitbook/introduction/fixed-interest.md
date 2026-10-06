# Why Fixed-Rate

Symbolon fixes the repurchase amount when a quote is accepted. A borrower can therefore budget the cash required to recover collateral at the agreed maturity. A dealer can calculate the contractual cash inflow for that term. This is useful for a financing need with a known horizon; it is not a claim that fixed-rate borrowing is always cheaper.

## What is fixed

The accepted annualized rate, principal and tenor determine simple term interest:

```text
interest = purchasePrice × annualizedRate × termDays / 360
repurchasePrice = purchasePrice + interest
```

For 100,000 units, a 5% annualized rate and 30 days, interest is approximately 416.6666667 units. The contract retains its Daml Decimal amount. A display rounded to two places is a presentation choice; the settlement must satisfy the contract amount.

The rate does not compound within a position. It is an annualized simple rate under the prototype's ACT/360-style whole-day convention, not an APY promise. [Economics reference](../reference/economics.md) explains rounding, maturity and early repurchase.

## What remains variable

Collateral prices, coverage, financing availability for a future trade, external asset conditions, and the cost of obtaining repayment cash can all change. A fixed rate does not remove default, liquidity, issuer, oracle or operational risks. Nor does it give the borrower free termination: the current early-repurchase choice requires the full agreed repurchase price.

If a future version offers renewal, the renewed trade will require new terms and funding. The existing position does not roll over automatically.

## Why combine this with Canton

The product needs two properties at once: counterparties agree a predictable obligation, and parties that do not participate in the resulting repo are not automatically granted its business data. Daml expresses who authorizes each action and who can observe each contract. Canton executes those workflows across participating nodes with scoped transaction visibility. See Digital Asset's [privacy model](https://docs.digitalasset.com/overview/3.5/explanations/ledger-model/ledger-privacy.html).

These capabilities fit an RFQ workflow in which dealers may price the same borrower differently. Fixed-rate terms are useful on their own; Canton provides a way to combine them with controlled disclosure and atomic workflow execution. The [privacy chapter](privacy.md) explains why this matters to the intended user and where the prototype's guarantees end.
