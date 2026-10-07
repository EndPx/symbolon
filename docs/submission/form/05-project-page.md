# Project page — Symbolon

## Project name

Symbolon

## Track

Financial Applications: DeFi, Exchanges & Prediction Markets

## Challenge

BitSafe — Contribution Pool. Do not describe the ordinary hosted-party DevNet run as the Gold decentralized-party deployment. Grofty is outside the current challenge scope.

## Elevator Pitch

Floating-rate borrowing makes interest expense change while a position is open. Symbolon helps Canton asset holders agree a fixed annualized rate and know the exact contractual principal-plus-interest repayment amount before they borrow.

Symbolon is a private, bilateral repo-style financing app. Borrowers request offers from selected dealers, compare rates and terms, and accept a quote backed by reserved dealer cash. Daml settles cash against pledged collateral atomically. The prototype implements margin calls, top-ups, substitution, repurchase, and separate dealer actions for uncured-margin liquidation or maturity default. Each dealer sees its own quote; the borrower compares addressed offers. Issuers and hosting operators remain trust dependencies.

The MVP has completed a simulated-asset repo on shared HackCanton DevNet with 20 committed transactions. A separate three-participant BitSafe LocalNet run demonstrates a 2-of-3 governed oracle mark affecting margin handling. The intended production pair is cBTC / USDCx; real-token adapters and MainNet wallet execution remain future work.

The benefit is certainty about the agreed repayment amount. Current early repurchase pays the full agreed amount; network fees and collateral costs remain separate. Fixed rate does not guarantee cheaper borrowing, successful repayment or protection against liquidation.

## Tech Stack

Daml, Canton Network, TypeScript, React, Vite, Canton JSON Ledger API, BitSafe DecMan, PartyLayer, Docker

## Public links

- **Website:** https://symbolon.endpx.cloud/
- **Live app:** https://symbolon.endpx.cloud/app
- **GitHub:** https://github.com/EndPx/symbolon
- **GitBook:** https://symbolon.gitbook.io/symbolon-docs/
- **Shared DevNet evidence:** https://github.com/EndPx/symbolon/blob/main/docs/submission/evidence/shared-devnet.md
- **BitSafe LocalNet evidence:** https://github.com/EndPx/symbolon/blob/main/docs/submission/evidence/bitsafe-localnet.json
- **Recorded local UI workflow:** https://github.com/EndPx/symbolon/blob/main/docs/submission/symbolon-local-demo.mp4

The public app requires a supported wallet/environment; it is not a seeded judge sandbox. The recorded local video is downloadable from GitHub and lasts 145.96 seconds. It is a local simulated CETH/CUSD workflow, not a shared DevNet screen recording. No public simulator `/demo` page is required or added.

## Logo and contacts

- **Logo:** existing `web/public/brand/logo-mark.png`; use the platform's recommended 480×480 PNG/JPG output.
- **Project Telegram / X:** leave blank if no dedicated project account exists. Do not invent handles.
- **Required Telegram / Email:** use the team lead's real preferred contact details. Those details are not populated in this document.
- **Discord:** optional; use an actual handle if desired.

## Before the final submission action

Verify the saved profile fields, public repo/video/pitch links, track and Contribution Pool selection. The current six-slide deck needs its stale DevNet wording updated before it is used as the final pitch; these five written materials are a separate submission text pack, not a declaration that the deck has been updated. Verify at least 1,000 Mana accumulated and burned, at least 10 days of activity, a nonempty journal and a complete profile. Account eligibility is currently unverified. Do not claim these steps are complete merely because these documents are ready.
