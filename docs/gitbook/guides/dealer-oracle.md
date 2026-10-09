---
description: Register for a market, set your APR and send a funded fixed-rate offer.
---
# Lenders

Lenders supply cash to a borrower and agree a fixed contractual cash return. You choose the APR for each request. Symbolon does not tokenize your position or automatically roll it into another agreement.

## Prerequisites

- A connected HackCanton account with CanActAs authority for your lender party.
- Registration for the exact issuer pair and price source you want to finance.
- Sufficient unlocked cash from the request's specified issuer.
- Acceptance of the counterparty, term and collateral obligations.

## Quick Start

1. **Choose your lender party.** Confirm it under Account. Selecting Lend alone does not change the signer.
2. **Open the market and register.** In Lend, enter a lender name and approve listing the party ID and market preference. Registration reserves no cash.
3. **Receive a new request.** Borrowers send to all registered lenders in that market. Requests sent before you registered do not appear retroactively.
4. **Enter your APR.** Select your addressed request and enter the annualized rate and offer validity.
5. **Review and fund the offer.** Sending an offer reserves the exact cash amount. It is not settlement yet.
6. **Manage the position.** Borrower acceptance opens the repo. Follow collateral coverage and receive the agreed cash when the borrower repurchases.

## Example: offer 7% APR

Alex requests **1,000 USDCx-demo**, **30 days**, against **0.0250 cBTC-demo**. Blair enters **7% APR** and a **60-minute** quote validity.

| Stage | Blair's cash and agreement |
| --- | --- |
| Registered | No financing cash is reserved. |
| Offer confirmed | 1,000 is reserved for Alex; the offer shows approximately 1,005.83 repayment. |
| Alex accepts | The reserved cash goes to Alex and pledged collateral comes to Blair under restrictions. |
| Alex repays | Blair receives the full agreed cash and the collateral returns to Alex. |

The approximately 5.83 interest is the contractual return for this example, not guaranteed realized profit. Collateral and counterparty risks remain.

## Understanding your position

| Field | What it means for the lender |
| --- | --- |
| Principal | Cash delivered to the borrower when the offer settled. |
| Fixed APR | The accepted annualized rate, rather than a rate updated from later market quotes. |
| Repayment | Full contractual cash due from the borrower. |
| Maturity | Due time measured from settlement, shown in the app's timezone. |
| Collateral and health | Pledged quantity, current coverage and the agreed margin boundary. |

## What happens at maturity?

The borrower must pay the full agreed amount to recover collateral. A confirmed repayment returns the agreed cash to the lender and records Repurchased. If repayment is missed at maturity, the lender has a separate default choice under the contract.

**Example:** Blair's 7% agreement does not automatically become a new 7% loan next month. Another term needs another agreement. A default closeout is not evidence that Blair received principal and interest in cash.

## Offer expiry and unused funding

Sent offers appear in Offers. Revoke an unwanted offer to release its reserved cash. An expiry makes acceptance ineligible but does not automatically submit the cash-release transaction.

**Example:** if Casey's 7.5% offer is not chosen, Alex can decline it or Casey can revoke it. Accepting Blair's offer does not itself unlock Casey's reservation.

## Collateral monitoring

A fresh agreed mark below the maintenance requirement can enable a margin call. Liquidation additionally needs an expired cure window and a fresh post-cure shortfall mark. Maturity default is a separate action. The demo closeout releases pledged collateral; it does not sell the asset or calculate net recovery.

Stop receiving new requests removes your registration from future discovery. Existing requests, quotes and positions retain their ledger lifecycle. Oracle publication is a separate authority; being a lender does not grant the oracle role.
