# Security and adversarial validation

Symbolon's security work starts with contract invariants and tests that bypass the browser's helpful form constraints. The prototype has not received an independent audit. Passing these scenarios establishes selected behavior for a specific build, not production safety.

## Threats addressed in the hardened model

| Attempt | Contract defense | Test coverage |
| --- | --- | --- |
| Quote zero/negative/out-of-range terms | Template and quote bounds | `termsAndQuoteValidation` |
| Substitute another issuer's same-symbol cash | Full issuer/instrument comparison | Terms, settlement and post-trade guards |
| Spend or relabel reserved quote funding | Owner plus lock-party authority; locked merge rejection | `reservationAndPrivacyGuards` |
| Reveal unrelated source balance in settlement | Exact-sized inputs split before bilateral actions | Reservation/privacy and settlement tests |
| Accept an expired quote | Strict validity check | `repoLifecycle` |
| Open undercollateralized position | Valid initial mark and coverage check | `priceAndSettlementGuards` |
| Use wrong, stale or future mark | Shared `checkedPrice` validation | Settlement and post-trade guards |
| Move pledged collateral unilaterally | Borrower lock on dealer-owned collateral | Settlement guards |
| Call a healthy position | Strict shortfall check | Lifecycle and post-trade guards |
| Cure with insufficient or wrong collateral | Positive amount, identity and resulting coverage | `postTradeGuards` |
| Accept an unauthorized or stale substitution | Controllers, party match and current position | `substitutionGuards` |
| Trap substitution reserve after position changes | Independent reject/withdraw refund | `substitutionGuards` |
| Liquidate before cure or with an old/wrong/recovered mark | Open-call deadline, post-cure publication, identity and health-factor checks | `cureDeadlineLiquidation`, `recoveredCallBlocksLiquidation` |
| Declare maturity default early | Ledger-time boundary check | Lifecycle, post-trade and maturity tests |
| Repay/top-up after a closeout boundary | Shared action-deadline check | `maturityDefault`, `cureDeadlineLiquidation` |
| Read another dealer's resulting trade | Separate stakeholders and party-scoped views | Lifecycle and reservation/privacy tests |

## Executable test inventory

The September 28 local rebuild passes **11/11 Daml Script entries**, including `setupDesk`. The ten substantive scripts are:

- `repoLifecycle`: quotes to two dealers, private views, exact funding, settlement, expiry, margin, top-up, substitution and health-factor liquidation.
- `repoHappyPath`: fixed full payoff, both closing legs, balances and collateral unlock.
- `termsAndQuoteValidation`: individual invalid-term and quote inputs, followed by a valid case.
- `reservationAndPrivacyGuards`: lock bypass attempts, unrelated change visibility and quote refunds.
- `priceAndSettlementGuards`: feed identity/recency, issuer and input-size checks, collateral locks.
- `postTradeGuards`: bad margin marks, repeated call, early closeout, inadequate top-up and wrong repayment assets.
- `substitutionGuards`: forged/insufficient replacement, lock bypass, outsider acceptance and stale proposal refund.
- `maturityDefault`: exact maturity boundary and blocked late recovery.
- `cureDeadlineLiquidation`: exact cure boundary, post-cure mark, blocked late recovery and closeout receipt.
- `recoveredCallBlocksLiquidation`: a recovered mark rejects liquidation and lets the borrower clear the call.

Run `./scripts/demo.ps1 build` to rebuild packages and execute the suite. Record fresh results for the revision you deliver. Transaction counts can change with legitimate test improvements; they are not a quality metric or a stable API.

## Runtime and frontend checks

The helper's `verify` runs `liveHappyPath` and `liveLifecycle` against a wall-clock sandbox. The recorded local run on 23 September 2026 succeeded on Canton 3.5.6, with offsets 55 → 199. This tests real time for expiry and the cure period. Frontend validation uses `npm.cmd test`, `npm.cmd run doctor` and `npm.cmd run build`, followed by a browser walkthrough. Neither client unit checks nor Daml tests alone prove wallet interoperability.

The client API/risk suite passed 9/9 tests. An additional real HTTP test runs the actual `actions.ts` and Ledger API adapter against the loopback ledger:

```powershell
# From the repository root, after frontend npm install and ledger seed:
node web/node_modules/tsx/dist/cli.mjs scripts/demo-http.mjs
```

The recorded run completed 19 successful submissions, offsets 208 → 283. It covers two private funded quotes, acceptance, margin, top-up, substitution, full repurchase, balances, privacy and rejection of unauthorized reserved-asset spending. Each run allocates six isolated test parties; its endpoint guard permits only loopback HTTP on port 6864. It is not a wallet or DevNet integration test.

This layer also verifies actual JSON representations: for example, the all-nullary `RepoOutcome` type is a JSON string, while `PositionStatus` uses a tagged variant. A TypeScript interface alone would not prove that distinction.

## Remaining attack and failure surfaces

The Grofty transport separately checks provider/version, allocated primary party and MainNet identity; restricts reads and submissions to that party; invalidates changed sessions; and correlates executed receipts with the command ID. An uncertain wallet result must be reconciled before retrying. These client controls do not audit the wallet or establish successful MainNet execution. See the [Grofty integration guide](../guides/grofty.md) for the precise source boundary and operational prerequisites.

The September 28 frontend suite passed **23/23 tests**, including **13 Grofty tests** against a fake CIP-0103 provider and one health-factor preview test, and the production build passed. Simulated provider responses test the adapter without an installed extension or real ledger execution; that evidence must remain separate from an authorized MainNet walkthrough.

The trusted demo issuer can create and archive its assets. The oracle can publish an economically false mark that is structurally valid, and can create multiple feeds. The post-cure mark rule prevents reuse of the call's pre-cure mark, but it does not enforce a unique latest feed or price methodology. Real-asset liquidation requires an agreed single feed lineage or another anti-fork policy, independent valuation rules and surplus/shortfall accounting. Participant operators, wallets and the delivered frontend have their own trust and security requirements. A shared local participant does not prove secrecy from its administrator.

No production token adapter, economic calibration, independent oracle design, external security review, recovery service or legal close-out engine is included. Real-value deployment must address these boundaries before treating contract test results as sufficient.

## Reviewing future changes

For each new choice, identify its controller, inherited authority, consumed inputs, outputs, visibility, timing and failure atomicity. Add tests for the failure specific to that change, with valid unrelated inputs so the test cannot pass for the wrong reason. Keep a successful neighboring case. Re-run the affected runtime and frontend flow when the schema or transport changes.
