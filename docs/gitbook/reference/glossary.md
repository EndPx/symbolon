# Glossary

| Term | Meaning in Symbolon |
| --- | --- |
| Active contract set (ACS) | Contracts that remain active and are visible within an authorized party view. It is not a public list of every trade. |
| Annualized rate | Simple interest rate expressed per year; `0.05` denotes 5%. Symbolon uses term days divided by 360. |
| Atomic transaction | A transaction whose effects commit together or do not commit; it does not promise that funding or a valid price is always available. |
| Borrower | Party that receives the cash purchase price and agrees to repurchase the collateral. |
| Cash instrument | The issuer/instrument identity in which the opening and closing cash legs settle. |
| ClosedRepo | Receipt recording repurchase, health-factor liquidation or maturity default within the demo model. |
| Collateral | Asset transferred to the dealer under the repo, subject to the position's restrictions and return workflow. |
| Contract ID | Identifier for one contract instance. Consuming and recreating a state changes its ID. |
| Controller | Party or parties that must authorize a specific Daml choice. |
| Coverage | Current collateral value divided by the value required by the position's threshold. |
| Cure deadline | Ledger time after which an unresolved margin call may be liquidated if a post-cure agreed mark still proves health factor below `1.00`. |
| Dealer | Financing counterparty that quotes a rate, pays the purchase price and manages collateral exposure. |
| Defaultable | At maturity, the dealer may declare default for missed repurchase. An expired cure window instead permits health-factor liquidation under additional mark checks. |
| Health factor | Current collateral value divided by `cash amount × margin threshold`. At `1.00` the agreed margin is exactly covered. |
| DemoAsset | Test holding model used to exercise transfers and restrictions without claiming a production token integration. |
| Feed freshness | Whether a price timestamp is valid under the agreed age limit and is not in the future. It does not establish market accuracy. |
| Holding | A quantity of one issuer/instrument owned by a party, with applicable viewers and locks. |
| Instrument identity | Issuer party together with instrument text. Identical symbols from different issuers are distinct. |
| Liquidation | Dealer-led demo closeout after an expired margin call when a post-cure agreed mark still proves health factor below `1.00`; pledged collateral transfers to the dealer without a sale. |
| Lock party | Additional authority required by the demo asset model before a restricted holding can move. |
| Margin call | Dealer action that establishes a cure deadline after the ledger verifies a collateral shortfall. |
| Margin threshold | Required collateral value relative to cash principal; `1.05` means 105%. |
| Maturity | Ledger acceptance time plus the agreed term in whole days. |
| Observer | Party entitled to see a contract; observation alone is not permission to spend an asset. |
| Oracle | Party publishing a price for an identified collateral/cash pair. The prototype uses manually controlled simulated marks. |
| Participant | Node that hosts parties, processes their ledger activity and exposes authorized APIs. |
| Party | Ledger identity used in contract authorization and visibility. A party is distinct from its hosting node or a browser account. |
| PriceFeed | Versioned contract containing oracle identity, asset pair, price, timestamp and readers. |
| Purchase price | Cash transferred from dealer to borrower at opening settlement. |
| Quote | Dealer's proposed rate and validity period for a particular RFQ, with reserved demo funding. |
| Repurchase | Closing exchange of the full agreed cash amount for the pledged collateral. |
| Repurchase price | Stored purchase price plus fixed term interest. Early repurchase does not reduce it. |
| Repo | Agreement represented here as an asset sale and a commitment to repurchase at a fixed price on agreed terms. |
| RFQ | Request for quote; Symbolon creates a separate request for each dealer. |
| Signatory | Party whose authority is required to create a contract and whose authorization participates in its choices. |
| Substitution | Replacement of pledged collateral with dealer-approved collateral while retaining the repo's economic terms. |
| Synchronizer | Canton infrastructure that supports coordination of participants' transactions. |
| Tenor | Agreed duration of the repo, represented as whole `termDays`. |
| Title transfer | Change of ownership recorded for the demo holding; not a legal conclusion about an external underlying asset. |
| Top-up | Borrower's contribution of additional collateral sufficient to restore required coverage. |
| Wallet transport | Client route that sends ledger requests through the connected wallet integration. |
| Witness | Party entitled to learn about an action and relevant transaction consequences under the ledger privacy model. |

CBT, pooled vaults and public order-book matching belong to other product models; they are not names for Symbolon's current components.
