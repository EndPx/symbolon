# Shared DevNet

Symbolon completed a repo and governed oracle workflow on shared HackCanton DevNet on **7 October 2026**. The lower mark led to a margin call, a successful top-up and `ClosedRepo: Repurchased`. This is actual shared-network execution with simulated cBTC-demo / USDCx-demo, using the application's action builders through authenticated Ledger API submission.

| Setting | Recorded status |
| --- | --- |
| Network | NODERS shared HackCanton DevNet |
| Participant | hackcanton-devnet-3 |
| Canton version | 3.5.19 |
| Current packages | symbolon-v2 v0.2.0 and symbolon-bitsafe v0.2.0, uploaded and Vetted |
| Recorded run | d2602fd8; completed 2026-10-07T06:24:43.782Z (13:24 WIB) |
| Repo flow | RFQ, 5.2% funded quote, settlement, governed mark, margin call, top-up and repurchase |
| Ledger evidence | 20 committed transactions, one expected threshold rejection and five state snapshots |
| Oracle governance | 2-of-3 Daml governance on an ordinary hosted oracle party |
| Submission | Authenticated Ledger API; no installed-wallet signing |
| Hosting | Seven isolated roles controlled by one account on one participant; no DevNet decentralized-party deployment |

## Active contracts and identifiers

| Identifier | Value |
| --- | --- |
| Older installed package | 29b7ac23ff40927030b00c65941fdc2d5a4869cd6941da1cd31b6d7e7811ba5d |
| Executed core package | 1d40e972b56e42c279140639d33dc362b432f2c0f608c77ec36410f0395f3e19 |
| Executed BitSafe adapter | a7753f8a6453637d169143673c9299a36c4228f0a551fe633b82fd51ec7c69a0 |
| Governed mark update | 12205ae397cc5f5cc71dc88c18cbe91036b476e51141b6a75d412ac36b9d91010276 |
| Repurchase update | 122096b884fadc949c2fb9c83a32495a3ef5c2c3f0ed9f619f35cf884dfea6831050 |
| Run ledger offsets | 2293352 → 2293507 |

## What the mark changed

| Stage | Simulated mark | Pledged cBTC-demo | Health factor | Position |
| --- | --- | --- | --- | --- |
| Before mark | 60,000 | 0.025 | 1.428571 | Active |
| After two confirmations | 36,000 | 0.025 | 0.857143 | Active, below margin |
| Dealer margin call | 36,000 | 0.025 | 0.857143 | UnderCall |
| Borrower top-up | 36,000 | 0.030 | 1.028571 | Active |
| Repurchase | 36,000 | All pledged collateral returned | Closed | Repurchased |

The principal was **1,000 USDCx-demo** and the agreed full repurchase amount remained **1,004.3333333333 USDCx-demo** throughout. The one-confirmation attempt failed with the Daml requirement `Enough confirmations to execute action`; it did not publish the lower mark. The successful governed mark receipt includes the two consumed confirmations and `SetPrice`.

## Inspect the record

The [judge summary](https://github.com/EndPx/symbolon/blob/main/docs/submission/evidence/shared-devnet.md) links all original receipts, timestamped states, exact source hashes and filtered NODERS operator logs. The [retained JSON](https://github.com/EndPx/symbolon/blob/main/docs/submission/evidence/shared-devnet.json) includes the participant/synchronizer and seven-party mapping. Canton update IDs are not EVM addresses, and the shared environment has no public transaction explorer.

The operator's participant log was re-read after completion and displayed the same repurchase update, command ID, record time and ledger offset **2293501** as the API receipt.

![Repurchase recorded by the NODERS participant](https://raw.githubusercontent.com/EndPx/symbolon/main/docs/submission/evidence/shared-devnet-repurchase.jpg)

Source: NODERS Participant Pod Logs, filtered to the exact repurchase update and recorded time range.

From the repository root, `node scripts/verify-shared-devnet-evidence.mjs` checks retained-record consistency and final unlocked balances without contacting a network. For external corroboration, use the linked operator logs or an authorized transaction re-read with the recorded party context. Operator log availability and retention are controlled by NODERS.

The [reproduction guide](https://github.com/EndPx/symbolon/blob/main/docs/submission/shared-devnet-proof.md) explains wallet onboarding, Console party provisioning and local authentication. The completed batch contains contracts and must not be replayed; the runner rejects nonempty batches before any new lifecycle submission.

The run proves shared-network contract execution and the governed mark's effect on a repo. It does not prove a browser-wallet trade, independent operators, a live DecMan deployment, official asset adapters or MainNet readiness. [LocalNet](localnet.md) retains the separate three-participant DecMan proof for Contribution Pool; Gold deployment remains outside the current scope. [Wallets and DevNet readiness](../guides/wallet-devnet.md) describes the remaining wallet checks.
