# Shared DevNet execution proof

The shared-network runner is separate from the official BitSafe LocalNet harness. It uses only the reviewed NODERS DevNet JSON API, the pinned Symbolon/BitSafe package IDs, and fresh synthetic actors prepared in the Console. It has no MainNet or loopback fallback.

## Authenticate locally

The Console session is used for package provisioning and visual inspection. CLI authentication uses the participant's documented Authfactory password grant. Run this from the repository root with Windows PowerShell 5.1 or PowerShell 7 after uploading the reviewed DAR:

```powershell
./scripts/verify-shared-devnet.ps1 -Execute
```

Enter credentials only into the local credential prompt. The helper retains them in process memory and supplies the access token to the Node child through stdin. It omits offline-access scope and never writes password/token files. A successful Console login is not itself an authenticated CLI session.

Run the command in your own visible interactive PowerShell window. Starting a process from an agent's background shell does not guarantee that a credential prompt appears on the desktop. When launching Windows PowerShell 5.1 from a PowerShell 7 parent, do not inherit the parent's Core-only `PSModulePath`; let the child initialize its own modules. The helper's Windows tests cover both versions with isolated module paths.

First onboard the same account in the [NODERS DevNet Wallet](https://wallet.validator.hackcanton-01.devnet.naas.noders.services/): sign in, click **Onboard yourself** if prompted, and wait for the wallet to open. The Console's identity card does not prove that the ledger user exists. A `403 invalid token` response can conceal `UserNotFound`; check the specific trace ID in the NODERS Grafana logs before changing authentication scopes or retrying transactions. The helper prints the child runner's output with token redaction on both supported PowerShell versions.

The private `.omc/devnet/profile.json` must contain the participant ID, ledger user ID, party namespace, `roleBatch` (eight hex characters), and seven role IDs observed in the Console. Create `symbolon-proof-<roleBatch>-<role>` for `governance`, `proposer`, `confirmer`, `executor`, `issuer`, `borrower` and `dealer` in your namespace, and verify **Local / Act-as on** for each. The shared node can allow Console provisioning while denying direct Ledger API party allocation with `User quota of party allocations exhausted`.

The account profile stays local. Before any ledger mutation the runner checks the token subject, participant, role namespace/batch, actual can-act-as rights, one common submission synchronizer, and empty active-contract state for all seven parties. It refuses the wallet primary party, other teams' parties and dirty batches; inspect incomplete evidence before preparing a new batch or replaying a lifecycle.

## Executed scope

When authenticated preflight succeeds, the runner verifies the required packages and the seven isolated Console roles under the authenticated user's authority, and records the connected submission synchronizer. It then:

1. Creates 2-of-3 `GovernanceRules` for an ordinary hosted oracle party.
2. Initializes a simulated price feed through the Symbolon BitSafe proposal.
3. Issues test holdings, submits a private RFQ, funds a 5.2% quote and settles a 1,000-unit repo against 0.025 cBTC-demo.
4. Rejects the price-mark execution with one confirmation, verifies the old mark remains, then executes with two confirmations.
5. Records the new 36,000 mark, an undercollateralized position, margin call, 0.005 collateral top-up, and repurchase of the stored 1,004.3333333333 cash amount.

The script submits through the authenticated Ledger API and the application's action builders. It does not involve a browser wallet. The ordinary hosted oracle and all demo members belong to one participant/operator; this is not a DecMan service deployment, a decentralized-party hosting proof, or independent operators. The separate three-participant LocalNet evidence remains the decentralization demonstration for Contribution Pool.

## Evidence and verification

Each run writes `.omc/devnet/<run-id>/evidence.json` with the actual endpoint, participant/synchronizer IDs, role mapping, source/package identifiers, original command IDs, committed transaction records, and timestamped before/after contract state. The record is marked `passed` only after `ClosedRepo: Repurchased` is confirmed. Package installation and public version reads cannot set that result.

Rejected confirmation execution must be a genuine Daml `Enough confirmations to execute action` rejection, rather than a missing credential, unknown package, or gateway error. Unknown/mismatched transaction responses remain incomplete. The runner never automatically retries an ambiguous submission.

Retain the private raw evidence, then review the synthetic ledger events before copying a judge-facing version into the public evidence directory. Do not publish credentials, unrelated account records, or screenshots containing private contact data. A Canton update ID alone is not public explorer access: give the environment, party context, retained events and instructions for an authorized ledger re-read.

On **7 October 2026**, run **d2602fd8** completed at **2026-10-07T06:24:43.782Z**, with **20 committed transactions**, one expected threshold rejection, five state snapshots and `ClosedRepo: Repurchased`. Ledger offsets advanced **2293352 → 2293507**. [Judge summary](evidence/shared-devnet.md) and [original receipts](evidence/shared-devnet.json) retain the exact scope and identifiers.

Run `node scripts/verify-shared-devnet-evidence.mjs` for an offline consistency check of the published receipts, balances and source hashes. It does not connect to a ledger; use the retained operator-log links or an authorized transaction re-read for external corroboration. The completed seven-role batch is now nonempty and must not be replayed. Prepare a new isolated batch only when a new network execution is actually needed.
