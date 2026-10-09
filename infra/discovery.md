# Private-detail discovery service

The hosted DevNet UI separates a minimal public board from party-authorized access
records. This service is an off-ledger discovery layer; Daml remains authoritative
for requests, funded quotes, settlement and position management.

Apply [discovery.sql](discovery.sql) once to the existing lender-directory database.
It creates two new tables and indexes; it does not alter lender registrations or
Canton contracts. Configure `SYMBOLON_DIRECTORY_DATABASE_URL` on the server using
the existing secret connection string. Never place it in a Vite client variable.

Public `GET /api/discovery?market=...` returns at most 100 open listings with only
`id`, `market`, `status` and `createdAt`. The market is pinned to the configured
DevNet release, issuers, oracle and synchronizer. `scope=mine` reads and all writes
verify the claimed party's live `CanActAs` rights against the configured hosted
participant. Tokens are forwarded only to that participant and never stored.

| Operation | Effect |
| --- | --- |
| `publish` | Store private financing intent; return minimal listing metadata. |
| `request-access` | Store a lender's private interest; no lender registration required. |
| `approve` | Verify an existing bilateral QuoteRequest creation and record access. |
| `close` | Close discovery; leave ledger requests, offers and positions unchanged. |

Before calling `approve`, the borrower reviews disclosure and creates one existing
`QuoteRequest` for that lender. The service verifies its actual transaction,
package/template, parties, exact terms, synchronizer, stakeholder audience and
creation time. A unique request contract ID prevents proof reuse across approvals.
If API recording fails after ledger commitment, disclosure has already happened.
Reconcile the original receipt, including after listing closure; do not resubmit.

The database and participant operators are trust dependencies. The service does
not establish anonymity from them, revoke historical disclosures, provide native
token integration, or make the public metadata private. LocalNet reproduction of
the Daml lifecycle uses seeded bilateral parties and does not depend on this API.

Verify the service and precision/approval guards with `cd web && npm test`.
Verify both server scopes with `npm run build` and, from the repository root,
`node web/node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`.
