# Roadmap

The roadmap orders work by the evidence needed to justify the next step. It is not a promise of launch dates or a claim that all listed capabilities are underway.

## Phase 1: reproducible prototype

Deliver a coherent local environment, contract checks, browser workflows, and a complete demonstration of quote, settlement, collateral management, repurchase and default. Keep simulated instruments explicit. Record exact build and test results, including rejected adversarial actions and party visibility.

Completion requires that a reviewer can start from a fresh environment and reproduce the published walkthrough without relying on an undisclosed administrator session.

## Phase 2: BitSafe Contribution Pool LocalNet

**Completed technically on 5 October 2026:** the pinned three-participant starter, custom governed mark, threshold rejection and successful execution, actual repo margin/top-up/repurchase and matching all-node audit receipts passed in CI. [Evidence](../reference/status.md). Judging/award decisions remain with the sponsor.

Run the pinned BitSafe LocalNet starter from a clean setup and document exact prerequisites and commands. Integrate the DecMan decentralized-party workflow with a material Symbolon operation, then show the threshold outcome in the repo lifecycle. A generic governance vote without a Symbolon effect is not sufficient evidence of app integration.

The current demo is on a separate local Canton sandbox; shared DevNet only has the vetted core package. A shared-network transaction is not a prerequisite for the selected Contribution Pool path. Gold's own participant and peer-hosting work, and Grofty's MainNet wallet flow, are deferred.

## Phase 3: one real asset integration

The intended pair is cBTC collateral and USDCx cash. Verify each network's administrators and supported packages. Implement the official asset adapters, issuer matching, restriction handling, transfer contexts and failure recovery. Review oracle sourcing, a single agreed feed lineage, closeout valuation, surplus/shortfall accounting, eligibility and legal/operational requirements before any real-value test. The current health-factor closeout uses only simulated holdings.

## Phase 4: operator pilot

Validate the initial customer and dealer hypotheses through interviews and a controlled workflow rehearsal. Use observed failure modes to prioritize features. A narrowly useful product is more valuable than adding pooling, cross-chain routing or token trading without a verified need.

## Later candidates

Manual renewal by a new agreement, dealer-operated risk automation, audit exports, richer asset policy, and controlled data disclosure may be useful after the core path is stable. Transferable positions, vaults, FX, pooled liquidity and public benchmarks require separate product and privacy decisions.

BitSafe Contribution Pool LocalNet work is the active challenge path; see [challenge scope](challenges.md). Gold's own-node deployment is deferred. cBTC collateral with a verified USD cash asset is planned for Phase 3, after the LocalNet proof; no real-token settlement is claimed now. Grofty source code remains present, but its bounty is outside the current submission scope.

## Go-to-market pilot

The initial customer hypothesis is a treasury manager at a digital-asset fund holding Canton assets, working with financing dealers. Reach prospective operators through Canton issuer introductions and direct outreach to treasury and collateral leads. These are proposed channels; no response rate or partnership is claimed.

The first activation milestone is one observed financing rehearsal: request quotes, review the fixed repayment amount, settle, handle a collateral change, and close the position. Measure time to a usable quote, manual handoffs, rejected actions, completed repayments, and whether the operator asks to repeat the workflow. Interview evidence should determine the next feature before broader acquisition.

A small pilot pairs an interested borrower with a participating dealer and a supported asset. Repeat use and referrals depend on completing that workflow reliably. A workspace fee or usage-based financing workflow fee is a commercial hypothesis to test; the prototype implements neither fee collection nor revenue.
