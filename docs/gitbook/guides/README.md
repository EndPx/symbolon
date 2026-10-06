# Using Symbolon

The [Symbolon app](https://symbolon.endpx.cloud/app) opens the financing desk. An authorized Canton party session determines which requests, quotes, holdings, and positions a user can read and which actions they can submit.

## Getting started

For a reproducible environment, follow [Local setup](local-setup.md). It builds the Daml packages, starts Canton, creates simulated assets, and seeds borrower and dealer parties. Open /app on the local server and select a seeded role.

For a configured remote environment, follow [Wallets and DevNet readiness](wallet-devnet.md). A connected wallet identifies a party; the participant, packages, assets, and submission rights must also be available. Remote trading remains paused on the published site while those checks are incomplete.

## Choose your role

| Guide | Main actions |
| --- | --- |
| [For borrowers](borrower.md) | Request quotes, compare repayment terms, settle, manage collateral, and repurchase |
| [For dealers and oracle operators](dealer-oracle.md) | Fund quotes, monitor coverage, raise margin calls, and submit permitted closure or marks |
| [Frequently Asked Questions](faq.md) | Fixed rate, maturity, repayment, privacy, and deployment scope |

The [local repo walkthrough](demo.md) is a complete ledger-backed rehearsal. The [BitSafe LocalNet guide](bitsafe-localnet.md) covers the separate three-participant governance environment.
