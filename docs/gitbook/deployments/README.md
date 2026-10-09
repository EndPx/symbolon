# Chains

Symbolon's financial contracts run on Canton. The repository demonstrates a local environment and shared HackCanton DevNet; MainNet financing is not enabled.

| Environment | What it is for | Asset and operating boundary |
| --- | --- | --- |
| [LocalNet](localnet.md) | Reproduction and the separate BitSafe governed-price demonstration. | Simulated assets; one operator controls the test environment. |
| [Shared DevNet](devnet.md) | The public app and retained shared-network financing runs. | Simulated cBTC-demo / USDCx-demo and a public test reference. |
| [MainNet](mainnet.md) | Planned real-asset release work. | No enabled production financing or real-token settlement is claimed. |

## Example: choose the right environment

To try the hosted Borrow/Lend workflow, use the public DevNet app and your authorized HackCanton account. To reproduce the 2-of-3 BitSafe integration as a developer, use the separate LocalNet runbook. A local governed-price result does not make the public DevNet reference a decentralized live-market oracle.
