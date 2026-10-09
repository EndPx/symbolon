# Canton TestNet wallet connection rehearsal

Prepared 9 October 2026. This is a connection/read rehearsal, not a completed TestNet financing deployment. The default public app remains shared HackCanton DevNet.

Public connection app: https://symbolon-testnet-snowy.vercel.app/app . Its production alias was verified without Vercel authentication. Build/deployment evidence does not demonstrate a wallet signature or financing transaction.

## Public build

Use `npm.cmd run build:testnet` for the separately published TestNet connection app. It selects the disabled manifest into `dist/deployment.json` without changing the source/default DevNet manifest. Publish the built static assets to the separate `symbolon-testnet` Vercel project, with `/app` rewritten to `/index.html`. Its canonical production domain is publicly accessible. The original project's additional alias remained behind Vercel authentication, so it is not used as the judging URL. The existing shared DevNet app keeps its URL.

## Start the connection profile

From `web`, run `npm.cmd run dev:testnet`, then open `http://127.0.0.1:5174/app` in the browser/profile containing the TestNet wallet extension. The in-app browser does not necessarily contain those extensions.

This profile serves `deployment.testnet.json`, includes Send Connect and Grofty Wallet TestNet, disables the LocalNet party picker and has no local ledger proxy. Package, participant and synchronizer fields are deliberately empty. TestNet financing stays blocked even if configuration copies DevNet values or changes `tradingEnabled`.

Grofty checks the provider version, allocated primary party and live network around reads. Send checks its live connection, allocated party and network around its own-party Ledger API reads. Switching party or network invalidates the old session. Neither TestNet path submits financing commands.

## Prepare the two wallets

1. **Send:** select TestNet in Send Connect, finish setup at [testnet.cantonwallet.com](https://testnet.cantonwallet.com), then connect on the app page. Check the reported network and allocated party. [Official guide](https://sigilry.org/guides/send-connect-testnet/).
2. **Grofty:** install the separate TestNet extension, create a new wallet and obtain a personal invitation code if required. The wallet's Party Hint is a name, not a financing role. Complete password/recovery-phrase steps yourself. [Official guide](https://dex-testnet.grofty.cc/testnet).
3. **Test cBTC:** [BitSafe Faucet](https://cbtc-faucet.bitsafe.finance/?network=testnet&token=cbtc) exposes TestNet CBTC. On 9 October 2026 it offered a fixed 0.001 CBTC request. The recipient must accept the transfer and its node must have DA Utility Registry installed. Verify the accepted holding and issuer identity; a request alone is not a received balance.
4. **CC/USDCx:** follow the wallet team's TestNet funding and preapproval instructions. Same-name balances on another network or issuer are not interchangeable.

The public app's Faucet tab links to [Canton Foundation CC requests](https://testnet-faucet.canton.foundation/), [Circle's Sepolia USDC faucet](https://faucet.circle.com/) and [xReserve deposits](https://digital-asset.github.io/xreserve-deposits/). The Foundation form defaults to 100 CC and states processing once daily Monday–Friday. USDCx uses Sepolia USDC deposited through xReserve to the Canton TestNet party; Sepolia ETH is needed for deposit gas. No faucet claim or bridge transaction was submitted by this deployment task.

## What still blocks an RFQ and settlement demo

Current financing contracts exchange `Symbolon.DemoAsset.Holding`. Faucet cBTC and token-standard USDCx are different assets. A TestNet flow needs reviewed token adapters, exact issuer/instrument identities, wallet-participant package vetting, a common synchronizer, an oracle policy and a wallet-authorized lender-registration path. The current directory authenticates hosted HackCanton DevNet accounts, not arbitrary TestNet wallet identities.

Before enabling financing, obtain:

- The process for uploading and vetting custom Symbolon DARs on the participants hosting both wallet parties.
- Operator-authorized deployment access and the common synchronizer.
- Supported cBTC/USDCx token-standard, allocation/settlement and Utility Registry packages.
- Actual accepted token holdings and matching issuer/instrument IDs.

Suggested message to the wallet teams (draft only):

> We are preparing Symbolon, a bilateral fixed-rate repo app, for Canton TestNet with one Grofty wallet and one Send wallet. Can your TestNet participant upload and vet our custom Symbolon DARs, and what is the process? We also need the supported synchronizer and token-standard interfaces for cBTC/USDCx allocation and atomic settlement. Is DA Utility Registry installed for receiving BitSafe faucet cBTC? We will keep financing disabled until package and asset compatibility are verified.

## Submission environment boundaries

The [Season 3 rules](https://hackathon.appsfactory.cc/season-3#rules), inspected on 9 October 2026, require meaningful Canton integration and a working prototype/live or recorded demo. They do not specify DevNet as the only network. Sponsor challenge conditions remain separate. BitSafe Contribution Pool uses reproducible LocalNet work; Gold specifies DevNet or MainNet.

Keep existing shared DevNet and LocalNet receipts labelled as their actual environments. They are not TestNet wallet execution.
