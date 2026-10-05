# Canton ecosystem contribution

Symbolon explores a bilateral fixed-term financing workflow for assets represented on Canton. The contribution is the lifecycle model: separate dealer requests, rate agreement, atomic opening and closing exchanges, oracle-checked margin, borrower top-up, mutually accepted substitution and a recorded default outcome.

## Why this workflow uses Canton

The borrower and dealer need to coordinate asset transfers and shared obligations while limiting routine disclosure to other dealers. Daml supplies explicit authority and contract-level participants. Canton supplies the execution and party-specific ledger views needed to run that model. The implementation is therefore more than a public web form with confidential fields hidden by CSS.

## Reusable engineering work

- A compact repo state machine with testable authorization and time boundaries.
- A separation between economic workflow and the demo asset/price dependencies.
- A browser transport boundary that can target a local ledger or a wallet.
- Reproducible checks for privacy, funding, asset identity and stale inputs.
- Documentation that states what a local proof does and does not demonstrate.

These components may be useful to other Canton builders even if customer research changes the initial commercial direction. Their reuse still requires evaluating the source, limitations and license terms; this documentation is not an audit endorsement.

## What is not claimed

Symbolon does not claim to be the first repo application on Canton, to replace existing institutional infrastructure, or to serve real customers today. It has not shown a live-token integration, economic volume, market liquidity or multi-institution production deployment. The [pilot plan](validation.md) describes how those assumptions could be tested in a narrower setting.
