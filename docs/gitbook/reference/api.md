# Contract and Ledger API reference

This reference describes the current prototype model. The source of authority is `daml/Symbolon/Repo.daml` and `DemoAsset.daml`; the browser encodes it in `web/src/ledger/api.ts`, `symbolon.ts` and `app/actions.ts`. It is not an API for production token issuers.

## Template identifiers and JSON types

The client addresses templates by package name, for example `#symbolon:Symbolon.Repo:RepoPosition` and `#symbolon:Symbolon.DemoAsset:Holding`. Resolve package compatibility on the target participant before submission; a name is not an upgrade plan.

| Daml type | JSON representation |
| --- | --- |
| `Party`, `Text`, contract ID | String |
| `Decimal` | Decimal string, such as `"0.05"` |
| `Int` | Integer string, such as `"30"` |
| `Time` | Timestamp string |
| List | Array |
| `Active` | `{ "tag": "Active", "value": {} }` |
| `UnderCall deadline` | `{ "tag": "UnderCall", "value": "<timestamp>" }` |
| Closing outcome | JSON string `"Repurchased"`, `"Defaulted"`, or `"Liquidated"`; this all-nullary Daml type is an enum, not a `{tag, value}` object |

## Common repo terms

`QuoteRequest`, `RepoQuote` and `RepoPosition` carry these terms:

| Field | Type | Constraint or meaning |
| --- | --- | --- |
| `borrower`, `dealer` | Party | Must differ |
| `oracle` | Party | Agreed feed publisher |
| `collateralIssuer`, `cashIssuer` | Party | Asset identities |
| `collateralInstrument`, `cashInstrument` | Text | Nonempty |
| `collateralAmount`, `cashAmount` | Decimal | Positive |
| `termDays` | Int | 1–365 |
| `marginThresholdPct` | Decimal | 1.0–2.0; 1.05 means 105% |
| `cureSeconds` | Int | 1–604800 |
| `maxPriceAgeSeconds` | Int | 1–86400 |

These are prototype validation bounds, not calibrated production credit limits.

`RepoQuote` adds `rate : Decimal` in [0,1], `cashCid : ContractId Holding`, and `validUntil : Time`. `RepoPosition` adds `rate`, `repurchasePrice`, `pledgedCids`, `startTime`, `maturity`, and `status`. Its `termDays` is retained so the template can enforce the interest and maturity formulas.

## PriceFeed

Fields: `oracle : Party`, `instrumentIssuer : Party`, `instrument : Text`, `cashIssuer : Party`, `cashInstrument : Text`, `price : Decimal`, `asOf : Time`, `readers : [Party]`.

`SetPrice(newPrice : Decimal, at : Time) -> ContractId PriceFeed` is controlled by the oracle. Price must be positive; `at` must be no later than ledger time and no earlier than the previous timestamp. Creation alone does not reject every timestamp; consumers independently reject future or stale feeds.

## QuoteRequest choices

| Choice | Controller | Arguments | Return |
| --- | --- | --- | --- |
| `SubmitQuote` | Dealer | `rate : Decimal`, `validSeconds : Int`, `cashCid : ContractId Holding` | New RepoQuote ID |
| `WithdrawRequest` | Borrower | `{}` | Unit |
| `PassRequest` | Dealer | `{}` | Unit |

`validSeconds` is 1–86400. Funding input must be an exact-sized unlocked holding of the dealer and requested cash identity. The choice reserves it with a borrower lock. All three choices consume the RFQ.

## RepoQuote choices

| Choice | Controller | Arguments | Return |
| --- | --- | --- | --- |
| `AcceptQuote` | Borrower | `collateralCid : ContractId Holding`, `feedCid : ContractId PriceFeed` | New RepoPosition ID |
| `RevokeQuote` | Dealer | `{}` | Unit |
| `RejectQuote` | Borrower | `{}` | Unit |

Acceptance requires `ledgerTime < validUntil`; a quote is expired at equality. It checks the valid mark and initial margin, exact unlocked borrower collateral, and exact dealer cash reservation. Revoke/reject release the reserved cash to the dealer. There is no timer-triggered automatic release.

## RepoPosition choices

| Choice | Controller | Arguments | Return |
| --- | --- | --- | --- |
| `Repurchase` | Borrower | `cashCid : ContractId Holding` | ClosedRepo ID |
| `IssueMarginCall` | Dealer | `feedCid : ContractId PriceFeed` | Replacement RepoPosition ID |
| `ResolveMarginCall` | Borrower | `feedCid : ContractId PriceFeed` | Replacement active RepoPosition ID if health factor is at least `1.00` |
| `TopUpCollateral` | Borrower | `extraCid : ContractId Holding`, `extraQty : Decimal`, `feedCid : ContractId PriceFeed` | Replacement RepoPosition ID |
| `ProposeSubstitution` | Borrower | Replacement fields below | SubstitutionProposal ID; position remains active |
| `ExecuteSubstitution` | Borrower and dealer | Replacement fields below | Replacement RepoPosition ID |
| `Liquidate` | Dealer | `feedCid : ContractId PriceFeed` | ClosedRepo ID after expired cure and post-cure mark with health factor below `1.00` |
| `DeclareDefault` | Dealer | `{}` | ClosedRepo ID at maturity |

Replacement fields: `newIssuer : Party`, `newInstrument : Text`, `newQty : Decimal`, `newHoldingCid : ContractId Holding`, `newFeedCid : ContractId PriceFeed`.

`ProposeSubstitution` is nonconsuming; the normal client uses it before the dealer accepts the proposal. It requires exact unlocked replacement collateral, validates its mark and value, then reserves it with a dealer lock. `ExecuteSubstitution` expects that reservation and normally runs as a consequence of proposal acceptance rather than as a unilateral client command.

Margin call requires `Active`, time strictly before maturity, and health factor below `1.00`; the cure deadline is `min(maturity, now + cureSeconds)`. Repurchase, top-up, proposal and execution require that maturity and any open cure deadline have not passed. `ResolveMarginCall` requires an open call, time before maturity and health factor at least `1.00`. `Liquidate` requires an expired call, an agreed mark published at or after the cure deadline, and health factor still below `1.00`. `DeclareDefault` is permitted at or after maturity.

Repurchase requires an exact-sized unlocked cash holding equal to `repurchasePrice`. Top-up requires a positive exact quantity and sufficient final coverage. No partial repayment or accrued-only payoff choice exists.

## SubstitutionProposal

Fields: `borrower`, `dealer`, `posCid`, `newIssuer`, `newInstrument`, `newQty`, `newHoldingCid`, `newFeedCid`.

| Choice | Controller | Arguments | Result |
| --- | --- | --- | --- |
| `AcceptSubstitution` | Dealer | `{}` | Execute substitution on referenced position |
| `RejectSubstitution` | Dealer | `{}` | Release replacement holding to borrower |
| `WithdrawSubstitution` | Borrower | `{}` | Release replacement holding to borrower |

Acceptance checks that proposal counterparties match the fetched position. Rejection and withdrawal do not need the position to remain active, allowing refund after a stale proposal.

## ClosedRepo

Fields: `borrower`, `dealer`, `collateralIssuer`, `collateralInstrument`, `collateralAmount`, `cashIssuer`, `cashInstrument`, `repurchasePrice`, `outcome`, `closedAt`, optional `closeoutPrice`, and optional `closeoutHealthFactor`. The optional fields are present for `Liquidated` and null for other outcomes. No product choice is defined on the receipt. The model records a demo closeout, not realized sale proceeds or a general audit-history API.

## Holding choices

Fields: `issuer`, `owner`, `instrument`, `amount`, `viewers`, `lockParties`. Issuer is signatory; owner, viewers and lock parties are observers. Amount is positive, instrument nonempty, and a lock party cannot equal the owner.

| Choice | Arguments | Behavior |
| --- | --- | --- |
| `Transfer` | `to`, `qty`, `newViewers` | Transfers positive quantity, returns sent ID and optional change; sent holding is unlocked |
| `Reserve` | `to`, `qty`, `lockParty` | Creates reserved quantity with one lock party and optional change |
| `SetViewers` | `newViewers` | Replaces observer list on the holding |
| `Merge` | `otherCid` | Combines unlocked same-owner/issuer/instrument holdings |

All owner-controlled mutations require owner plus existing lock-party authority. Reserve cannot set its new owner as the lock party. Change from an existing locked holding keeps its existing restrictions. The issuer remains a trusted signatory with powers outside this owner-controlled workflow.

## Preparing an exact input

Before a bilateral action, merge compatible unlocked holdings as needed. If a holding is larger than the requested amount, exercise `Transfer` to the same owner for exactly that quantity with no extra viewers. Submit this owner-only preparation separately and read its resulting holding ID. Do not place that split underneath a bilateral exercise or combine it into a transaction that discloses its original amount to the counterparty.

## HTTP transport used by local and compatible wallet paths

| Method | Resource | Purpose |
| --- | --- | --- |
| GET | `/v2/state/ledger-end` | Obtain offset for a consistent active-contract read |
| POST | `/v2/state/active-contracts` | Read contracts visible for the authorized party at that offset |
| GET | `/v2/parties` | Local demo discovery; not a production party directory |
| POST | `/v2/commands/submit-and-wait` | Submit commands and wait for ledger result |

The reference client filters ACS by the current party using a wildcard identifier filter and flattens created events. Its direct HTTP command envelope uses a unique `commandId`, an explicitly configured `userId` only where supplied, and only the connected party in `actAs`/`readAs`. The PartyLayer route omits `userId`: the official [Canton 3.5 schema](https://docs.digitalasset.com/build/3.5/reference/json-api/openapi.html) allows the participant to derive it from an authenticated user token. If a client supplies an ID, it must identify the correct account. These fields do not grant authority: the transport and participant must authenticate and authorize the request.

Example exercise payload, with illustrative IDs:

```json
{
  "ExerciseCommand": {
    "templateId": "#symbolon:Symbolon.Repo:RepoQuote",
    "contractId": "<active-quote-id>",
    "choice": "AcceptQuote",
    "choiceArgument": {
      "collateralCid": "<exact-unlocked-collateral-id>",
      "feedCid": "<current-agreed-price-feed-id>"
    }
  }
}
```

## Grofty submission boundary

`Transport.submit` is an optional native wallet operation. When supplied, `LedgerApi.submit` uses it instead of the HTTP command endpoint. The dedicated Grofty transport sends the same command array through SDK `prepareExecuteAndWait` with a unique command ID and `readAs` restricted to the connected party. It sends no `actAs` or `userId`.

`SubmissionOptions` accepts `disclosedContracts`, `synchronizerId` and `packageIdSelectionPreference`. Every disclosed contract requires `templateId`, `contractId`, `createdEventBlob` and `synchronizerId`; unsupported option keys are rejected. Created-contract projection retains the blob and synchronizer fields when the source provides them. This context support does not automatically obtain missing contracts from another party.

The Grofty implementation checks for an executed transaction whose command ID matches and whose payload contains a nonempty update ID and valid completion offset. Its read adapter exposes only ledger end and own-party active contracts. See the [Grofty integration guide](../guides/grofty.md) for version/network guards, uncertain results and outstanding MainNet prerequisites.
