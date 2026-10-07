# Symbolon

**A confidential, fixed-rate bilateral repo desk on Canton.**

Floating-rate borrowing leaves future interest expense uncertain. Symbolon lets a borrower agree a dealer's fixed annualized rate and exact principal-plus-interest repurchase amount before accepting financing on Canton. Cash and pledged collateral settle atomically. The benefit is a known contractual repayment amount; network fees, collateral maintenance, margin calls and counterparty risk remain.

The name comes from the Greek *symbolon*: two matching halves of a token used to recognize an agreement. Symbolon applies that idea to bilateral trade terms with explicit, limited ledger visibility.

Open the [Symbolon desk](https://symbolon.endpx.cloud/app) for the application, and the [documentation](https://symbolon.gitbook.io/symbolon-docs/) for the product and technical guides. The [recorded local Canton workflow](docs/submission/symbolon-local-demo.mp4) shows the ledger-backed repo lifecycle. The target real-asset pair is **cBTC / USDCx**, with DevNet verification before MainNet promotion. [One release, runtime network profiles](docs/gitbook/guides/network-promotion.md) explains the configuration and remaining adapter work.

[Submission text pack](docs/submission/form/README.md) contains separate Value, ICP, Metrics, GTM and project-page Markdown. It distinguishes implemented behavior from customer hypotheses and labels synthetic test actors separately from users.

The current core is **`symbolon-v2` v0.2.0**; old `symbolon-0.1.0` DevNet contracts are a separate baseline. On **5 October 2026**, the revised release passed **11 core Daml scripts, 2 BitSafe scripts and 27 frontend tests**. Native local Canton completed both lifecycle scripts at offsets **55 → 202** and the BitSafe threshold-to-margin scenario at **202 → 261**.

On **7 October 2026**, the revised release completed a repo on **shared HackCanton DevNet**: two governance confirmations published a lower simulated mark, followed by a margin call, top-up and `ClosedRepo: Repurchased`. The [judge evidence](docs/submission/evidence/shared-devnet.md) retains **20 committed receipts, one expected threshold rejection and five timestamped snapshots** at offsets **2293352 → 2293507**. This used the frontend action builders through authenticated Ledger API submission on one participant, with simulated cBTC-demo / USDCx-demo. It does not establish wallet signing, DevNet decentralized-party hosting or real-token settlement.

## What works

- Separate private RFQs and funded quotes for each counterparty.
- Exact-sized quote cash reservations and locked collateral; an owner cannot spend either unilaterally while committed.
- Atomic cash/collateral settlement, ACT/360 fixed repurchase price, full-price early repurchase.
- Agreed oracle, issuer and cash denomination checks; freshness and initial margin validation.
- Health factor, margin call, sufficient top-up, recovered-mark call resolution, negotiated collateral substitution, dealer liquidation after an uncured call, separate maturity default and closing receipts.
- Borrower/dealer/oracle screens, a visible financing-pair browser, available versus locked holdings, transaction receipts, local demo roles and wallet transport.

This is a **working prototype using simulated assets and marks**. `Symbolon.DemoAsset.Holding` is not a CIP-56 token. Its trusted issuer can mint/archive holdings and sees asset movements. Per-party visibility tests on one local participant do not prove separation from that participant's administrator or independent hosting. [Read the privacy boundaries](docs/gitbook/architecture/privacy-and-trust.md).

## BitSafe Contribution Pool work

`daml-bitsafe` contains a `GovernableAction` proposal that lets a 2-of-3 governance group publish a Symbolon oracle mark. Its separate Daml Script proves that one confirmation cannot execute, while two confirmations update the feed and let the dealer call an undercollateralized repo. Build and run it with `./scripts/build-bitsafe.ps1` and `./scripts/verify-bitsafe-live.ps1`; see the [BitSafe LocalNet guide](docs/gitbook/guides/bitsafe-localnet.md). The official three-participant DecMan LocalNet also passed on 5 October 2026: [workflow and artifacts](https://github.com/EndPx/symbolon/actions/runs/37341484064). It completed threshold-governed mark publication, repo margin top-up and repurchase, with matching execution update IDs on all participants. [Evidence record](docs/submission/evidence/bitsafe-localnet.json).

## Run the complete demo

Prerequisites: PowerShell 7, `dpm` with Daml SDK **3.5.2**, Java compatible with the bundled Canton runtime, Node.js/npm. The verified local Canton runtime is **3.5.6**. Run from the repository root:

```powershell
./scripts/demo.ps1 build
./scripts/demo.ps1 start
./scripts/demo.ps1 seed
./scripts/demo.ps1 verify
Set-Location web
npm.cmd ci
npm.cmd test
node node_modules/tsx/dist/cli.mjs ../scripts/demo-http.mjs
npm.cmd run dev -- --host 127.0.0.1
```

Open **http://127.0.0.1:5173/app**. Select the seeded borrower/dealers using the local demo selector. Party identities are recorded in `.omc/demo/parties.json`. Follow the [complete demonstration](docs/gitbook/guides/demo.md) for quote comparison, settlement, margin, substitution, repayment, liquidation and maturity default.

`build` stages source in a fresh space-free directory because Daml's Windows dependency resolution mishandles paths with spaces. The default cache is `<project-drive>:\symbolon-build`; override it with a writable, space-free `SYMBOLON_BUILD_HOME`. DARs are copied back to each package's ignored `.daml/dist` directory. The helper never removes source or previous build directories.

Canton JSON API: `127.0.0.1:6864`; gRPC: `127.0.0.1:6865`. The unauthenticated local runtime is bound to loopback. To stop it, return to the repository root and run `./scripts/demo.ps1 stop`. Runtime state is ephemeral.

## Verification

The September 23, 2026 local verification built all three DARs and passed **10 Daml Script entries** (nine behavioral scenarios plus setup). The live happy path and full lifecycle passed on Canton at ledger offsets **94 → 238**. On September 28, the new health-factor liquidation path rebuilt all three DARs, passed **11 Daml Script entries**, and completed both wall-clock Canton flows at offsets **55 → 202**. A separate one-dealer browser run then reached `ClosedRepo: Liquidated` at local ledger offset **229**. Reproduce rather than relying on historical offsets:

```powershell
./scripts/demo.ps1 build
./scripts/demo.ps1 verify
Set-Location web
npm.cmd test
npm.cmd run build
npm.cmd run doctor
```

The contract suite isolates invalid terms, issuer mismatches, stale/future/wrong-denomination feeds, insufficient collateral, reserved-asset spending, replay, early liquidation, a pre-cure mark, recovered collateral value, maturity, cure deadlines and stale substitution refunds. Twenty-seven frontend and wallet tests cover party-scoped reads, committed receipts, price identity/freshness, health-factor arithmetic, exact balances, maturity, and Grofty behavior against a fake CIP-0103 provider. They are not a MainNet wallet test. The earlier `demo-http.mjs` run drove the actual frontend actions through the live JSON API: 19 successful submissions verified the pre-liquidation workflow (offsets 208 → 283), including an unauthorized reserved-fund spend rejection. Run it after installing the web dependencies and seeding the ledger. React Doctor is an additional static diagnostic, not a contract/security proof.

The browser completed an end-to-end local Canton flow: RFQs to two dealers, funded quotes at 5.2% and 5.8%, acceptance of the 5.2% quote, a simulated oracle mark move from 100 to 60 CUSD, margin call, 3 CETH top-up, and repayment. The 1,000 CUSD / 30-day repo closed for the agreed 1,004.3333333333 CUSD and returned 18 CETH of collateral. Landing and desk responsive checks and a production preview are recorded in the [verification status](docs/gitbook/reference/status.md), together with remaining limitations.

The newer liquidation browser run used a separate one-dealer 1,000 CUSD / 15 CETH repo. Health factor fell from **1.43** to **0.86** after a simulated mark changed from 100 to 60; the dealer issued a call, the oracle published another mark after the one-minute cure deadline, and the dealer confirmed liquidation. The desk displayed a committed receipt and `Liquidated` with HF **0.86**. Both browser runs use simulated assets and local Canton.

## Documentation

[Start the GitBook](docs/gitbook/README.md) · [Contents](docs/gitbook/SUMMARY.md) · [Architecture](docs/gitbook/architecture/overview.md) · [Why privacy](docs/gitbook/introduction/privacy.md) · [Contract/API reference](docs/gitbook/reference/api.md)

`.gitbook.yaml` points to `docs/gitbook`. [Symbolon Docs is published](https://symbolon.gitbook.io/symbolon-docs/) with original diagrams, guides, economics, security boundaries, deployment details and pilot plans. Reference research stays local and excluded from Git; it is not part of the publication.

## Wallets and deployment

The current **symbolon-v2 v0.2.0** and **symbolon-bitsafe v0.2.0** packages are uploaded and **Vetted** on shared DevNet participant `hackcanton-devnet-3`. The older `symbolon-0.1.0` installation remains a separate baseline. [Deployment evidence and package IDs](docs/gitbook/deployments/devnet.md) record the completed current-release repo and its remaining wallet/real-asset boundaries.

[Shared DevNet provisioning and reproduction](docs/submission/shared-devnet-proof.md) explains wallet onboarding, Console party setup and the local credential helper. To check retained evidence without connecting to a network, run `node scripts/verify-shared-devnet-evidence.mjs`.

The desk supports PartyLayer wallets for its configured network. A dedicated [Grofty Wallet adapter](docs/gitbook/guides/grofty.md) also remains in source through the official `@groftylabs/dapp-sdk@0.2.0`, but Grofty is **deferred and outside the current submission scope**. It is MainNet-only, requires extension 2.0.4 or newer, and has no verified Symbolon MainNet transaction. Never place access tokens or passwords in `VITE_` variables. The [wallet/DevNet guide](docs/gitbook/guides/wallet-devnet.md) distinguishes package upload, party allocation and a verified wallet transaction.

There is no MainNet Symbolon package/asset deployment or Grofty-signed product transaction in the evidence. Grofty access, real fee funding, authorized issuer/oracle/dealer parties and a supported real-asset model would be prerequisites if the bounty is resumed.

## HackCanton scope

The repository includes a pre-existing scaffold committed on **August 28, 2026**. HackCanton delivery began September 18; disclose the baseline and describe the delivery-phase changes separately. [Submission evidence](docs/gitbook/mission/submission.md) records the required distinctions.

The active challenge direction is the [BitSafe Contribution Pool LocalNet path](docs/gitbook/mission/challenges.md). The Grofty adapter remains in source but is deferred. The verified DecMan integration is confined to the official LocalNet; the shared DevNet record adds ordinary hosted-party governance and repo execution. Real cBTC/USDCx, independent hosting and a completed shared DevNet or MainNet wallet flow remain unverified. User validation and GTM remain [explicit hypotheses and a pilot plan](docs/gitbook/mission/validation.md), not invented traction.
