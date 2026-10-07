# Documentation

Symbolon is a private, bilateral fixed-rate repo app on Canton. A borrower requests financing from selected dealers, compares their offers, and agrees the rate and exact repurchase amount before settlement. The resulting position keeps collateral, margin obligations, and repayment in one workflow.

A repo is an agreement to exchange an asset for cash and buy the asset back on agreed terms. Daml applies those terms to Symbolon's cash and collateral movements. The borrower and dealer inspect their own deal without publishing every quote to other counterparties.

## Explore the product

| Topic | What you will learn |
| --- | --- |
| [Introduction](introduction/overview.md) | The problem, intended users, fixed-rate mechanism, and why privacy matters |
| [Mission](mission/ecosystem.md) | The Canton contribution and the path toward a customer pilot |
| [How Symbolon Works](how-it-works/README.md) | Private RFQs, funded quotes, settlement, collateral management, and closure |
| [Using Symbolon](guides/README.md) | Access, borrower and dealer actions, and practical questions |
| [Technical Details](architecture/overview.md) | Contract authority, ledger data, wallet transport, governance, and trust boundaries |
| [Deployments](deployments/README.md) | LocalNet evidence, shared DevNet status, and MainNet requirements |

## Current scope

The working prototype uses simulated assets and prices. Its repo lifecycle has executed on local Canton and shared HackCanton DevNet; the BitSafe integration has also executed through three participants on the official LocalNet. The shared-network run links a 2-of-3 governed mark to margin handling, top-up and repurchase on one hosted participant. The intended production pair is cBTC / USDCx. Official token adapters, shared-network wallet signing and MainNet settlement remain future milestones. [Shared DevNet](deployments/devnet.md) records the actual execution scope.

The [application](https://symbolon.endpx.cloud/app) is the financing desk. [Local setup](guides/local-setup.md) explains how to run the ledger workflow; the [BitSafe guide](guides/bitsafe-localnet.md) explains threshold-controlled oracle marks. Recorded transaction evidence is available in the [public repository](https://github.com/EndPx/symbolon/tree/codex/submission-devnet/docs/submission).
