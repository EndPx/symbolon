---
description: Try the Borrow/Lend workflow on shared HackCanton DevNet with simulated assets.
---


# Getting Started

Open the [Symbolon DevNet app](https://symbolon.endpx.cloud/app) to try the financing workflow. The current market uses simulated cBTC-demo and USDCx on shared HackCanton DevNet.

{% hint style="info" %}
**A shorter label, the same prototype asset.** These guides use **USDCx** as the display label for Symbolon's simulated cash. The on-ledger instrument remains `USDCx-demo`. The current financing workflow uses simulated `Holding` contracts, distinct from native faucet or bridge asset contracts. A native USDCx or CBTC wallet balance does not establish compatibility with this market; native-token adapters are not implemented in this release.
{% endhint %}

## Prerequisites

| You need | What it means |
| --- | --- |
| A HackCanton/NODERS account | An account with an allocated Canton party and permitted ledger access. |
| The correct network | Use the DevNet app and a HackCanton account authorized for this participant. |
| Test assets | cBTC-demo for collateral or USDCx for lending, from the market's issuer. |
| A counterparty | A connected lender can read the consented published request and fund its own private quote. |

## Quick Start

1. **Connect your account.** Open the app and choose the HackCanton account connection. Complete the provider's sign-in flow.
2. **Check the party.** Open Account and confirm the identity you intend to use. The selector shows only parties your account is authorized to act as.
3. **Get test assets.** Open Faucet and use Get DevNet assets. A confirmed claim issues 0.1 cBTC-demo and 5,000 USDCx from the configured test issuer. These have no monetary value.
4. **Open the market.** Select the cBTC-demo / USDCx pair. Confirm its issuer and price source.
5. **Choose your activity.** Borrowers review full-disclosure consent and publish once. Lenders read the published terms, choose APRs and fund private quotes directly in Offers.

## Example: rehearse both sides

Use two distinct authorized parties: Alex as borrower and Blair as lender. With two people, each signs in through their own HackCanton account and checks their own party. In a founder-operated rehearsal, the account selector can switch between parties it is authorized to control.

Alex prepares 1,000 USDCx for 30 days, reviews that full request terms will be disclosed to all authenticated connected parties, and signs/publishes one OpenRequest. Blair reads it in Offers and directly submits its own funded APR quote. Alex does not separately approve Blair or need to be online for the quote step. Publication records the ledger request but moves no assets; quotation reserves Blair's existing compatible cash.

Blair enters 5.20% APR and sends an offer backed by cash. Alex reviews the 30-day ACT/360 repayment of 1,004.3333333333 USDCx, accepts the offer, then repurchases before the deadline to recover the collateral. Actual quote and ledger values govern each step. Early repurchase still pays the full agreed amount.

The party switch is a test-account convenience. Another person logs in with their own account and uses their own authorized party; login does not grant access to your test roles.

## What to check before continuing

Portfolio → Holdings separates assets by issuer. A wallet balance alone does not make a token usable in this demo market. A compatible wallet also needs the same network, packages and asset access; a successful connection is not a verified financing transaction.

For the **public simulated reference**, offer review can refresh a stale mark before acceptance. Other oracles need their authorized publisher to supply a current mark. Once you have assets and an eligible counterparty, continue with [Borrowers](borrower.md) or [Lenders](dealer-oracle.md).

## TestNet status

TestNet work is deferred while participant access, package vetting and the wallet transaction path remain unresolved. The current demo and submission use the DevNet app. Earlier TestNet entry URLs redirect there temporarily.

A Grofty TestNet party remains on TestNet; opening the DevNet app does not migrate that party, its assets or its wallet permissions. Use your authorized HackCanton account for this demo. The existing wallet connection checks are preparation evidence, not a TestNet financing result.
