# Five-minute hosted-account DevNet demo

Updated 10 October 2026. This runbook uses the existing HackCanton/NODERS account flow and Symbolon's published simulated-asset desk. Use distinct authorized borrower and lender parties. The public discovery board does not require a pre-registered lender; private access requests and approvals require a connected hosted account.

App: https://symbolon.endpx.cloud/app

## Demo story

A borrower needs a predictable financing obligation. They pledge test BTC collateral, receive a funded fixed-rate offer, know the contractual repayment before settlement, receive the cash, then repay and recover the collateral.

The public market uses a trusted test issuer and simulated reference oracle. Borrowers publish minimal opportunities and approve each lender before sharing a bilateral request. Each lender sets its own APR. Publishing or sharing a request does not automatically create a 5.20% offer: the approved lender operates Lend and submits a funded quote. A founder controlling both authorized parties can rehearse both sides; that does not demonstrate independent external operators, competitive liquidity or native wallet signing.

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
3. As borrower, open the published **Symbolon** cBTC-demo / USDCx-demo market, select **Borrow**, set amount **1,000** and duration **30**. Confirm 150% initial cover and 105% maintenance cover in Advanced terms. Click **Review opportunity**, review the public-versus-private fields, approve the minimal listing and select **Publish opportunity**. This is an off-ledger intent; it does not create a financing request or move assets.
4. The distinct lender account opens **Lend → Open opportunities**, selects **Request detail access**, reviews the automatic connected-party label and full party ID, and agrees to share that identity privately with the borrower. No name entry is required. The borrower opens **Your opportunities → Review access**, checks the exact recipient and terms, and approves sharing. Only this step creates the addressed `QuoteRequest` on Canton. It does not create an offer or deliver cash.
5. The approved lender reads the private request in **Lend**, enters **5.20% APR** and reviews/sends a funded offer. Matching cash from Faucet is needed to fund it. The borrower opens **Offers → Review offer** and checks duration, cash received, fixed interest and total repayment. If the simulated mark is stale, use **Refresh simulated mark**, then review coverage again. Explain that 5.20% is annualized, not the charge for 30 days. Accept only the actual matching, unexpired funded quote.
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

Discovery is off-ledger metadata: the public API reveals only a random opportunity ID, configured market, open state and listing time. Borrower identity, amounts and duration are omitted. The application/database operator can read stored private terms. Closing a listing stops discovery and new access requests; it does not cancel financing contracts or erase prior disclosures. If ledger sharing commits but API approval fails, use the retained original receipt to recover access status instead of sending another request.

Existing hosted-account frontend receipts are documented in [public DevNet evidence](evidence/public-devnet.md). This runbook adds no new transaction or customer-validation claim. Test assets and marks have no monetary value. Independent counterparties, wallet signatures and production cBTC/USDCx settlement remain separate validation gates.
