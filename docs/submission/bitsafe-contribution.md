# Symbolon — BitSafe Contribution Pool submission

**Challenge:** BitSafe Contribution Pool

**Entry type:** Application integration / custom Daml module

**Demonstrated environment:** Reproducible LocalNet, with simulated assets

## Challenge description — copy into the submission

Symbolon integrates BitSafe Decentralization Manager into collateral-price
governance for a private fixed-rate repo application on Canton.

A decentralized oracle party is hosted across three LocalNet participants.
Three governance members are configured, and publishing a collateral-price
mark through the governance workflow requires two confirmations. An execution
attempt with one confirmation fails; two confirmations succeed. Custom Daml
`GovernableAction` templates connect DecMan to Symbolon's actual `PriceFeed`.

The demonstrated mark changes from 60,000 to 36,000 and moves an active repo's
health factor from 1.43 to 0.86. The dealer issues a margin call using that
exact governed feed, the borrower adds collateral, and the repo closes as
`Repurchased`. The fixed contractual repayment remains 1,004.3333333333
USDCx-demo throughout the workflow.

The integration includes public source, pinned setup and run instructions,
below-threshold rejection evidence, matching execution update IDs from all
three participant audits, and browser financing receipts.

All LocalNet participants and managers share one operator host. Assets and
marks are simulated. The public Symbolon app additionally runs on shared
HackCanton DevNet; live DevNet DecMan deployment and independent operators
are outside this Contribution Pool demonstration.

## Links to include

- **Project:** https://symbolon.endpx.cloud/app
- **Repository:** https://github.com/EndPx/symbolon
- **Tested source branch:** https://github.com/EndPx/symbolon/tree/codex/public-devnet-app
- **Installation and reproduction:** https://github.com/EndPx/symbolon/blob/codex/public-devnet-app/infra/decman/README.md
- **Installed LocalNet and browser proof:** https://github.com/EndPx/symbolon/blob/codex/public-devnet-app/docs/submission/evidence/bitsafe-vps-localnet.md
- **Raw retained evidence:** https://github.com/EndPx/symbolon/blob/codex/public-devnet-app/docs/submission/evidence/bitsafe-vps-localnet.json
- **Earlier clean CI run:** https://github.com/EndPx/symbolon/actions/runs/37341484064

The tested installation source is commit `ed22672` on the linked branch. PR #5
is ready for review but has not been merged. Keep this tested ref in the
submission so the new installer/evidence files are reachable, or update links
to the resulting main revision after a reviewed merge. The repository's older
main revision already contains the October 5 reproducible DecMan proof.

## Recommended short recording

Record the installed LocalNet integration with a persistent caption:

`Canton LocalNet · simulated cBTC-demo / USDCx-demo · one operator host`

Show these scenes in order:

1. Symbolon fixed-rate quote and repayment amount before settlement.
2. DecMan party: three participants, governance threshold two.
3. One-confirmation execution rejected, with the old mark unchanged.
4. Two confirmations execute the new mark; show the execution/audit reference.
5. Symbolon reads the replacement feed and shows the margin shortfall.
6. Dealer margin call, borrower top-up, and repurchase with unchanged repayment.
7. `Repurchased`, returned collateral, and the correlated closing receipt.

A two-to-three-minute clip is a presentation recommendation, not a separately
verified BitSafe duration rule. Existing `symbolon-local-demo.mp4` is the
earlier local CETH/CUSD core workflow; it does not itself show this installed
DecMan integration. The dedicated BitSafe recording remains to be produced.

## Submission scope and access

Use the public project/repository/video links in the dashboard. Localhost
15173 and 18081–18083 are private operator addresses and are not public judge
links. Judges can reproduce the LocalNet from the runbook; no VPS credentials
or public exposure of the unauthenticated sandbox are needed.

Select the Contribution Pool route in the available BitSafe challenge entry.
The precise current option label and account eligibility were not verified:
the dashboard session inspected on 8 October showed Sign In. Confirm the
saved challenge selection and ordinary HackCanton profile/activity/Mana
requirements in the authenticated dashboard before the final submission.

This is an application integration submission. An upstream framework PR is
not claimed; the integration source, custom templates and reproducible app
effect are supplied in the project's public repository.

## Official requirements

- [BitSafe challenge brief](https://bitsafe.notion.site/BitSafe-Challenge-Decentralizing-Apps-on-Canton-3db636dd0ba5804ba3e0ec08aec56638)
- [Official LocalNet starter](https://github.com/DLC-link/decentralization-manager/blob/hackathon/hackathon/README.md)

The brief requires a reproducible LocalNet demonstration and enough setup/run
instructions for judges. Shared-control evidence must fail below the required
confirmation threshold and succeed when it is met. Declare operators and
thresholds accurately; multiple participants on one host are not independent
operators or outage-tolerance evidence. Sponsor acceptance and prizes remain
judging decisions.
