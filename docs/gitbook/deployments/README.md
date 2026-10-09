# Chains

Symbolon's financial contracts run on Canton. The repository demonstrates a local environment and shared HackCanton DevNet. A separate TestNet app offers Grofty wallet connection and own-party read-compatibility checks; MainNet financing is not enabled.

| Environment | What it is for | Asset and operating boundary |
| --- | --- | --- |
| [LocalNet](localnet.md) | Reproduction and the separate BitSafe governed-price demonstration. | Simulated assets; one operator controls the test environment. |
| [Shared DevNet](devnet.md) | The public app and retained shared-network financing runs. | Simulated cBTC-demo / USDCx-demo and a public test reference. |
| [TestNet connection profile](https://symbolon-testnet.vercel.app/app) | Rehearsing two Grofty wallet connections and checking ledger-read compatibility. | Trading is disabled. Required package vetting, operator access and real-token adapters remain unresolved; no RFQ, funded quote or settlement is claimed. |
| [MainNet](mainnet.md) | Planned real-asset release work. | No enabled production financing or real-token settlement is claimed. |

## Example: choose the right environment

To try the hosted Borrow/Lend workflow, use the public DevNet app and your authorized HackCanton account. To reproduce the 2-of-3 BitSafe integration as a developer, use the separate LocalNet runbook. A local governed-price result does not make the public DevNet reference a decentralized live-market oracle.

To rehearse two distinct Grofty wallets, use the separate TestNet profile and the [TestNet steps in Getting Started](../guides/public-devnet.md#optional-rehearse-a-testnet-wallet-connection). Connected wallet identities do not establish ledger-read support. A TestNet wallet balance is a different compatibility question from the DevNet demo's issuer-specific holdings.
