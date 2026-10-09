# Chains

Symbolon's current public financing demo runs on shared HackCanton DevNet with simulated assets. LocalNet supports developer reproduction and the separate BitSafe integration. TestNet work is deferred; MainNet financing is not enabled.

| Environment | What it is for | Asset and operating boundary |
| --- | --- | --- |
| [LocalNet](localnet.md) | Reproduction and the separate BitSafe governed-price demonstration. | Simulated assets; one operator controls the test environment. |
| [Shared DevNet](devnet.md) | The public app and retained shared-network financing runs. | Simulated cBTC-demo / USDCx-demo and a public test reference. |
| TestNet — deferred | Retained wallet connection preparation; it is not the active demo route. | Financing was not enabled. Operator access, package vetting and wallet transaction compatibility remain unresolved. Earlier entry URLs redirect to DevNet temporarily. |
| [MainNet](mainnet.md) | Planned real-asset release work. | No enabled production financing or real-token settlement is claimed. |

## Example: choose the right environment

To try the hosted Borrow/Lend workflow, use the public DevNet app and your authorized HackCanton account. To reproduce the 2-of-3 BitSafe integration as a developer, use the separate LocalNet runbook. A local governed-price result does not make the public DevNet reference a decentralized live-market oracle.

For a two-person demo, each person uses their own authorized HackCanton account. The lender registers for the market before the borrower sends a request; each lender then sets its own APR. [Getting Started](../guides/public-devnet.md) explains the current route. Grofty TestNet parties and balances do not move to DevNet when opening this app.
