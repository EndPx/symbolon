# Troubleshooting

Use the status shown by the app to identify which part of the workflow needs attention. Do not resend an uncertain command merely because a notification disappeared.

| What you see | What it means | What to do |
| --- | --- | --- |
| 0 eligible lenders | No active registration matches the selected market, excluding your own party. | A lender opens that market in Lend, registers, then the borrower refreshes the directory. |
| Directory unavailable | The recipient list could not be verified. | Retry directory discovery before sending; no demo recipient is substituted. |
| Request awaiting quote | The request exists but its lender has not sent a funded offer. | The lender opens Lend using its addressed party and enters an APR. |
| No request in lender view | The party was not addressed, registered later, or selected a different market. | Verify signing party and market; later registration needs a new borrower request. |
| Insufficient cash or collateral | Compatible unlocked holdings do not cover the action. | Check issuer-separated Holdings and reserved amounts; use Faucet for test assets if needed. |
| Price expired / Last mark | The estimate uses an old agreed price. | Obtain a valid fresh mark before a price-sensitive action. |
| Offer expired | Its validity window ended. | The lender must revoke to release funding and issue a new offer for a new request if desired. |
| Pending or uncertain | Commit or failure is not established. | Inspect the original transaction status/receipt in Account before retrying. |

## Example: the lender cannot see Alex's request

Alex sent a request before Casey registered. Registering Casey later does not copy that old request. Alex reviews the updated recipient list and sends a new request. Casey then selects the same issuer/oracle market from Casey's own signing party.

## Example: a top-up restores health but not an old price

A ledger read refresh retrieves records; it does not publish a new oracle timestamp. Position Details can show a neutral expired estimate until the agreed publisher supplies a current mark. The public test oracle has its own explicit refresh controls; private or committee feeds retain their own authority.

If the account session expired, reconnect through the normal provider flow. Never share passwords, access tokens or private keys as a troubleshooting step.
