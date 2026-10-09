# LocalNet

LocalNet is the developer reproduction environment. It uses simulated assets and controlled price marks. It is separate from the hosted shared-DevNet application.

## What is demonstrated?

The standard workflow exercises requests, independently funded quotes, settlement, collateral management and repurchase. The separate BitSafe setup uses three participants and three DecMan managers on one operator host, with a configured 2-of-3 governance rule.

## Example: a governed mark and top-up

For 1,000 principal and 0.0250 collateral at 60,000, health is about 1.43. A governed 36,000 mark reduces it to about 0.86. The lender issues a margin call, a 0.0050 top-up restores health to about 1.03, and repurchase pays the unchanged agreed amount.

One confirmation fails the threshold; two commit the price-publication action. Retained participant audits identify the same relevant execution. These results demonstrate technical integration, not independent organizations or production price sourcing.

## Reproduce as a developer

Use the [BitSafe LocalNet runbook](https://github.com/EndPx/symbolon/tree/codex/public-devnet-app/infra/decman) and [retained execution evidence](https://github.com/EndPx/symbolon/tree/codex/public-devnet-app/docs/submission/evidence). Local installation and complete developer walkthroughs are kept in the repository rather than the ordinary User Guides.
