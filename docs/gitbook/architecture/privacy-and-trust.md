# Privacy and Visibility

Symbolon uses **open requests and private quotes**. The borrower consents once to publish full request terms to authenticated Symbolon parties. Lenders can then set their APR directly, while each funded quote and settled position stays between its financial counterparties.

## What Each Audience Can See

| Information | Without login | Authenticated connected parties | Financial counterparties |
| --- | --- | --- | --- |
| Random listing ID, supported market/pair, open state and date | Minimal board view. | Visible. | Visible. |
| Borrower party identity, cash amount, collateral quantity, tenor and financing rules | Not included in the minimal view. | Visible after the borrower's publication consent. | Also visible as request terms. |
| OpenRequest contract disclosure needed to quote | Not included. | Available through the authenticated quote context for an active request. | Publication does not make other contracts public. |
| A lender's APR, funded quote, expiry and quote ID | No access from discovery. | No access solely from reading the request. | Borrower and that lender. |
| Accepted position, repayment management and closing record | No access from discovery. | No access solely from reading the request. | Borrower and winning lender under core contract rights. |

Reading the minimal board does not require login. Pricing and financial actions require a compatible connected account with live CanActAs authority. Server response fields and party checks are the boundary; hiding fields in the UI is insufficient.

## Example: One Request, Two Private Rates

Alex publishes a request for 1,000 USDCx over 30 days against 0.0250 cBTC-demo. After the one-time disclosure consent, Blair and Casey can both read Alex's identity and full financing terms when authenticated. Neither needs to register or ask Alex for detail access.

Blair funds a 7% quote; Casey funds a 7.5% quote. Alex can compare both. Blair sees Blair's quote and Casey sees Casey's quote. The public request does not expose competing APRs or Alex's eventual position with Blair.

![One published request and separate private funded quotes](../assets/privacy-map.png)

## Contract Visibility in the Daml Model

The matrix assumes distinct parties in each role. **S** and **O** are declared ledger roles. **D*** denotes the OpenRequest payload intentionally disclosed by publication to authenticated Symbolon users; it is not an observer declaration.

| Contract | Asset issuer | Borrower | Addressed / winning lender | Oracle | Unrelated party |
| --- | :---: | :---: | :---: | :---: | :---: |
| `OpenRequest` | D* | S | D* | D* | D* |
| `Holding` | S | O* | O* | O* | — |
| `PriceFeed` | O* | O* | O* | S | — |
| `QuoteRequest` | — | S | O | — | — |
| `RepoQuote` | — | S | S | — | — |
| `RepoPosition` | — | S | S | — | — |
| `SubstitutionProposal` | — | S | S | — | — |
| `ClosedRepo` | — | S | S | — | — |

**S** = signatory; **O** = observer; **—** = no default visibility. **O*** applies only if the party is the Holding owner, a configured viewer/lock party, or a PriceFeed reader. **D*** requires authenticated application access to the borrower's published disclosure. OpenRequest declares only the borrower as signatory and no observers; that default does not make the request confidential after its payload is published.

Choice controllers determine who can act. A Holding owner is an observer and controls owner choices together with required lock parties; a viewer alone has no spending authority. Reading an OpenRequest disclosure does not grant borrower authority. The quoting lender supplies its own CanActAs rights and compatible existing cash.

Overlapping roles receive the union of their rights. The public test operator combines issuer, lender and oracle roles. Signatory status on a funded quote is not settlement: borrower acceptance remains separate.

Source: [OpenRequest.daml](https://github.com/EndPx/symbolon/blob/main/daml-open-rfq/Symbolon/OpenRequest.daml), [DemoAsset.daml](https://github.com/EndPx/symbolon/blob/main/daml/Symbolon/DemoAsset.daml) and [Repo.daml](https://github.com/EndPx/symbolon/blob/main/daml/Symbolon/Repo.daml). Entitled transaction witnesses and infrastructure operators remain trust considerations.

## Publication, Quoting and Withdrawal Are Different Actions

The borrower creates an OpenRequest on the ledger and consents to publish its verified disclosure. This records a financing request but does not transfer cash or pledge collateral. A lender's nonconsuming SubmitOpenQuote creates and consumes a bilateral core QuoteRequest, reserves the lender's existing cash and creates a private RepoQuote in one transaction. No assets are minted by that choice, and the borrower does not need to be online to authorize each lender's quote.

Withdrawing archives the OpenRequest, so new quotes against it fail. Existing funded quotes keep their own accept, reject and revoke lifecycle. Core quote acceptance alone does not withdraw the open request or release other offers; use the app's confirmed linked-request actions and reconcile any remaining offers separately.

## Trust, Shared Authority and Historical Disclosure

The app/database operator can read stored request disclosures and private quote-index metadata. Hosting/participant administrators, issuers and permitted witnesses remain trust dependencies; asset movements can reveal or allow inference of related information. The simulated asset issuer retains mint/archive powers.

Privacy is party-authority scoped, not guaranteed per human login. Two accounts authorized for the same Canton party can read that party's same private records. Use distinct borrower and lender parties for a counterparty privacy rehearsal.

Withdrawal cannot erase request details already disclosed. Earlier private requests, quotes, positions and audit receipts retain their original audiences; the new flow does not automatically republish legacy private records.
