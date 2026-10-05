# Hackathon evidence and disclosure

Symbolon is being developed for [HackCanton Season 3](https://hackathon.appsfactory.cc/season-3). The intended product fit is a financial-application workflow on Canton. Final track selection, team eligibility, activity requirements and challenge rules must be checked against the current organizer requirements when preparing the submission.

## Pre-existing baseline

The repository already contained work before the Season 3 build period, with a baseline commit dated **28 August 2026** identified during project review. That baseline includes the concept, a Daml repo scaffold, tests, branding and frontend work. It must not be described as entirely created during the hackathon.

Separate the starting revision from changes made within the eligible period. Preserve the actual commit identifiers and dates in the submission record. Explain what the new work changes: correctness checks, asset reservation, oracle/issuer validation, browser behavior, reproducibility, documentation and any later verified integration. Use the final diff rather than a recollection of which features were present.

## Evidence package

| Claim | Suitable evidence |
| --- | --- |
| Core model compiles | SDK version, build command and exit result |
| Lifecycle and adversarial checks pass | Script names, test output and tested source revision |
| Browser workflow functions | Short recording with actual committed results and environment label |
| Cash/collateral settlement is atomic | Contract choice plus successful and rejected transaction checks |
| Losing dealer lacks access | Party-scoped queries and assertions for the same trade |
| Wallet works on a network | Wallet/browser/version, participant/network, package and submitted actions |
| Real token integration | Official instrument identity, adapter source and successful token transactions |
| User need is validated | Dated consent-aware interview notes and concrete findings |

Do not substitute screenshots of a form for committed transactions, or a local sandbox for an asserted shared DevNet deployment. Include a clear environment label in the recording.

## Suggested demonstration order

Explain the proposed user's financing problem; show two separate dealer requests; accept one quote; show both settlement legs and the fixed due amount; demonstrate the losing dealer's limited view; change a simulated mark; show health factor below `1.00`, a margin call and a successful top-up; then close through repurchase. On a separate position, show that an uncured call requires a new post-cure mark still below `1.00` before the dealer can liquidate. Distinguish this from maturity default. End by stating what remains simulated and what the next integration will prove.

The [complete walkthrough](../guides/demo.md) provides operational details. A pitch should focus on the value of the workflow and its evidence rather than count planned features as delivered.

## Development diary

Keep diary answers factual and dated. Record completed work, failures, decisions and next tests. Product assumptions remain assumptions until investigated. No user interviews, validation metrics, audits, partnerships or volumes should be invented to advance an activity milestone.

Daily platform activity and MANA eligibility are administered by the organizer's application. A diary response by itself does not prove that an account has satisfied its claim or burn requirements. Track the platform's visible state separately from development progress.
