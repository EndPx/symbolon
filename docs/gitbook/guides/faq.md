---
description: Answers about requests, fixed repayment, collateral, privacy and accounts.
---
# FAQ

Find a quick answer, then open the relevant guide when you are ready to act.

## General

<details>
<summary>What is Symbolon?</summary>

Symbolon is a private fixed-rate repo app on Canton. A borrower requests cash against collateral, lenders return independently priced offers, and the borrower chooses one agreement.

**Example:** User A requests 1,000 USDCx-demo for 30 days. User B offers 7% APR and User C offers 7.5%. A compares the full terms before accepting B's offer.

</details>

<details>
<summary>Why use a fixed rate?</summary>

You know the accepted annualized rate and contractual principal-plus-interest repayment before settlement. Later borrowing-rate changes do not reprice that agreement. Fixed financing need not be cheaper, and collateral risk remains.

See [Why Fixed Rate?](../introduction/fixed-interest.md) for a worked comparison.

</details>

<details>
<summary>Which network and assets can I use?</summary>

The public prototype runs on HackCanton DevNet with simulated cBTC-demo and USDCx-demo holdings. These are test assets, not production cBTC or USDCx. The app has a separate local sandbox for rehearsals.

A wallet showing a similarly named token does not make it compatible with the app's demo holdings. Network, issuer and instrument identity must match.

</details>

<details>
<summary>Are there fees, rollover or an early-exit market?</summary>

The prototype collects no Symbolon protocol fee. Network charges remain separate from the contractual repayment. There is no automatic rollover, refinance or tokenized secondary-market exit. Another financing term needs a new agreement.

</details>

## Lending

<details>
<summary>How do I start as a lender?</summary>

Connect your HackCanton account, select a party you can act for, open the market and choose **Lend**. Register that party for the selected market. A borrower can then approve sharing a new request with you.

When a request arrives, enter your own APR and review the offer before sending it. Compatible unlocked cash is reserved when you send a funded offer. Follow [Lenders](dealer-oracle.md) for each step.

</details>

<details>
<summary>Why is there only one eligible lender?</summary>

The count includes active registrations for the exact asset issuers, instruments, price source and network, excluding the borrower's own party. The account dropdown lists authorized signing parties; those parties are not automatically registered lenders.

**Example:** if only Symbolon DevNet lender has registered, the borrower sees 1. Register a second authorized party under Lend for that same market, then return to Borrow and choose **Refresh lenders**. Registration does not retroactively add the party to requests already sent.

</details>

<details>
<summary>Does registration prove I have enough cash?</summary>

No. Registration records willingness to receive requests, not solvency, creditworthiness or available liquidity. Funding is checked on the ledger when the party submits an offer.

**Example:** a registered lender with 500 compatible cash cannot fund a 1,000 offer.

</details>

<details>
<summary>Who sets the APR, and when do I get repaid?</summary>

The lender enters the annualized rate for its own offer. The borrower reviews the rate, term, collateral rules and exact repayment before accepting. On repayment, the lender receives the full agreed principal plus interest and the pledged collateral returns to the borrower.

**Example:** 1,000 for 30 days at 7% APR has approximately 5.83 interest and 1,005.83 repayment using simple ACT/360. This is a contractual obligation, not a guaranteed investment return.

</details>

<details>
<summary>What happens to an offer that is not accepted?</summary>

An unaccepted funded offer remains separate from the winning agreement. Its reserved cash is not lent to the borrower. Use the applicable decline, cancellation or expiry-release action to unlock it under the offer's ledger rules. Do not assume acceptance releases every other offer automatically.

</details>

## Borrowing

<details>
<summary>Why does my request not immediately become an offer?</summary>

Sending creates addressed requests only. A registered lender must open Lend, choose its APR and submit a funded offer. The current flow does not automatically request a standing 5.20% quote.

In a same-account rehearsal, send as the borrower party, switch to the distinct lender party to quote, then switch back to the borrower to compare and accept.

</details>

<details>
<summary>How much can I borrow against my collateral?</summary>

It depends on the agreed price source, available compatible collateral and initial-cover terms. Review the required collateral before sending and again before accepting an offer.

**Example:** 0.0250 cBTC-demo at a simulated price of 60,000 is worth 1,500 USDCx-demo. With 150% initial cover, it can support a 1,000 principal. An 80% LTV is a different term; it is not the default in this example.

</details>

<details>
<summary>Is 7% APR a 7% charge for 30 days?</summary>

No. APR is annualized. At 7% simple ACT/360, 1,000 over 30 days has approximately 5.83 interest, not 70. The review displays the exact ledger amount before acceptance.

</details>

<details>
<summary>Can the lender increase my rate after acceptance?</summary>

The accepted financing terms stay fixed. A new 8% quote for another agreement does not reprice your existing 7% position. Collateral obligations can still require action as its price changes.

</details>

<details>
<summary>Can I repay early, and does that reduce interest?</summary>

You can repurchase before the deadline under the agreement's rules, but the full agreed repayment remains due. Closing on day 10 does not reduce the amount agreed for the 30-day term.

**Example:** if your contract specifies approximately 1,005.83, prepare that full amount plus any separate network charges.

</details>

<details>
<summary>What happens if I miss maturity?</summary>

Failure to repay by the contractual maturity can permit a lender-led maturity-default closeout. It is separate from a collateral margin call. The position does not automatically renew, and missing maturity does not request a new term.

See [Position Lifecycle](../how-it-works/lifecycle.md) and review the deadline before acceptance.

</details>

## Collateral and Health

<details>
<summary>What does the health factor tell me?</summary>

It compares current collateral value with required maintenance cover. Below 1 means the current mark shows a maintenance shortfall; above 1 means there is a buffer at that mark.

**Example:** collateral worth 1,500 against required cover of 1,050 gives health of about 1.43. It is a snapshot, not a promise that the price will remain safe.

</details>

<details>
<summary>Is liquidation automatic below the displayed price?</summary>

No. A fresh price below the margin boundary can enable a margin call. Liquidation requires an expired cure window and a fresh post-cure mark still proving a shortfall. Maturity default is separate.

**Example:** with 0.0250 collateral and 1,050 required cover, a price below 42,000 indicates a shortfall. Crossing that price alone does not immediately complete a liquidation.

</details>

<details>
<summary>Why does health say Unavailable?</summary>

The agreed price may be missing, stale or future-dated. The app cannot present current health from an invalid mark. Open position details to check the price source, timestamp and permitted age.

The authorized oracle must publish or refresh the mark. Selecting another market does not change an existing position's agreed oracle.

</details>

## Privacy and Accounts

<details>
<summary>Who sees my request, each quote and the final position?</summary>

All approved registered recipients see their own addressed request, including borrower identity and proposed terms. Each quote remains bilateral. The accepted position is shared with the borrower and winning lender; unrelated lenders do not automatically receive it.

**Example:** C receives A's request, but cannot automatically inspect B's quote or the A–B position. Asset issuers and hosting operators remain trust dependencies. Privacy means controlled visibility, not anonymity.

See [Privacy and Visibility](../architecture/privacy-and-trust.md) for the comparison.

</details>

<details>
<summary>Does selecting Borrow or Lend change my account?</summary>

No. It changes the activity shown, not the signing identity. Select the intended party under **Account → Advanced account controls → Authorized account party** when rehearsing two counterparties.

The same party may borrow and lend in different agreements, but cannot be its own counterparty in one agreement.

</details>

<details>
<summary>Can another user access my borrower or lender test party?</summary>

Not merely by signing in. Each account's selector uses its own live CanActAs rights. A new user's party does not grant access to the builder's borrower, lender or governance parties. Explicitly shared authority is a separate arrangement.

</details>

<details>
<summary>Why are two balances with the same token name separate?</summary>

Issuer identity matters. USDCx-demo from Issuer X cannot replace USDCx-demo from Issuer Y when the agreement requires X. Holdings remain separated so you can identify which balance can actually fund or repay an offer.

</details>

## Need More Help?

Open [Troubleshooting](troubleshooting.md) for account, price and balance problems, or [Glossary](../reference/glossary.md) for a term. For a reproducible issue, use the [project issue tracker](https://github.com/EndPx/symbolon/issues) and include the screen and error message, without credentials or access tokens.
