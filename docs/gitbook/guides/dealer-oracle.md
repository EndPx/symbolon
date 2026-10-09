---
description: Read a published request, choose your APR and send a private funded quote.
---


# Lenders

Lenders supply cash to a borrower and agree a fixed contractual cash return. You choose the APR for each request. Symbolon does not tokenize your position or automatically roll it into another agreement.

## Prerequisites

- A connected HackCanton account with CanActAs authority for your lender party.
- An active published OpenRequest in the supported market. No prior lender registration or detail-access approval is required.
- Sufficient unlocked cash from the request's specified issuer.
- Acceptance of the counterparty, term and collateral obligations.

## Quick Start

1. **Choose your lender party.** Confirm it under Account. Selecting Lend alone does not change the signer.
2. **Read an open request.** While connected, review borrower identity, amount, collateral, tenor and financing rules shared through publication consent. A disconnected visitor sees only the minimal board.
3. **Quote directly.** Choose Quote request, confirm your automatic party label/full ID and set APR/validity. No manual name, registration, access request or borrower approval step is needed.
4. **Review your APR and repayment.** Check annualized ACT/360 interest, validity, required reservation and exact full terms.
5. **Review and fund the offer.** Sending an offer reserves the exact cash amount. It is not settlement yet.
6. **Manage the position.** Borrower acceptance opens the repo. Follow collateral coverage and receive the agreed cash when the borrower repurchases.

## Example: offer 7% APR

Blair opens Alex's published request, which shows **1,000 USDCx**, **30 days**, against **0.0250 cBTC-demo**. Blair enters **7% APR** and a **60-minute** quote validity.

| Stage | Blair's cash and agreement |
| --- | --- |
| Request read | Published full terms are visible while connected; no quote cash is reserved yet. |
| Offer confirmed | 1,000 is reserved for Alex; the offer shows approximately 1,005.83 repayment. |
| Alex accepts | The reserved cash goes to Alex and pledged collateral comes to Blair under restrictions. |
| Alex repays | Blair receives the full agreed cash and the collateral returns to Alex. |

The approximately 5.83 interest is the contractual return for this example, not guaranteed realized profit. Collateral and counterparty risks remain.

The party ID is authoritative. An automatically derived display label is a convenience, not a verified human or company name.

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

Reading the published request is not a funded offer. SubmitOpenQuote reserves your compatible existing cash; it does not auto-mint. Withdrawing the open request prevents new quotes but does not cancel existing funded offers or positions. Offers combines active requests/private quotes with a collapsed Archive for closed request history. Oracle publication is a separate authority; being a lender does not grant the oracle role.
