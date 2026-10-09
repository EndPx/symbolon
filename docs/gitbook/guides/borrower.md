# Borrower guide

Use a seeded local demo party or a verified wallet party. A wallet account without compatible assets, packages and participant access cannot complete a trade merely by opening the desk.

## 1. Inspect identity and balances

Open **Account** to confirm the connected identity and network. **Portfolio → Holdings** shows available and locked balances by issuer. The full party ID and authorized party switch are under Account details; changing Borrow/Lend does not switch accounts. All local sample assets are simulated.

Have repayment cash available for the demonstration. A repo gives you principal now; it does not manufacture the interest required for repayment later. The seeded borrower includes demo cash specifically so the closing leg can be exercised.

## 2. Request quotes

Open a pair in **Markets** and choose **Borrow**. Enter amount and duration. The audience is **All registered lenders** for the exact issuer pair, oracle and deployment, excluding your own party. The directory lists lender identities and market preferences, not cash availability. **Advanced terms** holds the agreed oracle, coverage threshold, cure window and maximum mark age.

Review the actual recipients and approve sharing your identity, requested amount, collateral and terms with them. A request is created separately for each lender; two lenders receive two contracts rather than one shared contract. If the registry is unavailable or empty, sending is blocked. A changed recipient list requires another review. New registrations receive future requests, not earlier requests.

Sending creates requests only. The app does not generate a standing 5.20% offer. Each addressed lender opens **Lend**, enters an APR and sends a funded offer. If rehearsing both roles in one authorized HackCanton account, switch the signing party to the registered lender, then select Lend. Return to the borrower party to compare received offers.

The collateral quantity and requested cash need to satisfy the initial coverage requirement under a valid price. Do not assume that a generous quote rate compensates for insufficient collateral: the rate and margin checks are separate.

## 3. Compare and accept

Use **Offers → Received offers** and **Review quote** to inspect the counterparty, annualized rate, expiry, duration, repurchase amount and asset identities. Acceptance requires current collateral and a current agreed feed. A quote can disappear if it is revoked or consumed. A feed can be replaced while you are reviewing it. Successful settlement opens **Positions**.

After submitting, wait for the ledger result. Confirm that cash increased, pledged collateral is reflected in the position, and the active repo is visible. An animation or success-looking form is not proof of a committed command; the application should have an update result and refreshed state.

Reject unused quotes or withdraw remaining requests. These actions are separate from accepting the winning quote.

## 4. Manage collateral

In **Positions**, inspect the health factor, shortfall and cure deadline. Add enough collateral at the current valid price to restore a factor of at least `1.00`; a smaller contribution will be rejected. If the agreed mark recovers instead, clear the call with a fresh feed before maturity.

To replace collateral, propose the new asset and quantity, then wait for the dealer's acceptance. A proposal alone does not return your existing collateral. Refresh the proposal if its inputs change before acceptance.

## 5. Repurchase

Choose **Review repurchase** in Positions and use an unlocked cash holding of the agreed issuer/instrument with enough value for the full repurchase price. You can close early, but the amount does not decline with the shortened holding period. Complete the action before the default boundary. Successful repurchase opens **Activity**; returned balances are under Portfolio → Holdings.

On success, verify the returned collateral, changed cash balance and `Repurchased` receipt. Once maturity or an uncured deadline has passed, ordinary repurchase and top-up are blocked. After the cure deadline a dealer can liquidate only with a post-cure mark showing health factor below `1.00`; at maturity the dealer can declare default. A recovered margin call may still be cleared before maturity. The demo does not offer unilateral deadline extension or an external liquidation sale.

See the [complete demo](demo.md) for a reproducible set of sample numbers and [troubleshooting](troubleshooting.md) for rejected commands.
