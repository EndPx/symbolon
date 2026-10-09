# Contracts and Permissions

The OpenRequest package lets the borrower authorize its financing terms once. A lender then funds a private core quote with its own authority. Existing core settlement and position contracts retain their bilateral party model.

## Actions by Party

| Action | Authorized actor | Main check |
| --- | --- | --- |
| Create/publish OpenRequest | Borrower | Valid immutable terms and explicit full-disclosure consent; API publication matches the confirmed ledger receipt. |
| SubmitOpenQuote | Quoting lender | Lender differs from borrower; valid APR/expiry and exact available cash from the agreed issuer. No auto-mint or borrower-online permission. |
| WithdrawOpenRequest | Borrower | Archives the active OpenRequest; later new quote exercises fail. |
| Accept a funded core quote | Quote's borrower | Unexpired quote, compatible collateral and fresh agreed mark. |
| Reject / revoke quote | Borrower / originating lender | Core reservation checks release that offer's cash. |
| Repay / top up | Position's borrower | Full agreed repayment / valid collateral restoring required cover. |
| Accept substitution / issue call / close out | Position's lender, as declared by each choice | Compatible replacement or the fresh-mark/deadline conditions required by the core. |
| Publish a price | Named oracle | Authority for that feed; lending alone does not grant it. |

SubmitOpenQuote is **nonconsuming** on OpenRequest. It creates a bilateral core QuoteRequest and immediately exercises SubmitQuote, reserving the lender's existing cash and creating a private RepoQuote atomically. Borrower authority comes from the already-signed OpenRequest context; the borrower need not be online for each offer.

## Disclosure Is Not Borrower Authority

The template declares the borrower as its only signatory and no observers. Publication intentionally serves the full created-event disclosure to authenticated Symbolon parties. Default signatory-only visibility is therefore not a confidentiality promise for the published request.

**Example:** Casey can read the request and quote as Casey with compatible cash. Casey cannot withdraw it as Alex, accept Blair's offer as Alex or spend Blair's holding. The [visibility matrix](privacy-and-trust.md) separates published disclosure from core S/O roles.

## Acceptance and Withdrawal Are Separate in the Core

Core AcceptQuote settles cash/collateral and creates RepoPosition; it does not itself archive OpenRequest. Withdrawal alone does not cancel existing funded quotes or release their cash. The app can combine selected acceptance, matched-request withdrawal and rejection of other known linked active offers, but unrelated/unknown core records require their own reconciliation and choices.

Assets still use issuer-and-instrument identity and exact-sized available/reserved Holding checks. The simulated closeout releases collateral to the lender; it does not sell assets or calculate surplus/deficiency recovery.

Sources: [OpenRequest.daml](https://github.com/EndPx/symbolon/blob/main/daml-open-rfq/Symbolon/OpenRequest.daml), [core Repo.daml](https://github.com/EndPx/symbolon/blob/main/daml/Symbolon/Repo.daml) and [DemoAsset.daml](https://github.com/EndPx/symbolon/blob/main/daml/Symbolon/DemoAsset.daml). These are not completed native cBTC/USDCx adapters.
