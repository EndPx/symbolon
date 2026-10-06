# LocalNet

Native local Canton supplies the browser repo workflow. A separate official BitSafe starter supplies three Canton participants and three DecMan services for threshold-controlled oracle publication.

| Setting | Configuration |
| --- | --- |
| Core release | symbolon-v2 v0.2.0, Daml SDK 3.5.2 |
| Native browser assets | Simulated CETH / CUSD |
| BitSafe assets | Simulated cBTC-demo / USDCx-demo |
| Starter | Commit 21ffdedf64366b1f2824301c434b427bf4726663 |
| LocalNet / DecMan | LocalNet 0.6.12 / DecMan v1.8.0 |
| Governance | 2-of-3 confirmation for the decentralized oracle party |
| Hosting | Three participants on one disposable CI host; no independent-operator claim |

## Active contracts and identifiers

| Identifier | Value or record |
| --- | --- |
| Core package | 1d40e972b56e42c279140639d33dc362b432f2c0f608c77ec36410f0395f3e19 |
| Participant and party mapping | [Public evidence](https://github.com/EndPx/symbolon/blob/codex/submission-devnet/docs/submission/evidence/bitsafe-localnet.json) |
| Latest recorded reproduction | [Successful run on revision 6c04692](https://github.com/EndPx/symbolon/actions/runs/37353043471) |

These Canton identifiers are not EVM contract addresses. The disposable environment has no public block explorer; evidence and reproducible participant reads provide verification.

The run rejects one-confirmation execution, publishes a mark after two approvals, triggers margin handling, and completes top-up and repurchase. All participants report matching governance execution IDs. Follow [BitSafe LocalNet integration](../guides/bitsafe-localnet.md) to reproduce it.
