# Challenge Plans

Symbolon's selected technical challenge path is BitSafe Contribution Pool. The integration demonstrates governed simulated price publication and its effect on a repo, using the official three-participant LocalNet starter and DecMan.

## Example: governance changes a position's coverage

1. A proposed simulated mark moves from 60,000 to 36,000.
2. One confirmation fails the configured threshold; it does not publish the mark.
3. Two confirmations satisfy the 2-of-3 rule and commit the governed replacement.
4. A repo with 0.0250 collateral and 1,000 principal moves from about 1.43 health to 0.86.
5. The lender issues a margin call; the borrower adds collateral and later repurchases for the unchanged agreed amount.

## Evidence and boundaries

The reproducible [integration runbook](https://github.com/EndPx/symbolon/tree/main/infra/decman) and [retained evidence](https://github.com/EndPx/symbolon/tree/main/docs/submission/evidence) include threshold rejection, execution and matching participant audits. The managers and participants share one operator host. This is not an independent-operator outage demonstration or a live DevNet decentralized-party deployment.

The selected entry is **BitSafe Challenge — Contribution Pool: Decentralizing Apps on Canton**. The current [challenge sheet](https://bitsafe.notion.site/BitSafe-Challenge-Decentralizing-Apps-on-Canton-3db636dd0ba5804ba3e0ec08aec56638) excludes Gold applicants from the Contribution Pool. The public shared-DevNet app is additional Symbolon execution evidence; it is not a Gold Decentralized Party deployment.

Gold own-node work and Grofty MainNet wallet execution are outside the current submission scope. Sponsor judging, eligibility and awards remain sponsor decisions rather than product capabilities.
