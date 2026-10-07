# Status and limitations

This page distinguishes source capabilities from operational evidence. The original browser and wall-clock Canton baseline is **23 September 2026**; the health-factor liquidation source/build update is **28 September 2026**. Development is ongoing; use the final verification output for the revision being reviewed.

## Shared-network execution: 7 October 2026

The revised `symbolon-v2` v0.2.0 and `symbolon-bitsafe` v0.2.0 executed on **NODERS shared HackCanton DevNet**, Canton **3.5.19**, participant `hackcanton-devnet-3`. Run `d2602fd8` finished at **2026-10-07T06:24:43.782Z** with **20 committed transactions**, one expected Daml threshold rejection and five timestamped state snapshots. Ledger offsets advanced **2293352 → 2293507**.

One confirmation could not execute the price action. Two confirmations changed the simulated cBTC-demo mark from **60,000 to 36,000**, reducing health factor from **1.428571 to 0.857143**. The dealer issued a margin call; 0.005 cBTC-demo restored health factor to **1.028571**; the borrower repurchased for the unchanged **1,004.3333333333 USDCx-demo**, returning all pledged collateral. The final ledger state has `ClosedRepo: Repurchased` and no open repo position.

[Shared DevNet](../deployments/devnet.md) provides the exact package/transaction identifiers. The [judge record](https://github.com/EndPx/symbolon/blob/main/docs/submission/evidence/shared-devnet.md) links original receipts, party mapping, snapshots and operator-log lookups. An offline checker validates consistency, returned unlocked balances and the exact source-file hashes; it does not replace authorized ledger verification.

This is a **single-participant Ledger API run using ordinary hosted parties and simulated assets**. It uses the application's action builders, without installed-wallet signing or DecMan services on DevNet. The separate three-participant LocalNet proof below remains the decentralized-party/DecMan evidence for Contribution Pool. MainNet and official cBTC/USDCx settlement remain unverified.

## Current release: 5 October 2026

`symbolon-v2` v0.2.0 passed **11 core Daml scripts, two BitSafe governance scripts and 27 frontend tests**. Native Canton passed both lifecycle scripts at offsets **55 → 202**, the local BitSafe mark-to-margin script at **202 → 261**, and the actual frontend HTTP actions with **19 successful submissions** at **261 → 336**.

The official BitSafe three-participant LocalNet also passed on tested revision `d261376586cf27385957f0816805ece850672498`. The [successful workflow](https://github.com/EndPx/symbolon/actions/runs/37341484064) built and tested the application on Linux, booted the pinned starter, distributed/vetted the DARs and executed the Symbolon workflow through three DecMan services. One confirmation failed with `Enough confirmations to execute action`; two approvals changed the mark. The repo reached a margin call, successful top-up and `Repurchased`. All three participants reported the same committed initialization and mark-execution update IDs, with participant-specific ledger offsets. This is **reproduced multi-participant LocalNet integration**, not DevNet/MainNet or a prize eligibility decision.

Core package ID: `1d40e972b56e42c279140639d33dc362b432f2c0f608c77ec36410f0395f3e19`. [Public evidence record](https://github.com/EndPx/symbolon/blob/codex/submission-devnet/docs/submission/evidence/bitsafe-localnet.json) preserves the exact revision, failure, closing contract, application receipts and all-node execution audit. CI artifacts retain the test logs and DARs. All asset balances and prices are simulated.

The current release is now uploaded/vetted and has completed the shared DevNet flow recorded above. The September package installation below remains historical baseline evidence. Real cBTC/USDCx token adapters and shared-network wallet signing remain unverified. [Network promotion](../guides/network-promotion.md) specifies the runtime profile and remaining MainNet gates.

On **6 October 2026 WIB**, the native local browser completed the two-dealer 5.2%/5.8% comparison, opening exchange, simulated CETH price drop, margin call, 3 CETH top-up and exact full repurchase again. It returned all 18 pledged CETH and displayed `Repurchased` plus update ID `1220c496f9730965356d7593c5f0c4cacf06ffe47f387db6a3d5daf2f95e6bc5ec79`. [Browser evidence](../../submission/evidence/browser-repurchase.json) and a captioned, edited screen recording of about 2 min 26 sec are included in `docs/submission`. This is a local simulated-asset recording, separate from the BitSafe CI run.

## Recorded local verification

On **23 September 2026 WIB** the PowerShell helper rebuilt all three DARs, passed **10/10 Daml IDE scripts** (nine substantive scenarios plus `setupDesk`), seeded a native **Canton 3.5.6** sandbox, and completed `liveHappyPath` and `liveLifecycle`. A repeat live verification passed both flows at ledger offsets **94 → 238**, timestamped `2026-09-23T15:16:06Z` in `.omc/demo/verification.json`.

This is local working-tree evidence. Shared DevNet package installation is recorded separately below; a successful wallet transaction there is not yet established. Repeat verification after material code changes and retain the final submitted revision alongside the logs.

On **28 September 2026**, the updated Daml source built all three DARs and passed **11/11 Daml Script entries**, including cure-deadline liquidation, rejection of a pre-deadline or pre-cure mark, recovered-mark rejection and borrower call resolution. The frontend passed **23/23 tests** and a production build. A fresh wall-clock Canton run passed `liveHappyPath` and `liveLifecycle`, advancing ledger offset **55 → 202**. The corresponding evidence is in ignored local `.omc/demo/verification.json`; it is a local run, not shared-network proof.

On **29 September 2026**, the separate `symbolon-bitsafe` package built against BitSafe's released governance DARs and its Daml Script passed. The script creates a funded Symbolon repo; one governance confirmation fails to execute its price proposal, two confirmations publish the lower mark, and the dealer then issues a margin call against that repo. The same script passed on a live, single-participant Canton sandbox, including a repeated run with fresh party names. `scripts/verify-bitsafe-live.ps1` recorded ledger offsets **167 → 224** in ignored local `.omc/demo/bitsafe-live.json`. This is a working Daml governance integration, not yet a three-node DecMan LocalNet run or a Contribution Pool acceptance decision. See the [BitSafe LocalNet guide](../guides/bitsafe-localnet.md).

A separate HTTP integration run imported the actual frontend action builders and Ledger API adapter. It passed **19 successful submissions**, with offsets **208 → 283**, across two private quotes, settlement, margin call, top-up, substitution and repurchase. It also checked reserved-spend rejection, balances and party visibility. The run allocated six isolated `http-demo-*` parties and did not reuse the browser's seeded desk. Client API/risk tests passed **9/9**. This adds real HTTP/client evidence while remaining a local-ledger test, not a wallet or shared-DevNet result.

## Shared DevNet package installation

On **23 September 2026 WIB**, the NODERS Console confirmed **DAR uploaded successfully**, showed **Your uploads: 1**, and listed `symbolon` version `0.1.0` as **Vetted** on participant `hackcanton-devnet-3` in **Devnet**.

Core package ID:

```text
29b7ac23ff40927030b00c65941fdc2d5a4869cd6941da1cd31b6d7e7811ba5d
```

That historical package ID matched the main DALF in the September 23 core DAR (SDK 3.5.2) and predates the health-factor liquidation change. It is separate from the current release's package IDs and October 7 shared-network receipts. Neither package installation alone demonstrates an authenticated wallet trade or multi-node party hosting.

## Recorded browser verification

The original browser happy path completed against the seeded local Canton ledger: the borrower requested **1,000 CUSD against 15 CETH for 30 days** from two dealers, received **5.2% and 5.8%** quotes, accepted the 5.2% offer, declined the other quote to refund its dealer's reserved cash, and paid the full **1,004.3333333333 CUSD** repurchase price. The position closed with the string outcome `Repurchased`; the pledged 15 CETH returned and the borrower's total CETH balance was restored to **400**. The UI displayed locked/free balances and committed-action receipts during that flow.

A later browser check of the updated desk repeated the two-dealer **5.2%/5.8%** quote and 1,000 CUSD / 15 CETH settlement. The oracle changed the simulated CETH mark from **100 to 60**; the dealer issued a margin call; the borrower added **3 CETH**, producing **18 × 60 = 1,080 CUSD** of collateral against **1,050 CUSD** required. The borrower then paid the full **1,004.3333333333 CUSD** repurchase amount and the desk displayed `ClosedRepo` with outcome `Repurchased`. This adds browser evidence for margin and top-up in the revised UI. It remains local Canton evidence, not a Grofty MainNet run.

On **28 September 2026**, a separate browser run exercised the new closeout branch through the UI. A single dealer funded a 1,000 CUSD repo against 15 CETH; health factor displayed **1.43** initially and **0.86** after an oracle mark changed from 100 to 60. The dealer opened a one-minute margin call. Liquidation remained disabled during cure, became available after the oracle refreshed the 60 mark following the deadline, and committed to `ClosedRepo: Liquidated` with HF **0.86**. The dealer's 15 demo CETH became unlocked. The local ledger was at offset **229** after this run; the update ID and exact sequence are stored in ignored `.omc/demo/browser-liquidation.json`. This demonstrates UI and local-ledger behavior, not a real asset sale or shared DevNet transaction.

Desktop at **1280 px** and tablet at **768 px** were checked without horizontal overflow. A dialog value-contrast issue observed at **375 px** was fixed. The landing page was also checked at **375, 768 and 1280 px** without horizontal overflow, including its privacy FAQ and rate-chart explanation. These targeted checks do not constitute a complete keyboard, assistive-technology or cross-browser review.

The production build loaded successfully in a separate browser preview. Its desk showed wallet connection only, without the local-party selector or development overlays, and emitted no console errors or warnings during that check. The optional model-viewer library remains a large separate bundle; it is now requested only when the footer mark approaches the viewport, with a static image fallback.

The latest React Doctor result was **87/100**, with no reported bug errors and seven remaining component-size/complexity/performance warnings. The poll timer and session-ref issues identified during this pass were fixed. This is a static code-quality result, not a Lighthouse or runtime-performance score. No Lighthouse score is claimed.

## Implementation boundary

The repository contains the bilateral repo model, a demo asset model, price-feed contracts, script-based tests, live setup and scenario scripts, a React desk and a wallet transport boundary. The model supports quote, atomic acceptance, collateral actions, repurchase, health-factor liquidation after an uncured margin call, and separate maturity default. The source includes security hardening for reserved cash, pledged holdings, asset identity, price recency and post-cure liquidation marks; those changes must be assessed together with their current tests.

The Grofty transport uses official SDK **0.2.0** with extension **2.0.4+**, an allocated MainNet primary party, own-party reads and `prepareExecuteAndWait`. It checks receipt correlation, handles session invalidation and retains optional disclosed-contract context. These are inspectable client behaviors. No installed-wallet MainNet repo, MainNet package provisioning, real token adapter or native bridge result has been recorded here. See [Grofty integration](../guides/grofty.md).

After the Grofty integration, the frontend suite passed **22/22 tests**, including **13 Grofty tests**, and the production build passed. The Grofty tests exercise the actual SDK 0.2.0 through a **fake CIP-0103 provider**. They validate adapter behavior under controlled responses; they do not connect an installed wallet, incur MainNet fees or prove network interoperability.

| Area | What can be assessed now | What is not claimed |
| --- | --- | --- |
| Contracts | Source, 11 Daml-script entries and live local liquidation lifecycle | Independent security audit |
| Local runtime | Seeded sandbox and wall-clock workflows | Production resilience or isolated institutional nodes |
| Shared DevNet | Current v0.2.0 packages vetted; governed mark, margin call, top-up and repurchase with 20 committed receipts | Wallet signing, real assets or DevNet multi-node party hosting |
| Grofty | Dedicated SDK source, 13 fake-provider tests and build | Installed-wallet MainNet repo execution or bounty qualification |
| Frontend | Local browser happy path, landing/desk responsive checks and production preview | Complete accessibility review or every wallet/browser/network combination |
| Assets | Simulated issuer/instrument holdings | Real cBTC collateral or a verified USD cash-token integration |
| Price feed | Agreed party and timestamp checks | Live market data or manipulation resistance |
| Privacy | Scoped contracts and party-level access tests | Secrecy from all hosting operators or asset issuers |
| Commercial need | Defined target and validation plan | Customer traction, revenue or completed interviews |
| GitBook | Published basic site with 55 source pages, including product, architecture, reference and operational navigation | Automated Git Sync or documentation proving network execution by itself |
| BitSafe Contribution Pool | Official three-participant DecMan LocalNet passed; all-node execution audit and Symbolon margin/top-up/repurchase effect verified | Shared DevNet/MainNet decentralized-party deployment, independent hosting, or award |
| Grofty | Source adapter and fake-provider tests remain available | Active submission scope, installed-wallet MainNet repo execution or bounty qualification |

## Risks remaining in the prototype

The demo issuer is trusted. A valid oracle timestamp does not make its value economically correct; the oracle can also create more than one active matching feed. Matching symbol text is insufficient without issuer identity, but even a correct identity does not establish value or enforceability of the underlying asset. Liquidation and maturity default transfer pledged demo collateral to the dealer; neither sells it, calculates realized proceeds/surplus/shortfall, enforces an external agreement or guarantees loss recovery.

Local sandbox access is privileged development infrastructure. Anyone with its administrative access may control parties and inspect hosted state. Publicly exposing it would invalidate the assumptions behind a private desk.

The frontend does not supply enterprise accounting, regulated identity onboarding, token custody, a production authorization gateway, alert delivery guarantees, disaster recovery, or a durable searchable event warehouse. It also does not implement automatic renewal, a third-party liquidation market, a secondary market, pooled liquidity or cross-chain financing.

## Reading test results correctly

An assertion suite demonstrates selected properties for its scenarios. It cannot establish the absence of all bugs, economic soundness for every asset, legal treatment, or production readiness. A live sandbox run adds runtime evidence but not necessarily wallet or multi-node evidence. Record failures and the exact tested environment alongside successful results.

When a gap is resolved, replace the corresponding limitation with concrete evidence and a reproducible command or network record. Do not remove a boundary just because a related feature was added to the interface.
