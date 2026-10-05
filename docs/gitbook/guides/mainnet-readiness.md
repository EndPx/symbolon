# MainNet release readiness

The intended real-asset pair is **cBTC collateral / USDCx cash**. The current release is a working local prototype. MainNet signing is disabled in the application until the release evidence below exists. A completed local lifecycle or a wallet connection does not provide real token custody, a production oracle, or collateral-sale accounting.

## Asset identity and settlement

Circle publishes the MainNet USDCx instrument ID as `USDCx` and its administrator as `decentralized-usdc-interchain-rep::12208115f1e168dd7e792320be9c4ca720c751a02a3053c7606e1c1cd3dad9bf60ef`. This is a source reference, not verification of the participant's currently vetted packages. Confirm both with the selected operator before using assets. [Circle's USDCx announcement](https://www.circle.com/blog/usdcx-on-canton-now-available-via-circle-xreserve)

The core repo consumes `Symbolon.DemoAsset.Holding`. That template is not the official cBTC or USDCx holding and cannot spend a wallet's real token balance. The real adapters need official package IDs and interfaces, transfer/accept contexts, disclosed contracts, recipient eligibility, asset precision, fees and a supported synchronizer. Test both asset legs committing atomically, reservation/cancellation, replay and wrong-issuer rejection. Confirm the cBTC administrator and packages with BitSafe rather than inferring identity from a ticker.

## Oracle and closeout

The current oracle can create multiple active feeds for the same pair. The UI selects a recent mark, while Daml validates only the supplied mark's identity and age. Real-asset release needs a canonical agreed feed lineage and an independently reviewed pricing policy. Threshold approval controls a governance path but does not certify that a price is economically accurate or prevent privileged direct submission unless topology/access rules enforce that boundary.

The local `Liquidate` choice gives all pledged demo collateral to the dealer after a failed cure, with a post-cure mark and health factor below `1.00`. It models neither a sale nor realized proceeds. Before real assets, the closeout agreement and implementation must account for sale/valuation costs, borrower surplus, residual debt, settlement timing and recovery obligations. Healthy-price recovery and stale/oracle-outage cases need explicit procedures.

## Operator release record

`config/mainnet-release.json` records the target asset identities and currently unmet gates. Check it with:

```bash
node scripts/check-mainnet.mjs
```

The command deliberately fails while required evidence is missing. It is an evidence inventory, not a security audit. Required records include the exact reviewed core package ID, authenticated participant, asset adapters and network transactions, canonical oracle policy, closeout accounting, installed-wallet workflow, independent review and recovery/fee procedures. Keep credentials outside this file and all public frontend environment variables.

Package upload, vetting and network execution must be performed on the selected hosting path. The September shared DevNet package predates liquidation and the BitSafe adapter. No package on MainNet, MainNet repo transaction or live cBTC/USDCx settlement is claimed by this release.

## First pilot

After gates pass, start with a small, reviewed fee budget and named borrower/dealer parties. Record one complete repo, every required transfer acceptance, the cash repayment and return of collateral. Reconcile the committed ledger receipt before retrying an uncertain submission. Agree who monitors oracle freshness and cure deadlines, and rehearse recovery before increasing value.
