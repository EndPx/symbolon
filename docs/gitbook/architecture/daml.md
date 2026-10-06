# Daml contract model

The core package is `symbolon-v2` version `0.2.0`, built with Daml SDK `3.5.2`. `Symbolon.DemoAsset` supplies holdings. `Symbolon.Repo` supplies price feeds, requests, quotes, positions, substitution proposals and receipts. The test and live packages depend on the built core DAR.

## Templates and authority

| Template | Signatories | Additional direct observers | Primary purpose |
| --- | --- | --- | --- |
| `Holding` | Issuer | Owner, viewers, lock parties | Demo asset quantity and restrictions |
| `PriceFeed` | Oracle | Readers | Identified pair, price and timestamp |
| `QuoteRequest` | Borrower | Dealer | Private proposed terms |
| `RepoQuote` | Borrower and dealer | None required beyond signatories | Rate, expiry and reserved funding |
| `RepoPosition` | Borrower and dealer | None required beyond signatories | Active repo state |
| `SubstitutionProposal` | Borrower and dealer | None required beyond signatories | Reserved replacement and approval path |
| `ClosedRepo` | Borrower and dealer | None required beyond signatories | Closing receipt |

The oracle is not a stakeholder of `RepoPosition` merely because its party is named as the agreed oracle. The issuer's role in holdings is separate from the repo's stakeholders. See the [privacy matrix](privacy-and-trust.md) for transaction-witness and operator qualifications.

## Authorization composition

`SubmitQuote` runs under the dealer's controller authority and the RFQ borrower's signatory authority. It can therefore create a quote signed by both and reserve cash with a borrower lock. `AcceptQuote` inherits both quote signatories and the borrower's exercised authority, enabling the two asset legs and creation of the jointly signed position.

The position's choices use the same principle. A borrower can trigger an agreed repurchase without obtaining a fresh interactive dealer signature because the jointly signed position already defines that action. This is contractual delegation, not permission for the UI to submit `actAs` another party.

## Asset preparation and locks

`exactAvailable` checks owner, issuer, instrument, exact amount and absence of locks. `exactReserved` checks the same identity plus one expected lock party. These helpers run at the relevant entry and exit paths.

Incoming holdings must be prepared in an owner-only transaction. A transfer to self splits out exactly the amount needed and leaves change outside the bilateral transaction. A quote then reserves dealer cash under the borrower's lock. Settlement reserves dealer-owned collateral under the borrower's lock. A substitution proposal reserves borrower-owned replacement collateral under the dealer's lock until accepted or released.

Holding owner-controlled mutation requires both owner and existing lock parties. `Merge` requires unlocked holdings of matching owner, issuer and instrument. This prevents a trader from bypassing a reservation through transfer, a new reservation, visibility changes or consolidation. The issuer's trusted powers remain a limitation.

## State and invariants

`RepoPosition` retains the term, stored repurchase amount, original time, maturity and a list of pledged holding IDs. Its template invariant checks that the repurchase price equals ACT/360 term arithmetic and that maturity equals start time plus term days. Common terms constrain positive quantities, distinct counterparties, named instruments, bounded tenor, rate, coverage, cure duration and feed age.

The position state is either `Active` or `UnderCall deadline`. A margin call consumes the active version. Top-up, substitution and a recovered mark can produce a new active version. The health factor is `collateralAmount × price / (cashAmount × marginThresholdPct)`; a value below `1.00` is below the agreed margin. A dealer can liquidate only after the cure deadline with a matching mark published at or after that deadline that still proves a factor below `1.00`. `DeclareDefault` is separately available at maturity. `releaseCollateral` fetches every pledged holding, checks the aggregate quantity and each expected reservation, then releases them to the borrower or dealer according to the closing outcome.

## Price checks

`checkedPrice` validates the exact oracle and asset pair, a nonfuture timestamp, a timestamp no older than the configured maximum, and a positive price. Acceptance, margin calls, top-ups, recovered-call resolution, substitution and liquidation use that shared function. `SetPrice` also prevents timestamps from moving backward. Liquidation adds the post-cure publication check.

The model has no uniqueness key forcing one active feed per pair. An oracle can create multiple feeds. Clients must identify an appropriate current feed and the oracle remains trusted; structural validation cannot select an economically honest mark on its own.

## Consuming versus nonconsuming

Most choices consume the contract on which they act. `ProposeSubstitution` is nonconsuming so creating a proposal does not itself replace the position. It does reserve the replacement asset. Acceptance later consumes the position through `ExecuteSubstitution`; rejection or withdrawal can refund the reserve without fetching a stale position.

Full field and choice schemas are in the [API reference](../reference/api.md). Negative behavior is mapped to tests in [security validation](security.md).
