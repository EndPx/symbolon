# Five-minute hosted-account DevNet demo

Updated 10 October 2026. This runbook uses the existing HackCanton/NODERS account flow and Symbolon's published simulated-asset desk. Use distinct authorized borrower and lender parties. A connected lender can quote published requests directly, without registration or an access-approval exchange.

App: https://symbolon.endpx.cloud/app

## Demo story

A borrower needs a predictable financing obligation. They pledge test BTC collateral, receive a funded fixed-rate offer, know the contractual repayment before settlement, receive the cash, then repay and recover the collateral.

The public market uses a trusted test issuer and simulated reference oracle. Borrowers publish an open Canton request and consent once to share their identity and financing terms with authenticated connected Symbolon users. Each lender sets its own APR and submits a private funded quote. Publishing does not automatically create a 5.20% offer or move assets. A founder controlling both authorized parties can rehearse both sides; that does not demonstrate independent external operators, competitive liquidity or native wallet signing.

## Scenario and arithmetic

Use the published Symbolon issuer/oracle market with a current simulated mark of 60,000 USDCx-demo per cBTC-demo. Confirm the actual review values before submitting; a different mark or issuer defines a different example.

| Term | Demo value |
| --- | --- |
| Borrowed cash | 1,000 USDCx-demo |
| Duration | 30 days from settlement |
| Example lender annualized rate | 5.20% |
| Interest convention | ACT/360 |
| Initial collateral cover | 150% |
| Pledged collateral at the stated mark | 0.0250 cBTC-demo |
| Agreed interest | 4.3333333333 USDCx-demo |
| Full contractual repayment | 1,004.3333333333 USDCx-demo |
| Maintenance cover | 105% |
| Health factor at the stated mark | Approximately 1.43 |
| Margin-call price for this collateral quantity | 42,000 USDCx-demo per cBTC-demo |

The contract uses Numeric 10 arithmetic: principal × annualized rate × term days ÷ 360, added to principal. The accepted quote and committed ledger values govern the transaction. Network fees are separate and not quoted by this demo.

## Click sequence

1. Open the app. Connect through **HackCanton account** if not already authenticated. Use the ordinary primary/borrower party, not the published lender operator. Borrow/Lend changes the workspace side, not the signing identity.
2. Open **Faucet → Get DevNet assets** if the current party needs matching assets. Wait for the confirmed ledger receipt. Each claim issues 0.1 cBTC-demo and 5,000 USDCx-demo and creates the party's authorized simulated reference feed. Existing balances can differ after prior tests.
3. As borrower, open the published **Symbolon** cBTC-demo / USDCx-demo market, select **Borrow**, set amount **1,000** and duration **30**. Confirm 150% initial cover and 105% maintenance cover in Advanced terms. Click **Review open request**, check the exact terms and sharing notice, consent to the authenticated request audience, then publish. Canton creates `OpenRequest`; the server publishes a receipt-verified disclosure. No assets move.
4. The distinct lender account opens **Lend → Offers**, reads the open request and selects **Quote**. The connected party supplies its identity automatically; no lender name, registration or borrower access approval is required. Enter **5.20% APR** for this example and review the funded offer. Matching available cash from Faucet is needed. Sending the quote reserves 1,000 cash and creates a bilateral `RepoQuote`; it does not settle financing.
5. The borrower opens the unified **Offers → Review offer** panel and checks duration, cash received, fixed interest and total repayment. If the simulated mark is stale, use **Refresh simulated mark**, then review coverage again. Explain that 5.20% is annualized, not the charge for 30 days. Accept only the actual matching, unexpired funded quote. The app closes the linked active request and declines its other known recorded active offers atomically with settlement; unrelated or unrecorded offers remain separate.
6. Click **Accept and settle** and wait for a matching committed receipt. Show the position and changes from the balances recorded before acceptance: the borrower receives 1,000 cash; 0.0250 collateral is pledged with title transferred to the lender and locked while the repo remains open.
7. Open **Positions → Details**. Show fixed repayment, maturity, health factor and margin-call price. A mark below 42,000 indicates a margin shortfall for these terms; it is not an automatic liquidation. Closeout requires the lender's margin call, expired cure and fresh qualifying post-cure mark. Maturity default is a separate submitted action.
8. With sufficient matching-issuer cash, click **Review repayment → Repay and recover collateral** before the deadlines. Show **Activity → Repurchased** and the matching closing receipt, lender cash payment and unlocked collateral return. Early closure still pays the full agreed repayment.

For a fresh grant with no other activity or collateral top-up, available collateral moves 0.1000 → 0.0750 → 0.1000, and matching-issuer cash moves 5,000 → 6,000 → 4,995.6666666667. Use balance differences when the account already has prior activity; do not claim these as universal starting balances.

## External comprehension check

Let the observer explain, without coaching:

- What rate and total repayment did the borrower agree to?
- Does a future rate change alter that accepted repayment?
- Can falling collateral value still lead to a margin call or closeout?
- What happens when closing early or missing the deadline?
- Which bilateral information should another lender be able to see?

Record their answers, confusion and objections separately from compliments. If the founder operates the app during a screen-share, label it a founder-operated demo and observed comprehension session. It is not an external borrower/lender financing cycle.

Fresh self-service NODERS registration was unavailable in the inspected flow. An observer can watch now; an independently operated hosted-account test requires their own provider-provisioned account and party access. Do not share the founder's credentials.

## Evidence boundary

The unauthenticated public API reveals only a random request ID, configured market, open state and listing time. After publication consent, authenticated connected Symbolon parties receive the borrower identity, amounts, collateral and duration needed to quote. Competing quotes and accepted positions remain bilateral. The application/database operator can read stored records. Closing a request stops new quotes but does not cancel existing funded offers or erase prior disclosures. If a ledger command commits but API recording fails, sync the retained original receipt; do not fund another quote to repair an indexing failure.

Existing hosted-account frontend receipts are documented in [public DevNet evidence](evidence/public-devnet.md). The latest [direct Open RFQ execution](evidence/open-rfq-devnet.md) completed publication, a 7% funded quote, settlement and full repurchase with synthetic test roles. Its 7% agreement differs from this illustrative 5.20% script; use the actual quote's amount. Test assets and marks have no monetary value. Independent counterparties, wallet signatures and production cBTC/USDCx settlement remain separate validation gates.
