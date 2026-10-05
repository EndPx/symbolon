# DevNet first, one release for both networks

Symbolon targets DevNet first. The intended production pair is cBTC / USDCx. The engineering goal is to test a release on DevNet and promote **the same frontend bundle and DAR bytes** to MainNet. Network addresses and asset identities belong in deployment configuration, not separate copies of the application.

This release establishes runtime configuration and package pinning. It does **not** yet implement the official token adapter. The current DAR consumes demo holdings; MainNet trading remains blocked. Implementing the adapter is still code work. Once that implementation passes on DevNet, promoting that tested release should require configuration and deployment operations only.

## Public runtime configuration

`config/deployments/devnet.json` and `config/deployments/mainnet.json` use the same schema. They select the wallet network, authenticated participant origin, synchronizer, reviewed Symbolon package hash, asset administrator and package identities, adapter type, signing enablement and release evidence. These files contain no authentication token, private key or participant administration credential.

The browser loads `/deployment.json` with caching disabled before initializing the desk. A missing or invalid file disables remote signing. A mismatched wallet cannot trade. Remote command identifiers and package selection use the configured package hash. Contracts from another package are excluded from the loaded book. Local demos resolve `#symbolon-v2` against their own sandbox.

The current profiles deliberately omit identities that have not been verified. A ticker is never enough to identify a Canton asset. USDCx's published MainNet administrator appears in the MainNet profile as a research reference; participant package vetting and transaction evidence remain required. DevNet uses its own administrators and asset packages. Test asset identities must not be copied into MainNet.

## Configure without rebuilding

From the repository root:

```bash
node web/node_modules/tsx/dist/cli.mjs scripts/configure-deployment.mjs devnet
npm --prefix web run build

# Configure the already-built artifact. JS/CSS files remain identical.
node web/node_modules/tsx/dist/cli.mjs scripts/configure-deployment.mjs mainnet --dist
```

The second command prepares an **inactive MainNet profile**, not a MainNet release. The configuration helper rejects `tradingEnabled: true` when identities, evidence or supported adapter capabilities are missing. Serving a different config never implements a new token adapter or uploads a package to Canton.

Frontend guards are a product release control, not a ledger security boundary. Authorization, collateral locks and economic rules must remain enforceable in Daml even if a caller bypasses the browser.

## Release promotion sequence

1. Build immutable artifacts once. Record source commit, SDK, package IDs and SHA-256 digests.
2. Upload/vet that release on the chosen DevNet participant. Use verified DevNet token identities, wallet account and synchronizer.
3. Complete the repo lifecycle with real adapter semantics: quote funding, cancellation, atomic opening exchange, price updates, margin, repayment and collateral return. Test failed authorization, token precision, fees, stale quotes and recovery.
4. Reconcile committed receipts and the private views of both counterparties and an unrelated party. Complete the [MainNet release record](mainnet-readiness.md).
5. Configure MainNet identities, topology, fee budget and operator credentials outside the public bundle. Upload/vet the **same** reviewed DAR. Verify its hash against the DevNet artifact.
6. Deploy the same static assets with the MainNet runtime JSON. Test read access before enabling the approved small-value pilot.

No current DevNet transaction, real cBTC/USDCx settlement or MainNet release is claimed by these instructions. Current local proof and the older DevNet package are recorded separately in [status](../reference/status.md).

## Version and rollback

The revised core is `symbolon-v2` version `0.2.0`. The older DevNet `symbolon-0.1.0` package is a separate baseline. Different package names avoid pretending that incompatible historical contracts were upgraded. There is no migration of old open positions in this release.

A code change after DevNet verification creates a new release and restarts verification. Rollback must account for existing contracts; changing a web config cannot undo a committed trade, package upload or ledger state transition. Pause new signing and coordinate active positions with the participant operator.
