# Symbolon submission materials

Symbolon is a private, bilateral fixed-rate repo desk on Canton. Borrowers receive cash against pledged assets and agree the repurchase amount before settlement. Each dealer sees its own request and quote; the borrower compares the addressed offers. Fixed rate does not remove collateral or counterparty risk.

## Judge's first look

1. Open the [Symbolon app](https://symbolon.endpx.cloud/app) and [documentation](https://symbolon.gitbook.io/symbolon-docs/). Watch the [recorded local Canton workflow](symbolon-local-demo.mp4) for quote comparison, settlement, margin handling and repurchase with a committed ledger receipt.
2. Follow the root README to start the real local Canton desk. Its UI submits commands and displays committed update IDs.
3. Review the Daml tests, asset locks and exact settlement inputs. The repo model is `symbolon-v2` v0.2.0; the old shared DevNet package is separate.
4. Review the BitSafe governance adapter and reproducible three-node LocalNet runner. Credit an official multi-node execution only when its JSON evidence and successful workflow run are available.

## Submission text

**Project name:** Symbolon

**Elevator pitch:** Treasury teams holding tokenized assets need to compare financing terms without exposing their funding needs or dealer quotes. Symbolon combines private bilateral repo quotes, a fixed annualized rate and an agreed repurchase amount with collateral management on Canton. The local prototype reserves dealer cash, exchanges cash and collateral atomically, tracks health factor, handles margin calls and top-ups, and closes through repurchase or dealer-led closeout. A BitSafe GovernableAction integrates threshold approval into simulated oracle marks. The intended real-asset pair is cBTC / USDCx. Assets and marks in the demonstrated prototype are simulated; shared DevNet execution and official token adapters still require verification. We have engineering evidence, not customer demand evidence.

**Technology:** Daml SDK 3.5.2, Canton, TypeScript, React 19, Vite, Canton JSON Ledger API, PartyLayer, BitSafe DecMan GovernableAction.

**Challenge focus:** BitSafe Contribution Pool. Gold deployment and Grofty bounty work are deferred.

**Target user:** A treasury manager at a digital-asset fund holding tokenized assets on Canton, plus its financing dealer. The profile remains a hypothesis; there are no customer interviews or external users yet.

**Product evidence:** Eleven core Daml Script entries; two BitSafe governance scripts; frontend and deployment tests; real local Canton lifecycle and browser evidence. Record final counts and revision from the release run. Do not use an older passing log to claim a changed release passes.

**What is new:** Exact cash reservations and pledged collateral locks, issuer/denomination/freshness checks, health-factor liquidation guards, improved desk layout, wallet receipt handling, original GitBook sources, runtime network profiles and BitSafe governance integration. The August 28 baseline is pre-existing work and is disclosed in the GitBook submission record.

**What remains:** Real cBTC/USDCx adapters, canonical oracle lineage, realized closeout/surplus/shortfall accounting, completed shared DevNet flow, installed-wallet verification, independent review and production operations. No MainNet release, adoption, audit, partnership or real liquidity claim is made.

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

Supply verified public URLs and the tested revision in the final hackathon form. A script or storyboard is not a published video; GitBook source is not a hosted GitBook. Final form submission remains a participant action.
