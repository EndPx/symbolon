---
description: Connect your account and prepare to borrow or lend in the DevNet app.
---
# Getting Started

The [Symbolon app](https://symbolon.endpx.cloud/app) is the starting point. The current financing market uses cBTC-demo and USDCx-demo on HackCanton DevNet.

## Prerequisites

| You need | What it means |
| --- | --- |
| A HackCanton/NODERS account | An account with an allocated Canton party and permitted ledger access. |
| The correct network | The app's current enabled release is DevNet. |
| Test assets | cBTC-demo for collateral or USDCx-demo for lending, from the market's issuer. |
| A counterparty | At least one lender must register for the same market before a borrower can send requests. |

## Quick Start

1. **Connect your account.** Open the app and choose the HackCanton account connection. Complete the provider's sign-in flow.
2. **Check the party.** Open Account and confirm the identity you intend to use. The selector shows only parties your account is authorized to act as.
3. **Get test assets.** Open Faucet and use Get DevNet assets. A confirmed claim issues 0.1 cBTC-demo and 5,000 USDCx-demo from the configured test issuer. These have no monetary value.
4. **Open the market.** Select the cBTC-demo / USDCx-demo pair. Confirm its issuer and price source.
5. **Choose your activity.** Lenders register and wait for requests. Borrowers review the registered recipients, approve sharing and send a request.

## Example: rehearse both sides

Use two distinct authorized parties: Alex as borrower and Blair as lender. Blair first opens Lend and registers for the public market. Alex then requests 1,000 USDCx-demo for 30 days. Switch to Blair to enter an APR and send a funded offer, then return to Alex to review it.

The party switch is a test-account convenience. Another person logs in with their own account and uses their own authorized party; login does not grant access to your test roles.

## What to check before continuing

Portfolio → Holdings separates assets by issuer. A wallet balance alone does not make a token usable in this demo market. A compatible wallet also needs the same network, packages and asset access; a successful connection is not a verified financing transaction.

The app can prepare an expired **public simulated reference** during request review. Other oracles need their authorized publisher to supply a current mark. Once you have assets and an eligible counterparty, continue with [Borrowers](borrower.md) or [Lenders](dealer-oracle.md).
