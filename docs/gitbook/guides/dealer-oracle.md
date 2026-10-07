# Lender and oracle guide

The application displays the financing counterparty as **Lender**; the Daml templates retain their `dealer` field names. Borrow and Lend share one market workspace and use the currently connected signing party.

Dealer and oracle are different authorities. A dealer prices a counterparty and manages a repo. The oracle publishes marks. The prototype may host both on a local sandbox for convenience, but their separate parties and choices remain important.

## Dealer: review an RFQ

Open a market and select **Lend** in the right action panel. Choose a request addressed to your account, enter the rate and validity, and use **Review funded offer** before reserving cash.

Check the requesting party, collateral and cash issuer/instrument, quantities, tenor, margin threshold, cure duration and oracle policy. Treat all sample instrument names as demo identities. An issuer/instrument pair must be acceptable; a matching ticker is insufficient.

Use the pass action if you do not want to quote. Otherwise, ensure you have enough compatible unlocked cash and choose a rate and expiry. Quote creation reserves the required amount under the model. It is not a promise that unreserved cash elsewhere in your balance is available to that borrower.

## Dealer: manage outstanding offers

Open **Offers → Sent offers** to inspect or revoke your funded quotes.

Keep track of cash associated with each live quote. Revoke an offer that you no longer want outstanding through its authorized choice. Expiry prevents acceptance; it should not be assumed to cause an automatic transaction releasing a holding. Confirm the returned free cash after revocation or rejection.

Never reuse a stale cash contract ID after a merge, reservation or transfer. Refresh active contracts before building a new command.

## Dealer: manage a position

Use the market's **Positions** tab, or **Portfolio → Positions** across markets.

A margin call needs a genuine shortfall under a valid agreed feed. The ledger refuses a call against a healthy position, the wrong oracle/asset pair or an invalid timestamp. The call establishes a cure deadline. Track the state after a borrower top-up because the previous position contract ID has been consumed.

For substitution, review the replacement issuer, instrument, quantity and price basis. Acceptance gives the joint authority needed for the exchange; do not treat an automatically populated price as investment approval. The ledger separately verifies coverage and freshness.

Once an open cure deadline is reached, request a new mark from the agreed oracle. If it was published after the deadline and the health factor remains below `1.00`, the dealer may submit `Liquidate`. The ledger records the closeout mark and factor, then releases the pledged demo collateral to the dealer. If the mark has recovered, liquidation must fail; the borrower can clear the margin call before maturity. A separate `DeclareDefault` choice applies at maturity. The demo does not sell collateral or calculate realized proceeds, surplus or shortfall.

## Oracle: publish a mark

Connect as the oracle party. Under **Account → Advanced account controls → Oracle administration**, locate the feed for the correct collateral issuer/instrument and cash issuer/instrument. Enter a positive simulated price. Updating the feed creates a new contract version, so consumers must refresh its contract ID. DecMan-controlled marks use the committee workflow described in the BitSafe LocalNet guide; the ordinary account controls do not bypass its threshold.

For demonstration, announce the original price, the new simulated price and the purpose of the change. Do not describe this input as a live market feed. When testing invalid marks, use the adversarial script rather than weakening the UI or pretending that manually entered data is authenticated market data.

## Automation boundary

No neutral keeper automatically calls, liquidates or defaults every repo. A future dealer-operated agent would require narrowly scoped dealer credentials, a schedule, monitoring and a way to recover from unsuccessful commands. It would remain subject to the same contract checks. Oracle automation likewise needs a verified source and failure policy before it can replace the manual simulator.
