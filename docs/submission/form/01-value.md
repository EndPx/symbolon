# Value

Symbolon helps borrowers know their contractual principal-plus-interest repayment amount before they borrow. They accept a dealer's fixed annualized rate and exact repurchase amount for an agreed term on Canton. Network fees and collateral-maintenance costs remain separate.

## 1. The problem in one sentence

**Treasury managers at digital-asset funds using floating-rate collateralized borrowing** struggle to **budget their repayment** because **borrowing rates change while their positions remain open**, exposing them to **unexpected interest increases and an uncertain financing cost**.

This is our initial customer hypothesis. Floating-rate borrowing exists; demand for Symbolon from this specific segment has not yet been validated through interviews.

## 2. The value we create

| | Today — floating-rate borrowing | With Symbolon — fixed-rate financing |
| --- | --- | --- |
| **What the user does** | Borrows at the current rate, monitors changes, and revises the expected interest expense. | Chooses a dealer quote and term, sees the contractual repayment amount, and accepts those fixed terms before settlement. |
| **Time / cost / risk** | Future rate changes can increase financing expense and disrupt the repayment budget. | The accepted rate and principal-plus-interest amount remain fixed for that agreement. Collateral risk and margin obligations remain. |

**Value proposition in one line:** Know your rate and contractual repayment amount before you borrow on Canton.

**Why users would switch:** Borrowers who value budget certainty may accept fixed terms instead of continued exposure to changing rates. Fixed financing can carry a premium and can be less attractive if floating rates later fall. We offer predictability, not guaranteed savings.

**How Symbolon works:** The borrower proposes the cash, collateral, term and risk parameters in separate requests to selected dealers. A dealer chooses its offered rate and quote expiry, then reserves its own cash to back the quote. The borrower compares those offers; Symbolon has no pool algorithm setting a universal rate. Before acceptance, the borrower sees the rate, term and exact repurchase amount. Acceptance of an unexpired quote atomically delivers the cash and locks the pledged collateral. Terms are fixed for that accepted agreement; a later agreement can have a different quote. The current term range is 1–365 whole days, and the 30-day example does not limit the product to short-term financing.

**Cash reservation and exit:** A quote's cash stays reserved until acceptance, borrower rejection or dealer revocation. The borrower can submit `RejectQuote`, or the quoting dealer can submit `RevokeQuote`, to return the exact reserved cash to that dealer. Both release choices can be used before or after quote expiry while the quote/reservation remains active. Expiry only prevents acceptance; it does not free cash automatically or require a separate permissionless expiry keeper. This reservation has a dealer-side opportunity cost. The borrower must source repayment cash itself; Symbolon provides no lending balance sheet, pooled capital, automatic rollover or refinancing of an external loan.

**Repurchase, cure and maturity:** Maturity is computed from the position's ledger-effective settlement time plus the agreed whole-day term. Repurchase pays the full agreed amount and returns all pledged collateral. It must occur strictly before maturity and, if a margin call is open, before that call's cure deadline. A margin cure deadline is separate from maturity and can arrive earlier. If maturity is reached without repurchase, the dealer can exercise `DeclareDefault` even when collateral coverage is healthy. That records `Defaulted` and releases the pledged demo collateral to the dealer. After an uncured margin call, the dealer can instead exercise `Liquidate` using a fresh matching mark published at or after the cure deadline that still proves a shortfall. These are submitted choices, not automatic transfers triggered by the clock. Neither closeout branch models a collateral sale, realized proceeds, surplus return or shortfall liability.

**Collateral substitution:** The borrower submits `ProposeSubstitution` to reserve replacement collateral. The position's dealer can submit `AcceptSubstitution` or `RejectSubstitution`; the proposing borrower can submit `WithdrawSubstitution`. Acceptance re-checks identity, valuation and the position's deadlines, atomically exchanges pledged holdings and preserves the fixed repayment terms. Rejection or withdrawal returns the reserved substitute to the borrower. Release requires an active proposal and matching reserved holding but does not require an unexpired position; stale proposals can be refunded after a position deadline. Substitution and closeout branches are implemented and exercised in local Daml lifecycle checks; the specific shared DevNet run demonstrates repurchase after top-up, not every branch.

For the executed example, ACT/360 means actual term days divided by 360: `1,000 + (1,000 × 0.052 × 30 / 360) = 1,004.3333333333`. The rate is annualized; 5.2% is not a 30-day charge. The current prototype also charges the full agreed amount for early repurchase, without an interest rebate. Network fees and costs of maintaining collateral are outside this principal-plus-interest amount.

## 3. Why it matters

- **Cost of the problem:** Rising floating rates raise interest expense. The effect depends on principal, duration and the rate path. We have not measured customer losses, savings or willingness to pay.
- **How many people or companies have it:** No verified count for our target segment. We are not presenting total DeFi or repo volume as Symbolon's customer market.
- **Public evidence:** [Aave V3 documentation](https://www.aave.com/docs/aave-v3/overview) describes rates that change with utilization and rise faster above the optimal point. This supports the mechanism behind rate uncertainty, not proof that every borrower wants fixed terms.
- **Product evidence:** [Our shared DevNet record](https://github.com/EndPx/symbolon/blob/main/docs/submission/evidence/shared-devnet.md) retains 20 committed transactions and the unchanged repayment amount through a collateral-price drop, margin call, top-up and `Repurchased`. Assets and marks were simulated. This proves software behavior, not customer demand.

## 4. Why now

**What changed:** Canton has tokenized-asset infrastructure and a dollar cash-leg integration target. [Circle announced USDCx on Canton through xReserve on 4 December 2025](https://www.circle.com/blog/usdcx-on-canton-now-available-via-circle-xreserve). Our intended production pair is cBTC / USDCx; official token adapters remain unimplemented.

**Why this could not be solved well before:** Fixed-rate financing already exists. Our opportunity is to agree a known principal-plus-interest amount directly against Canton assets using private counterparty quotes and ledger-enforced settlement. This is a Canton-native application opportunity, not a claim to invent fixed rates.

## 5. Why Canton

Fixed-rate math can run on other systems. Canton is useful here because the intended collateral and cash are Canton assets, and the agreement needs private multi-party authorization and atomic asset movements. A plain database can record terms but cannot by itself settle Canton assets across counterparties; a transparent public-chain design would require an additional privacy mechanism. [Canton's privacy model](https://github.com/canton-network/cf-docs/blob/main/docs-main/appdev/deep-dives/privacy-model.mdx) is the supporting foundation.

**What is private:** A borrower sees the quotes addressed to them; each dealer sees its own request and quote. The borrower and winning dealer are direct stakeholders of the resulting position, including rate, principal, term, repayment amount, margin state and closing record. Other dealers do not automatically receive that position. This is controlled visibility, not anonymous identity.

**Issuer and operator boundaries:** In the demo Holding model, the issuer signs holdings and can observe owner, instrument, quantity, locks and related transfers. It can mint and archive its demo holdings; this trusted-issuer power is not a production custody guarantee. The issuer is not a direct stakeholder of `RepoPosition` merely because it issued an asset, but asset movements can reveal repayment amounts or enable other inferences. Production token adapters may have different disclosure and control rules. Hosting operators administer stored data and Ledger API access for participant-hosted parties. An account granted `CanActAs` can submit that party's permitted Daml actions; read access alone does not grant choice authority. Our shared DevNet account controls all seven synthetic roles, so it can read/act for those roles. The run does not prove secrecy or independent control against that account or the participant administrator.

**What remains risky:** Collateral prices can fall, a dealer can issue a margin call, and an uncured call can lead to dealer-led closeout after the cure deadline and a fresh qualifying mark. Fixed interest does not prevent liquidation or guarantee lender returns. Closeout currently releases pledged demo collateral; realized sale proceeds, surplus and shortfall accounting remain future work.

**Governed marks:** The demonstration configures three governance member roles: proposer, confirmer and executor. The proposer creates a `PriceMarkProposal`; two distinct member confirmation contracts are required before the executor can execute it through `GovernanceRules`. The action uses the designated governance/oracle party's authority to update the matching `PriceFeed` via `SetPrice`. It authorizes a collateral mark, not the dealer's interest rate, and cannot reprice an accepted repayment amount. An execution attempt with one confirmation is rejected; execution with two confirmations succeeds. The marks are controlled simulated inputs. Approval does not establish market-price correctness, production provenance or independent operators; privileged access to the ordinary oracle party in the shared-node demo remains a trust dependency.

That threshold is enforced on the demonstrated governance execution path. The current shared-node account also has authority to act as the oracle party and could invoke its native oracle choices directly; the test does not establish an operator-resistant governance boundary. Production requires an appropriate authority/hosting policy as well as verified price sourcing.

For the recorded example, health factor is `collateral quantity × mark / (principal × 1.05)`. At 0.025 cBTC-demo and a 60,000 mark, coverage is 1,500 / 1,050 = 1.428571. A mark of 36,000 lowers it to 900 / 1,050 = 0.857143. The dealer must submit a valid margin-call action; the displayed factor alone changes no contract. Adding 0.005 cBTC-demo makes pledged quantity 0.030 and coverage 1,080 / 1,050 = 1.028571. The example's cure window is 600 seconds and mark-age limit 3,600 seconds; these are agreed parameters. Rate and repayment amount stay fixed throughout.

The three-participant DecMan proof is LocalNet on one CI host. The separate shared DevNet run uses ordinary hosted parties on one participant, without DecMan services or wallet signing. Neither is MainNet or real-token settlement.

## Checklist

- [x] One-sentence problem and specific initial user.
- [x] Before/after value and a clear financing mechanism.
- [x] Public evidence for variable rates and executed evidence for fixed repayment.
- [ ] Target-customer demand and willingness to switch validated.
- [x] Why now, why Canton and privacy scope explained.

Website: [Symbolon](https://symbolon.endpx.cloud/) · App: [financing desk](https://symbolon.endpx.cloud/app) · [Docs](https://symbolon.gitbook.io/symbolon-docs/)
