# Asset and price adapters

The repo workflow depends on assets that can participate in atomic transfers and on a price source agreed by the counterparties. The demo keeps those dependencies small so the lifecycle can be exercised locally. Replacing them is substantive integration work, not just changing a ticker label.

## Demo asset identity

`DemoAsset.Holding` records an issuer, owner, instrument, amount, viewers and position-related locks. Asset identity is the pair of issuer and instrument. This prevents a holding with the same text symbol but a different issuer from satisfying a cash or collateral obligation.

The issuer remains trusted and the recipient does not undergo a production token acceptance or eligibility procedure. The demo does not provide external reserves, a redemption right, custodian attestation or a real token registry. Its transfer/lock mechanism exists to test atomic repo behavior.

## Locking and title

A quote reserves cash; an active repo restricts collateral; successful repurchase and default release the relevant restrictions. These states must be distinct from merely adding another party as an observer. Visibility lets a counterparty verify data. A lock requires the additional authority needed to move a restricted holding.

Integration must preserve both concepts. Otherwise a UI may display a funded quote while the dealer can spend its cash, or a borrower may believe collateral can be recovered after the dealer has moved it elsewhere.

## A production token adapter must resolve

1. Which official package and version defines the instrument, registry and transfer choices?
2. Who is the instrument administrator, issuer, owner, custodian and authorized recipient?
3. Does transfer require offer/accept, choice context, disclosed contracts, fees, or external signing?
4. Can the cash and collateral legs commit in the same transaction and supported synchronizer context?
5. How are reservation, release, cancellation, expiry and concurrent consumption represented?
6. Which parties see the instrument holdings and transaction consequences?
7. What happens under freeze, issuer action, unavailable context, or failed eligibility?

Use node-compatible official token packages. Do not substitute a self-built package with similar names and describe it as the supported network token. Actual package IDs and choice context must be verified against the participant where the demo runs.

## PriceFeed

A feed identifies its oracle, collateral issuer/instrument, cash issuer/instrument, positive price, timestamp and readers. The price is expressed in units of the named cash instrument per unit of the named collateral instrument. An agreed maximum age is part of the repo terms.

Updating a feed consumes the old contract and creates a new version. References to the old contract can fail because it is inactive. Freshness checks also reject an active but too-old mark, while future timestamps are invalid. Neither behavior creates a globally unique registry of feeds; clients should select the correct active feed by the full identity and agreed oracle.

## Operational questions before real assets

Define market hours, stale-price behavior, outage escalation, valuation sources, valuation currency, asset-specific haircuts, and conflict handling. For assets with off-ledger settlement or redemption restrictions, verify the entire path under stress. A timestamp check is necessary evidence about recency, not evidence of executable market liquidity.

No real CIP-56/cBTC adapter is claimed by this documentation. cBTC and Gold's own-node route are deferred. The Grofty adapter remains in source but is outside the active submission; neither wallet support nor demo holdings replace the token work described here. The active challenge work is the [BitSafe Contribution Pool LocalNet path](../mission/challenges.md).

## Grofty assets and bridge boundary

The [Grofty transport](../guides/grofty.md) signs Daml commands for its connected party. Its ability to show or transfer real CC/USDCx does not make those tokens interchangeable with `DemoAsset.Holding`. The current repo choices explicitly consume demo holdings, not a wallet balance abstraction.

An inbound bridge may fund a supported Canton asset through a separate route with its own destination, fees and completion state. That receipt does not mint CUSD/CETH demo holdings, create issuer authority, deploy the repo package, or implement atomic repo settlement. Transfer preapproval and bridge onboarding are also separate from dApp connection consent. The prototype contains no native bridge integration or qualifying bridge evidence.

The submission boundary can carry disclosed contracts with their template ID, contract ID, created-event blob and synchronizer ID. Keeping those fields intact is necessary preparation capability, not proof of a tested cross-participant asset path. A production adapter must establish the correct transfer context and controlled disclosure for both settlement legs.
