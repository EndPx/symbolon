# Symbolon submission materials

Symbolon is a fixed-rate repo desk on Canton with open requests and private bilateral quotes. Borrowers publish financing terms once, lenders set their own APR and fund quotes directly, and the borrower compares the offers before receiving cash against pledged assets. The borrower knows the contractual repurchase amount before settlement. Fixed rate does not remove collateral or counterparty risk.

The primary value is a known contractual principal-plus-interest amount rather than ongoing exposure to floating-rate interest changes. Use the [five separate submission Markdown files](form/README.md) for Value, ICP, Metrics, GTM and the project-page Elevator Pitch. They include the complete disclosed mechanism and distinguish test activity, customer hypotheses and proposed targets.

## Judge's first look

1. Open the [Symbolon app](https://symbolon.endpx.cloud/app) and [documentation](https://symbolon.gitbook.io/symbolon-docs/). Watch the [recorded local Canton workflow](symbolon-local-demo.mp4) for quote comparison, settlement, margin handling and repurchase with a committed ledger receipt.
2. Follow the root README to start the real local Canton desk. Its UI submits commands and displays committed update IDs.
3. Review the Daml tests, asset locks and exact settlement inputs. The repo model is `symbolon-v2` v0.2.0; the old shared DevNet package is separate.
4. Review the BitSafe governance adapter and reproducible three-node LocalNet runner. Credit an official multi-node execution only when its JSON evidence and successful workflow run are available.
5. Review the [shared DevNet record](evidence/shared-devnet.md): 20 committed receipts, the failed one-confirmation execution, governed mark, margin call, top-up and `Repurchased`. The [original JSON](evidence/shared-devnet.json) retains the exact actor mapping and timestamped states. This is a one-participant Ledger API run, separate from the three-participant LocalNet DecMan proof.
6. Review the latest [direct Open RFQ cycle](evidence/open-rfq-devnet.md): an actual borrower publication, 7% private funded quote, atomic settlement/request withdrawal and repurchase from the public app. This is founder-operated synthetic-party evidence; it does not add external customer or pilot counts.

## Submission text

**Project name:** Symbolon

**Elevator pitch:** Floating-rate borrowing makes interest expense change while a position is open. Symbolon is a private fixed-rate financing desk on Canton: borrowers compare dealer-funded quotes and agree the exact contractual principal-plus-interest amount before settlement. Daml settles cash against pledged collateral atomically and enforces collateral and closing actions. The MVP has completed a simulated-asset repo on shared DevNet; the separate three-participant BitSafe LocalNet run demonstrates governed oracle marks affecting margin handling. Real cBTC/USDCx adapters and production wallet execution remain future work. Fixed interest does not remove collateral risk, network costs or counterparty risk. [Full project-page field](form/05-project-page.md).

**Technology:** Daml SDK 3.5.2, Canton, TypeScript, React 19, Vite, Canton JSON Ledger API, PartyLayer, BitSafe DecMan GovernableAction.

**Challenge focus:** BitSafe Contribution Pool. Gold deployment and Grofty bounty work are deferred.

**Target user:** A treasury manager at a small or mid-sized digital-asset fund with Canton asset exposure or a concrete adoption plan, plus its financing lender. The profile remains a hypothesis. One informal borrower conversation and episode follow-up are recorded in [borrower discovery](borrower-discovery.md); institutional ICP interviews and external app use remain unverified.

**Product evidence:** Eleven core Daml Script entries; two BitSafe governance scripts; frontend and deployment tests; real local Canton lifecycle and browser evidence. Record final counts and revision from the release run. Do not use an older passing log to claim a changed release passes.

**What is new:** Exact cash reservations and pledged collateral locks, issuer/denomination/freshness checks, health-factor liquidation guards, improved desk layout, wallet receipt handling, original GitBook sources, runtime network profiles and BitSafe governance integration. The August 28 baseline is pre-existing work and is disclosed in the GitBook submission record.

**What remains:** Real cBTC/USDCx adapters, canonical oracle lineage, realized closeout/surplus/shortfall accounting, installed-wallet verification, independent review and production operations. The shared DevNet Ledger API flow is complete; no MainNet release, adoption, audit, partnership or real liquidity claim is made.

## Delivery files

- [Pitch deck](symbolon-pitch-final.pptx)
- [60-second pitch](pitch.md)
- [Demo recording storyboard](demo-video.md)
- [Recorded local UI demo, 2 min 26 sec](symbolon-local-demo.mp4)
- [Committed browser repurchase receipt](evidence/browser-repurchase.json)
- [Full technical documentation](../gitbook/SUMMARY.md)
- [Network promotion procedure](../gitbook/guides/network-promotion.md)
- [Current evidence and limits](../gitbook/reference/status.md)
- [Verified BitSafe three-participant proof](evidence/bitsafe-localnet.json)
- [Shared DevNet judge summary](evidence/shared-devnet.md)
- [Original shared DevNet receipts and state](evidence/shared-devnet.json)
- [Shared DevNet provisioning and runner guide](shared-devnet-proof.md)

Supply verified public URLs and the tested revision in the final hackathon form. A script or storyboard is not a published video; GitBook source is not a hosted GitBook. Final form submission remains a participant action.
