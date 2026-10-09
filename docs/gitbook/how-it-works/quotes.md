# Requests and Offers

A request asks lenders to price proposed financing. An offer is a lender's response containing its APR, expiry and funded terms. They are different ledger records.

## Send a request to registered lenders

Borrower review lists all eligible registrations for the selected network, deployment, issuer pair and oracle. The borrower approves sharing its identity, amount, collateral and proposed terms with those recipients. A separate QuoteRequest is created for each lender.

Registration means accepting requests for that market. It is not a liquidity guarantee, counterparty-vetting result or credit assessment. A directory failure or empty list blocks sending; a changed audience requires another review.

## Example: two lenders, two offers

Alex's 1,000 request is addressed separately to Blair and Casey. Blair enters 7% APR, Casey enters 7.5%. Each lender reserves 1,000 of its own compatible cash when its offer is confirmed. Alex compares approximately 1,005.83 versus 1,006.25 total repayment for 30 days.

| Record | Alex sees | Blair sees | Casey sees |
| --- | --- | --- | --- |
| Request to Blair | Yes | Yes | Its own request instead |
| Blair's 7% offer | Yes | Yes | No automatic access |
| Casey's 7.5% offer | Yes | No automatic access | Yes |

## Funding and expiry

The offer reserves the exact cash needed for settlement. The borrower cannot spend it before acceptance. Expiry prevents acceptance, but it does not itself submit a transaction releasing the reservation.

**Example:** Alex selects Blair. Casey's unused offer remains separate until Alex declines it or Casey revokes it. That authorized action releases Casey's reserved cash.

## What happens next?

The borrower reviews the fixed repayment and risk terms, then accepts one offer. A request is consumed when its lender creates an offer, so the same request cannot be quoted twice. The app no longer requests an automatic standing 5.20% quote after borrower submission.
