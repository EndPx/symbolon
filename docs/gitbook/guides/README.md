# Overview

The [Symbolon app](https://symbolon.endpx.cloud/app) opens the financing desk. An authorized Canton party session determines which requests, quotes, holdings, and positions a user can read and which actions they can submit.

## Getting started

For a reproducible environment, follow [Local setup](local-setup.md). It builds the Daml packages, starts Canton, creates simulated assets, and seeds borrower and dealer parties. Open /app on the local server and select a seeded role.

For the published DevNet app, follow [Getting Started](public-devnet.md). An existing authorized HackCanton/NODERS account can claim test assets, request a funded reference offer, settle, manage collateral and repurchase. Each account uses its own permitted parties. Borrow and Lend are activities of the selected party, not separate identities allocated automatically on login.

The [Wallets and DevNet readiness](wallet-devnet.md) guide explains participant, package, asset and permission prerequisites for a wallet connection. Independently operated external-account rehearsals and native wallet signing remain separate verification steps.

## Choose your role

| Guide | Main actions |
| --- | --- |
| [For borrowers](borrower.md) | Request quotes, compare repayment terms, settle, manage collateral, and repurchase |
| [For dealers and oracle operators](dealer-oracle.md) | Fund quotes, monitor coverage, raise margin calls, and submit permitted closure or marks |
| [Frequently Asked Questions](faq.md) | Fixed rate, maturity, repayment, privacy, and deployment scope |

The [local repo walkthrough](demo.md) is a complete ledger-backed rehearsal. The [BitSafe LocalNet guide](bitsafe-localnet.md) covers the separate three-participant governance environment.
