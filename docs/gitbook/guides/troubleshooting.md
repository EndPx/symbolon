# Troubleshooting

Use the app's status and original receipt to identify the failed stage. A lost notification or offchain sync error is not evidence that a ledger action failed.

| What you see | Meaning | Next action |
| --- | --- | --- |
| Minimal request card only | You are reading without the authenticated pricing context. | Connect the authorized HackCanton account and select the supported market to read the published full terms. No request-access approval is needed. |
| No open requests | No active publication is available from another borrower in this market, or the request was withdrawn. | Refresh the board and check the selected market. Legacy private records are not automatically republished. |
| Request awaiting quote | Publication succeeded but no funded offer has been confirmed. | A lender opens Quote request, sets APR/validity and funds it from compatible existing cash. |
| Not enough cash | The lender lacks unlocked Holding cash from the agreed issuer/instrument. | Check issuer-separated Holdings. A quote does not auto-mint; use the separate demo faucet if needed. |
| Request closed or unavailable | The active OpenRequest was withdrawn or the current context could not be verified. | Do not submit another quote against a cached disclosure. Existing funded quotes keep their core lifecycle. |
| Offer expired | Acceptance is no longer eligible. | Revoke/reject that quote to release reserved cash; expiry alone does not release it. |
| Stale mark / Last mark | Price-sensitive acceptance or margin action needs a valid fresh mark. | Refresh the simulated public reference in review where permitted; other feeds need their authorized publisher. |
| Ledger committed, sync failed | The API index has not reconciled the actual result. | Retry synchronization using the retained original publication/quote/withdrawal receipt, not another financial submission. |

## Example: Blair Cannot Price the Request

Blair sees only a minimal card while disconnected. After connecting the intended account/party, Blair can read the published request and immediately quote. If the active contract is withdrawn, a cached disclosure does not make it quotable again.

## Example: One Offer Settled, Another Still Exists

Check the receipt and remaining core offers. The app may release other known, recorded, linked active offers in its acceptance submission. Unrelated or unknown offers do not disappear merely because a request was withdrawn or a position opened.

Reconnect an expired session through the provider's normal flow. Do not share credentials or access tokens when reporting a reproducible error.
