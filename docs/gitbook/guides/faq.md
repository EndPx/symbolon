---
description: Answers about requests, fixed repayment, collateral, privacy and accounts.
---


# FAQ

Find a quick answer, then open the relevant guide when you are ready to act.

## General

<details>
<summary>What is Symbolon?</summary>

Symbolon is a fixed-rate repo app on Canton with open requests and private quotes. A borrower publishes consented financing terms, lenders independently price and fund bilateral offers, and the borrower chooses an agreement before settlement.

**Example:** User A requests 1,000 USDCx for 30 days. User B offers 7% APR and User C offers 7.5%. A compares the full terms before accepting B's offer.

</details>

<details>
<summary>Why use a fixed rate?</summary>

You know the accepted annualized rate and contractual principal-plus-interest repayment before settlement. Later borrowing-rate changes do not reprice that agreement. Fixed financing need not be cheaper, and collateral risk remains.

See [Why Fixed Rate?](../introduction/fixed-interest.md) for a worked comparison.

</details>

<details>
<summary>Which network and assets can I use?</summary>

The public prototype runs on HackCanton DevNet with simulated cBTC-demo and USDCx holdings. These are test assets, not production cBTC or USDCx. The app has a separate local sandbox for rehearsals.

A wallet showing a similarly named token does not make it compatible with the app's demo holdings. Network, issuer and instrument identity must match.

</details>

<details>
<summary>Are there fees, rollover or an early-exit market?</summary>

The prototype currently collects no Symbolon protocol fee. Network charges remain separate from the contractual repayment.

The planned business model charges each counterparty **0.1% of the agreed term interest**: 0.1% from the borrower and 0.1% from the lender, for a combined 0.2% of interest. This is not a percentage of principal, and fee collection is not implemented in the demo.

**Example:** 1,000 USDCx at 5.20% APR for 30 days has approximately 4.33333 USDCx interest under ACT/360. The proposed fee would be about 0.00433 USDCx per side, or 0.00867 USDCx in total. Final rounding and collection rules remain to be defined; these illustrative fees do not change the current demo repayment.

There is no automatic rollover, refinance or tokenized secondary-market exit. Another financing term needs a new agreement.

</details>

## Lending

<details>
<summary>How do I start as a lender?</summary>

Connect your HackCanton account, select your own authorized party and open Offers for the supported market. Read a published request and choose Quote request. Review your automatic party label/full ID, set APR/validity and consent to reserve compatible existing cash.

There is no manual lender name, prior registration, request-access step or per-lender borrower approval. The label is not a verified human/company name; your full party ID and signing authority are authoritative.


</details>

<details>
<summary>Do I need to register before quoting?</summary>

That count belonged to the earlier registered-lender discovery flow. New OpenRequest publications can be priced directly by authenticated connected parties without registration or per-lender detail approval.

Earlier private requests and archived records keep their original audiences. They are not automatically republished into the new flow.


</details>

<details>
<summary>Does reading an open request mean I can fund it?</summary>

No. Registration is unnecessary for new direct open quotes, and reading a published request is not a solvency or credit check. SubmitOpenQuote validates exact compatible available lender cash and reserves it; it does not auto-mint.

**Example:** Blair can read a 1,000 request with a 500 balance, but cannot fund the 1,000 offer from that balance.


</details>

<details>
<summary>Who sets the APR, and when do I get repaid?</summary>

The lender enters the annualized rate for its own offer. The borrower reviews the rate, term, collateral rules and exact repayment before accepting. On repayment, the lender receives the full agreed principal plus interest and the pledged collateral returns to the borrower.

**Example:** 1,000 for 30 days at 7% APR has approximately 5.83 interest and 1,005.83 repayment using simple ACT/360. This is a contractual obligation, not a guaranteed investment return.

</details>

<details>
<summary>What happens to an offer that is not accepted?</summary>

Its reserved cash remains governed by that core quote's accept, reject and revoke actions. Withdrawal of OpenRequest stops new quotes but does not itself release existing reservations. Expiry prevents acceptance; it does not automatically submit a release transaction.

The app's linked acceptance can reject other known, recorded, linked active offers. Unrelated/unknown core offers remain individual records to reconcile. Offers keeps closed request history in a collapsed Archive; archive placement is not financial cancellation.


</details>

## Borrowing

<details>
<summary>Why does my request not immediately become an offer?</summary>

Publication creates an OpenRequest and shares its full terms after one borrower disclosure consent. It moves no cash or collateral and does not assign an automatic APR. A connected lender chooses its rate and confirms a funded private quote with its own cash.

In a two-party rehearsal, publish as the borrower, switch/connect as the distinct lender to quote directly, then return to the borrower to compare and accept. No request-access or approval stage is needed.


</details>

<details>
<summary>How much can I borrow against my collateral?</summary>

It depends on the agreed price source, available compatible collateral and initial-cover terms. Review the required collateral before sending and again before accepting an offer.

**Example:** 0.0250 cBTC-demo at a simulated price of 60,000 is worth 1,500 USDCx. With 150% initial cover, it can support a 1,000 principal. An 80% LTV is a different term; it is not the default in this example.

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

Unauthenticated visitors see only random listing ID, supported market/pair, open state and date. Publication consent deliberately shares borrower identity, requested cash, collateral quantity, tenor and financing rules with all authenticated connected Symbolon parties. Each APR/funded quote is bilateral; the settled position remains with borrower and winning lender under core rights.

**Example:** Casey reads the published request but cannot automatically inspect Blair's rate or the Alex–Blair position. Operators, issuers, permitted witnesses and shared-party authority remain trust/inference considerations. Withdrawal does not erase information already disclosed.

See [Privacy and Visibility](../architecture/privacy-and-trust.md) for the S/O/D matrix.


</details>

<details>
<summary>Does selecting Borrow or Lend change my account?</summary>

No. It changes the activity shown, not the signing identity. Select the intended party under **Account → Advanced account controls → Authorized account party** when rehearsing two counterparties.

The same party may borrow and lend in different agreements, but cannot be its own counterparty in one agreement.

</details>

<details>
<summary>Can another user access my borrower or lender test party?</summary>

Not merely by signing in. Each account's selector uses its own live CanActAs rights. A new user's party does not grant access to the builder's borrower, lender or governance parties. Explicitly shared authority is a separate arrangement.

If two accounts are authorized for the same Canton party, both can access that party's same private records. Use distinct borrower and lender parties when testing privacy between counterparties.

</details>

<details>
<summary>Why are two balances with the same token name separate?</summary>

Issuer identity matters. USDCx from Issuer X cannot replace USDCx from Issuer Y when the agreement requires X. Holdings remain separated so you can identify which balance can actually fund or repay an offer.

</details>

## Need More Help?

Open [Troubleshooting](troubleshooting.md) for account, price and balance problems, or [Glossary](../reference/glossary.md) for a term. For a reproducible issue, use the [project issue tracker](https://github.com/EndPx/symbolon/issues) and include the screen and error message, without credentials or access tokens.
