# Complete demo walkthrough

This walkthrough demonstrates the repo lifecycle using the seeded local ledger. It is intentionally explicit about simulated assets and role changes. For a recording, keep the environment label and current party visible.

## Preparation

Complete [local setup](local-setup.md). Verify that the helper's build and test commands passed, the sandbox is running, the seed record exists, and the web app can read its ledger. Preserve the revision, runtime versions and verification output used in the recording.

Use the seeded borrower, Dealer A, Dealer B and oracle. The setup also provides issuer/other test identities; use the current `.omc/demo/parties.json` rather than hard-coded full party IDs. The local role picker is a development convenience, not a production authorization method.

The initial seed includes borrower collateral and repayment cash, dealer cash, and marks for sample instruments. Inspect the actual balances before continuing. A second run against an already-used ledger can have different holdings and contract IDs.

## Segment 1: compare two private quotes

1. Connect as the borrower and inspect a simulated CETH holding and its agreed mark.
2. Request 2,000 CUSD against 30 CETH for 30 days, using a 1.05 coverage threshold and the available demo cure/freshness settings. At a mark of 100, collateral value is 3,000 and required value is 2,100.
3. Address separate requests to Dealer A and Dealer B.
4. Switch to Dealer A. Confirm only the request addressed to it is visible. Quote a 5% annualized rate with sufficient validity to complete the next steps.
5. Switch to Dealer B. Quote 6% on its own request.
6. Return to the borrower. Compare the quotes, including expiry and the exact due amount.

For the 5% offer, simple term interest is `2000 × 0.05 × 30 / 360`, approximately 8.3333333333 CUSD. The full repurchase amount is therefore approximately 2,008.3333333333 CUSD. Use the ledger's amount, not a rounded-down display value.

If the UI represents collateral through a coverage/cushion control, choose the settings that produce these quantities and confirm the preview. The economic parameters matter more than a particular screen layout.

## Segment 2: settle and check visibility

1. Accept Dealer A's quote using the current agreed feed.
2. Confirm a committed result, the borrower cash increase and the active position.
3. Switch to Dealer A and verify the same position and pledged collateral.
4. Switch to Dealer B and verify that the winning rate and position are not in its party view.
5. Return to the borrower and reject the unused quote; verify release of its dealer's reserved funding where applicable.

State the precise privacy claim: these are party-scoped ledger views in a local participant. The demonstration does not isolate the parties from the operator of that participant or from the demo issuer's permitted asset observations.

## Segment 3: prove margin rules

First attempt a healthy margin call through the test suite or appropriate dealer action and show that it is rejected. Then connect as the oracle and publish a simulated CETH mark of 60. The original 30 units are now worth 1,800, below the required 2,100.

The dealer submits a margin call with that feed. Show the resulting cure deadline. The borrower adds 5 CETH before that deadline: `35 × 60 = 2100`, restoring coverage exactly under this example. Confirm the active state and enlarged collateral total. If time or price changes make these inputs invalid, refresh and use a new position instead of bypassing the rules.

The adversarial suite separately checks insufficient top-up, invalid feed and timing cases. A rejected action must leave the pre-existing position intact.

## Segment 4: substitute collateral

The borrower proposes enough simulated TBILL collateral to meet the same required value using a valid TBILL/CUSD mark. At a price of 1, a quantity of 2,100 meets the example threshold. Review its issuer identity and feed; then switch to the dealer and accept.

Show that CETH returns to the borrower, TBILL becomes the position collateral, and rate, maturity and repurchase price remain unchanged. This is an atomic collateral swap, not a new financing transaction.

## Segment 5A: successful repurchase

Before the position becomes defaultable, the borrower submits repayment with enough compatible unlocked CUSD for the full repurchase price. Show the returned collateral, the dealer's cash and a `Repurchased` receipt. Explain that an early close pays the full agreed amount under the present model.

## Segment 5B: health-factor liquidation on a separate trade

Use a separate fresh position for the liquidation branch. Choose a short supported cure window for demonstration, publish a mark that puts health factor below `1.00`, and issue the call. Show that liquidation is rejected before the deadline. After the cure deadline, the oracle publishes a new mark. The dealer can liquidate only if that post-cure mark still shows health factor below `1.00`; a recovered mark rejects liquidation and lets the borrower clear the call before maturity.

Show the `Liquidated` receipt with its closeout mark and health factor, plus the collateral released to the dealer. Repurchase/top-up/substitution are closed at the cure deadline. On another position, demonstrate that missing maturity permits the separate `Defaulted` outcome. There is no collateral auction, realized recovery proceeds, or surplus/shortfall accounting.

## Script evidence and final explanation

The earlier recorded browser run used a smaller version of this example: **1,000 CUSD / 15 CETH / 30 days**, dealer quotes **5.2% and 5.8%**, and acceptance at 5.2%. A simulated mark change from 100 to 60 produced a margin call; a **3 CETH** top-up restored coverage to **1,080 CUSD**, above the **1,050 CUSD** requirement. Full repurchase of **1,004.3333333333 CUSD** then closed the position with `Repurchased`. On 28 September 2026 a separate one-dealer browser run exercised the liquidation branch: the displayed factor fell from 1.43 to 0.86, the dealer issued a call, the oracle refreshed the low mark after the one-minute cure window, and the dealer closed with `Liquidated` at local ledger offset 229.

The helper's `verify` command runs `Symbolon.Live:liveHappyPath` and `Symbolon.Live:liveLifecycle` against the wall-clock ledger and records offsets. The Daml test package supplies more negative cases than a short recording can show. Retain both outputs and the code revision.

For an additional check of the same client code used by the browser, run `node web/node_modules/tsx/dist/cli.mjs scripts/demo-http.mjs` from the repository root after installing frontend dependencies and seeding the local ledger. Its recorded run completed 19 successful submissions (offsets 208 → 283) covering the full HTTP workflow and negative reserved-spend/privacy checks. Its six isolated parties do not replace the browser role list, which comes from `.omc/demo/parties.json` through the development-only `/demo-parties` route.

Close the demo by naming the remaining boundaries: demo assets, simulated marks, local participant hosting, unverified network/wallet combinations, no independent audit, and no user traction. The next milestone is a verified wallet/participant path followed by one real supported asset adapter.
