---
description: Start with the DevNet financing demo, or rehearse a TestNet wallet connection.
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

Open the separate [Symbolon TestNet app](https://symbolon-testnet-snowy.vercel.app/app) to try connecting a compatible wallet and checking the data available to your own Canton party.

{% hint style="info" %}
**The current TestNet scope is connection and reads.** Request submission, funded quotes and settlement are disabled in this profile. The [DevNet app](https://symbolon.endpx.cloud/app) remains the place to try the simulated financing workflow.
{% endhint %}

1. **Prepare your wallet on TestNet.** Follow the official [Send Connect TestNet guide](https://sigilry.org/guides/send-connect-testnet/) to select TestNet and complete your own wallet setup. If you use Grofty, start with its [TestNet site](https://dex-testnet.grofty.cc/testnet).
2. **Open Symbolon's TestNet app in that browser.** Approve the wallet's connection request yourself. An installed extension may require reloading the app before it appears.
3. **Check the network and party.** Confirm TestNet and the party you intend to use. Switching networks does not move assets from another network.
4. **Inspect the permitted read results.** A successful connection establishes access to an identity; it does not prove that Symbolon's packages, market or token adapters are available for that wallet's participant.

**Example:** Alex connects a fresh TestNet wallet and sees its own party. Alex may obtain CBTC from a TestNet faucet, but that does not create a Symbolon cBTC-demo holding or enable a repo with it.

### TestNet Asset Resources

These services are separate from Symbolon's DevNet demo faucet. Their assets help with TestNet wallet preparation; they do not establish compatibility with the simulated financing market.

| Asset | Where to start | What to expect |
| --- | --- | --- |
| Canton Coin (CC) | [Canton Foundation TestNet faucet](https://testnet-faucet.canton.foundation/) | The form offers a default 100 CC request. Requests are processed on weekdays, Monday–Friday; submitting is not an instant balance credit. |
| USDCx | [Circle faucet](https://faucet.circle.com), then [xReserve deposit interface](https://digital-asset.github.io/xreserve-deposits/) | Obtain Ethereum Sepolia USDC at your EVM address, then select Canton TestNet and your recipient Canton party in the deposit interface. You need Sepolia ETH for gas and must review the interface's terms yourself. |
| CBTC | [BitSafe CBTC TestNet faucet](https://cbtc-faucet.bitsafe.finance/?network=testnet&token=cbtc) | The current faucet issues a fixed 0.001 CBTC. The recipient must accept the transfer, and its hosting node needs the DA Utility Registry. |

### Why a Fresh Wallet May Still Show No Symbolon Market

Your wallet participant must support the required packages and read access on the same synchronizer. A fresh party also needs the relevant market records shared with it. The existing registered-lender directory uses DevNet account authorization; connecting a TestNet wallet does not register it through that route.

Real-token adapters remain unimplemented in this TestNet profile. Receiving CC, USDCx or CBTC therefore does not enable a Symbolon quote or settlement. Keep the wallet rehearsal and the DevNet financing demo as separate checks.
