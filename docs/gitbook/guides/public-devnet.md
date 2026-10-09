---
description: Try the Borrow/Lend workflow on shared HackCanton DevNet with simulated assets.
---
# Getting Started

Open the [Symbolon DevNet app](https://symbolon.endpx.cloud/app) to try the financing workflow. The current market uses simulated cBTC-demo and USDCx-demo on shared HackCanton DevNet.

## Prerequisites

| You need | What it means |
| --- | --- |
| A HackCanton/NODERS account | An account with an allocated Canton party and permitted ledger access. |
| The correct network | Use the DevNet app and a HackCanton account authorized for this participant. |
| Test assets | cBTC-demo for collateral or USDCx-demo for lending, from the market's issuer. |
| A counterparty | At least one lender must register for the same market before a borrower can send requests. |

## Quick Start

1. **Connect your account.** Open the app and choose the HackCanton account connection. Complete the provider's sign-in flow.
2. **Check the party.** Open Account and confirm the identity you intend to use. The selector shows only parties your account is authorized to act as.
3. **Get test assets.** Open Faucet and use Get DevNet assets. A confirmed claim issues 0.1 cBTC-demo and 5,000 USDCx-demo from the configured test issuer. These have no monetary value.
4. **Open the market.** Select the cBTC-demo / USDCx-demo pair. Confirm its issuer and price source.
5. **Choose your activity.** Lenders register and wait for requests. Borrowers review the registered recipients, approve sharing and send a request.

## Example: rehearse both sides

Use two distinct authorized parties: Alex as borrower and Blair as lender. With two people, each signs in through their own HackCanton account and checks their own party. In a founder-operated rehearsal, the account selector can switch between parties it is authorized to control.

Blair gets matching test cash, opens the market's **Lend** workspace and registers for that market. Alex then requests 1,000 USDCx-demo for 30 days and approves sharing with **All registered lenders**. Sending creates requests only; a lender still needs to choose an APR and send a funded offer.

Blair enters 5.20% APR and sends an offer backed by cash. Alex reviews the 30-day ACT/360 repayment of 1,004.3333333333 USDCx-demo, accepts the offer, then repurchases before the deadline to recover the collateral. Actual quote and ledger values govern each step. Early repurchase still pays the full agreed amount.

The party switch is a test-account convenience. Another person logs in with their own account and uses their own authorized party; login does not grant access to your test roles.

## What to check before continuing

Portfolio → Holdings separates assets by issuer. A wallet balance alone does not make a token usable in this demo market. A compatible wallet also needs the same network, packages and asset access; a successful connection is not a verified financing transaction.

The app can prepare an expired **public simulated reference** during request review. Other oracles need their authorized publisher to supply a current mark. Once you have assets and an eligible counterparty, continue with [Borrowers](borrower.md) or [Lenders](dealer-oracle.md).

## TestNet status

TestNet work is deferred while participant access, package vetting and the wallet transaction path remain unresolved. The current demo and submission use the DevNet app. Earlier TestNet entry URLs redirect there temporarily.

A Grofty TestNet party remains on TestNet; opening the DevNet app does not migrate that party, its assets or its wallet permissions. Use your authorized HackCanton account for this demo. The existing wallet connection checks are preparation evidence, not a TestNet financing result.
