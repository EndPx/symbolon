# Product overview

Symbolon is a browser-based private fixed-rate bilateral repo desk. Its main value is a known contractual principal-plus-interest repayment amount: a borrower accepts a dealer's fixed annualized quote instead of leaving that agreement's interest exposed to later floating-rate changes. Proposed initial users are digital-asset fund treasury operators with Canton asset exposure or an adoption plan, plus dealers supplying financing capital. Customer demand and willingness to accept a fixed-rate premium have not yet been established through interviews.

## A trade with two counterparties

The borrower chooses a cash amount, collateral quantity, term, oracle, coverage requirement, and cure window. Each selected dealer receives a separate request. A dealer can decline or respond with a rate and quote expiry. The borrower accepts one available quote, creating a repo position on Canton.

Maturity is configurable within the current contract range of 1–365 whole days. Fixed rate and bilateral privacy define the workflow; the example tenors do not restrict the intended product to one funding horizon.

There is no public order book, algorithm that matches unrelated users, or pooled deposit market. A dealer's quote is for the requesting borrower. This lets the contract model preserve counterparty-specific terms without needing a global trade feed.

## The work continues after settlement

Settlement is the beginning of collateral management. The dealer can submit a margin call when a valid agreed price feed shows a shortfall. The borrower can add collateral or propose an eligible substitute. Both parties retain the same rate and maturity through these updates. Repurchase returns collateral against the agreed cash amount; default records the alternative outcome when a contractual deadline has been reached.

| Role | Main job | What Symbolon makes explicit |
| --- | --- | --- |
| Borrower | Raise temporary cash and recover collateral | Competing private quotes, due amount, deadlines, and actions |
| Dealer | Price financing and manage collateral exposure | Funding availability, collateral coverage, cure status, and closure |
| Oracle operator | Publish a price for an identified instrument pair | Identity, price, timestamp, and parties entitled to read it |
| Demo issuer | Create test holdings | Issuer identity and the simulated asset boundary |

## What the prototype proves

The prototype supplies an executable Daml model and a browser client for that model. It is intended to demonstrate authorization, atomic transfers, collateral state changes, and party-specific views. Actual cash financing additionally requires supported token contracts, suitable operational controls, accepted valuation, and agreements outside this demo.

Read [features and boundaries](features.md) before interpreting screenshots or test data as live financial activity.
