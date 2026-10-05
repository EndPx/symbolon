# Troubleshooting

Start with the actual ledger or build error. Refresh contract state after a rejected command and check whether its inputs were consumed by another operation. Do not weaken contract checks to make a demo form succeed.

| Symptom | Likely cause | Next step |
| --- | --- | --- |
| Daml dependency cannot be resolved in a Windows path | The compiler/data-dependency path contains spaces or the core DAR was not built | Use the documented staging build helper or a space-free build path; build core before dependants |
| JSON API unavailable | Sandbox is stopped, wrong port, WSL/Windows loopback mismatch or proxy misconfiguration | Check the script status/logs and `LEDGER_ORIGIN`; use the actual reachable endpoint |
| `/app` returns 404 on a static host | Missing SPA rewrite | Serve `index.html` for the application route |
| Template/package not found | Correct DAR is not uploaded, name resolution differs, or frontend and ledger schema differ | Rebuild and deploy matching packages; record package IDs |
| Wallet connects but contracts are empty | Wrong party/network, no seeded assets, missing rights, or package mismatch | Verify party ID, network, party rights and known expected contract |
| JSON parser expects a string | Int or Decimal was sent as a JSON number | Use the `int`/`dec` helpers or correctly encoded strings |
| Contract not active | A merge, transfer, price update or state transition consumed its ID | Refresh and build the command using the new active ID |
| Quote cannot be accepted | Expiry, unavailable funding/collateral, issuer mismatch, invalid feed or insufficient initial coverage | Inspect the current quote, balances and feed; request a new quote if necessary |
| Balance looks sufficient but a transfer fails | Amount is fragmented, locked, or belongs to a different issuer | Use compatible unlocked holdings and issuer-aware consolidation |
| Margin call rejected | Position is healthy, already under call, no longer actionable, or feed is invalid | Review state and a valid mark; rejection may be correct |
| Top-up rejected | Added amount is nonpositive, insufficient, wrong identity or too late | Recalculate full shortfall with a current feed and inspect deadline |
| Substitution rejected | Proposal references old position/holding/feed, lacks authority or fails coverage | Recreate it with current inputs and obtain dealer acceptance |
| Repurchase rejected near maturity | Ledger has reached a default boundary or cash is insufficient | Check ledger outcome and stored full repurchase price; do not rely on browser countdown |
| Expired quote cash still restricted | Expiry prevented acceptance but did not submit a release action | Use an authorized quote rejection/revocation and verify released balance |
| Demo feed becomes unusable while explaining | Feed exceeded the agreed maximum age | Publish a new simulated mark with the oracle and refresh the client |

## Local demo reset

Stopping the local runtime is different from deleting its data or reseeding. Reseeding may allocate another set of parties and holdings. Use the provided helper's documented commands and inspect its output rather than assume that display names are unique. Avoid deleting unrelated files or resetting a shared network.

## Diagnostics to retain

For a reproducible report include the source revision, command, environment, role, template/choice, sanitized error, and whether the contract was active before submission. A command ID or update ID helps distinguish an uncertain network response from a confirmed failure. Do not publish wallet secrets or unrelated private contract payloads.

If a submission times out, query state before retrying. The ledger may have committed even though the browser did not receive the response. A second submission with new inputs could create an unintended second action.
