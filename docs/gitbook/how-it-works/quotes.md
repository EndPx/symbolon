# Requests and Offers

The borrower publishes one OpenRequest with full disclosure consent. Connected lenders read its terms and quote directly. Each funded quote remains private between that lender and the borrower; no per-lender request-access or approval step is needed for new requests.

## Publish Once

The borrower reviews the cash amount, collateral quantity, duration and risk terms before signing. Publication intentionally shares the borrower identity and full request terms with all authenticated connected Symbolon parties. Unauthenticated visitors receive only the random listing ID, supported market/pair, open state and date.

Creating the OpenRequest records the request on the ledger. Publishing its verified disclosure links it to discovery. Neither action transfers cash or locks collateral; it is not a funded offer or settled position.

## Lenders Set APR Directly

A lender opens an active request, selects its annualized rate and quote validity, then reviews the required cash reservation. SubmitOpenQuote needs only that lender's live signing authority and exact compatible available cash. It creates a transient bilateral QuoteRequest, consumes it into a funded RepoQuote and reserves cash atomically. It does not mint cash or require the borrower to come online for another permission.

**Example:** Alex publishes 1,000 USDCx for 30 days. Blair funds 7% APR and Casey funds 7.5%. Alex compares approximately 1,005.83 and 1,006.25 repayment; neither lender automatically sees the other's rate.

| Record | Alex sees | Blair sees | Casey sees |
| --- | --- | --- | --- |
| Published full request, when authenticated | Full terms | Full terms | Full terms |
| Blair's 7% funded quote | Yes | Yes | No automatic access |
| Casey's 7.5% funded quote | Yes | No automatic access | Yes |
| Position after selecting Blair | Yes | Yes | No automatic access |

OpenRequest submission is nonconsuming for quotes, so other lenders can still quote while it remains active. The core bilateral QuoteRequest created inside each quote transaction is consumed; it is not a separate borrower approval screen.

## Acceptance, Withdrawal and Unused Funding

The borrower reviews full repayment and collateral rules before accepting a funded offer. A request publication does not assign an automatic APR or create a standing 5.20% quote.

WithdrawOpenRequest archives the open request and prevents new quotes. Already funded quotes remain governed by their own accept, reject and revoke choices. Quote expiry prevents acceptance but does not automatically release reserved cash. Core acceptance alone does not close the open request or reject competing offers.

The app's linked acceptance flow can combine the chosen acceptance, withdrawal of a still-active matched request and rejection of other **known, recorded, linked active offers** in one ledger submission. Unrelated or unknown core offers remain individual records; do not assume every reservation has disappeared. Confirm the actual receipt and review any remaining offers.

If the ledger action committed but discovery synchronization failed, reconcile the original receipt. Retrying receipt synchronization does not publish another request or reserve quote cash again.

## One Offers Workspace

Offers brings the relevant open requests and private funded offers into one workspace for the selected Borrow/Lend activity. Closed request history is placed in a collapsed **Archive** section. Archiving is presentation, not deletion or automatic financial cancellation. Legacy private records keep their original audiences and are not automatically republished.
