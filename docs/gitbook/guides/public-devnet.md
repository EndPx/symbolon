---
description: Start with the DevNet financing demo, or rehearse connections with two Grofty TestNet wallets.
---
# Getting Started

The [Symbolon app](https://symbolon.endpx.cloud/app) is the starting point. The current financing market uses cBTC-demo and USDCx-demo on HackCanton DevNet.

## Prerequisites

| You need | What it means |
| --- | --- |
| A HackCanton/NODERS account | An account with an allocated Canton party and permitted ledger access. |
| The correct network | Use the DevNet app for the enabled financing demo. The separate TestNet profile is for connection and own-party read checks. |
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

## Optional: Rehearse a TestNet Wallet Connection

Open the separate [Symbolon TestNet app](https://symbolon-testnet.vercel.app/app) to rehearse connections with **two Grofty TestNet wallets**. The current TestNet wallet picker offers Grofty. Each wallet should connect its own Canton party.

{% hint style="info" %}
**The current TestNet scope is Grofty connection and read-compatibility checks.** Request submission, funded quotes and settlement are disabled in this profile. The [DevNet app](https://symbolon.endpx.cloud/app) remains the place to try the simulated financing workflow.
{% endhint %}

1. **Prepare two Grofty TestNet wallets.** Start with [Grofty's TestNet site](https://dex-testnet.grofty.cc/testnet) and complete each wallet's setup yourself. Use distinct parties for the two counterparties.
2. **Connect the first wallet to Symbolon.** Open the TestNet app, choose Grofty and approve the connection yourself. Confirm TestNet and the first party's identity.
3. **Repeat for the second wallet.** Connect the other Grofty wallet and confirm that its party ID differs. A party belongs to its network; switching networks does not move its assets.
4. **Check ledger-read compatibility.** A successful wallet connection does not prove that required ledger endpoints, Symbolon packages or token adapters are available. If a required check returns **Unsupported**, that read remains unverified; it is not evidence of a zero balance or an empty market.

**Example:** Alex connects Grofty wallet A and Blair connects Grofty wallet B. They confirm two distinct TestNet parties. This rehearses their identities and available reads; it does not create a borrower request or a lender offer. Alex may obtain CBTC from a TestNet faucet, but that does not create a Symbolon cBTC-demo holding or enable a repo with it.

### TestNet Asset Resources

These services are separate from Symbolon's DevNet demo faucet. Their assets help with TestNet wallet preparation; they do not establish compatibility with the simulated financing market.

| Asset | Where to start | What to expect |
| --- | --- | --- |
| Canton Coin (CC) | [Canton Foundation TestNet faucet](https://testnet-faucet.canton.foundation/) | The form offers a default 100 CC request. Requests are processed on weekdays, Monday–Friday; submitting is not an instant balance credit. |
| USDCx | [Circle faucet](https://faucet.circle.com), then [xReserve deposit interface](https://digital-asset.github.io/xreserve-deposits/) | Obtain Ethereum Sepolia USDC at your EVM address, then select Canton TestNet and your recipient Canton party in the deposit interface. You need Sepolia ETH for gas and must review the interface's terms yourself. |
| CBTC | [BitSafe CBTC TestNet faucet](https://cbtc-faucet.bitsafe.finance/?network=testnet&token=cbtc) | The current faucet issues a fixed 0.001 CBTC. The recipient must accept the transfer, and its hosting node needs the DA Utility Registry. |

### Why a Fresh Wallet May Still Show No Symbolon Market

Your Grofty wallet participant must support the required ledger reads, packages and access on the same synchronizer. Required Symbolon package vetting and operator access remain unresolved for this TestNet route. A fresh party also needs the relevant market records shared with it. The existing registered-lender directory uses DevNet account authorization; connecting a Grofty TestNet wallet does not register it through that route.

Real-token adapters remain unimplemented in this TestNet profile. Receiving CC, USDCx or CBTC therefore does not enable a Symbolon quote or settlement. Keep the wallet rehearsal and the DevNet financing demo as separate checks.
