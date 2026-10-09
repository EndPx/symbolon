---
description: Plain meanings and practical examples for Symbolon's financing and Canton terms.
---


# Glossary

Use this page when a form, offer or position contains an unfamiliar term. Examples are illustrative and use simulated assets.

## Financing and rates

| Term | Meaning | Example |
| --- | --- | --- |
| Borrower | The party receiving cash and agreeing to repay to recover collateral. | Alex requests 1,000 USDCx. |
| Lender / dealer | The counterparty pricing and funding the agreement. Dealer is the code's field name. | Blair offers 7% APR. |
| Discovery listing | Minimal anonymous offchain metadata visible to public board readers. | Opaque ID + market/pair + open state/date, without borrower identity or amounts. |
| OpenRequest / Open RFQ | Borrower-signed request whose full payload is intentionally published to authenticated connected Symbolon parties. | Alex publishes 1,000 over 30 days once; Blair and Casey price it directly. |
| Publication consent | One agreement to disclose identity and full request terms to the authenticated application audience. | It is not per-lender access approval or settlement consent. |
| Disclosed contract | A verified ledger payload supplied for a permitted choice; disclosure does not grant another party's signing authority. | Blair quotes the published request as Blair, not as Alex. |
| SubmitOpenQuote | Nonconsuming choice that creates/consumes a bilateral core request and reserves lender cash into a private quote atomically. | No auto-mint or borrower-online permission is needed. |
| Request / RFQ | A financing request before a funded offer; distinguish the published OpenRequest from transient/legacy bilateral QuoteRequest. | New direct quotes keep using the unchanged bilateral core. |
| Offer / quote | A lender's proposed fixed rate, validity and funded terms. | Blair reserves 1,000 for a 7% offer. |
| APR | The annualized rate used for simple interest in Symbolon. | 7% APR for 30 days on 1,000 produces about 5.83 interest. |
| APY | An annual yield measure that can include compounding; it is not the quote field used here. | Do not relabel Symbolon's simple APR as compounded APY. |
| ACT/360 | Actual agreed term days divided by 360 in the interest calculation. | 30 days uses 30 ÷ 360. |
| Principal / purchase price | Cash delivered at opening settlement. | The borrower receives 1,000. |
| Repayment / repurchase price | Full agreed principal plus fixed term interest. | Approximately 1,005.83 for the 7%, 30-day example. |
| Maturity / tenor | Due time / agreed duration from settlement. | A 30-day term matures 30 days after acceptance. |
| Repo / repurchase | An asset sale with an agreement to repurchase under defined terms. | Collateral title transfers at settlement and returns after full repayment. |

## Collateral and risk

| Term | Meaning | Example |
| --- | --- | --- |
| Collateral | The asset pledged in the financing agreement. | 0.0250 cBTC-demo. |
| Initial cover | Collateral value as a percentage of cash principal at entry. | 150% cover means 1,500 value for 1,000 cash. |
| LTV | Loan-to-value: principal divided by collateral value. | 1,000 ÷ 1,500 is about 66.67% LTV. |
| Maintenance margin | Minimum required collateral value relative to principal. | 105% requires 1,050 for 1,000 principal. |
| Health factor | Collateral value divided by the maintenance requirement. | 1,500 ÷ 1,050 is about 1.43. |
| Margin call | Lender action establishing a cure deadline after a fresh shortfall is verified. | A 36,000 mark makes 0.0250 worth 900, below 1,050 required. |
| Cure window | Time to restore margin after a call. | The agreed example window can be one hour. |
| Top-up | Additional collateral to restore coverage. | Add 0.0050 at 36,000 to bring value to 1,080. |
| Substitution | Lender-approved replacement of pledged collateral. | An approved compatible replacement keeps the financing terms fixed. |
| Liquidation | Permitted lender closeout after cure expiry and a fresh post-cure shortfall. | It releases pledged demo collateral; it is not a sale engine. |
| Maturity default | Separate closeout for missed repayment at maturity. | Defaulted does not mean cash repayment was received. |

## Accounts, assets and visibility

| Term | Meaning | Example |
| --- | --- | --- |
| Party | Canton ledger identity used for authority and visibility. | Alex and Blair have different party IDs. |
| CanActAs | Account right to submit as a particular party. | Knowing Blair's ID is insufficient to sign as Blair. |
| Issuer | Party identifying and issuing the asset. | Same-symbol holdings from X and Y remain separate. |
| Oracle / price feed | Agreed publisher / record containing a mark, asset pair and timestamp. | A simulated cBTC-demo price of 60,000. |
| Fresh mark | A valid timestamp within the agreed maximum age, not in the future. | An expired one-hour mark cannot authorize a price-sensitive action. |
| Registered lender | A legacy directory registration for earlier request discovery. | Earlier requests retain their audiences; new OpenRequest pricing does not require registration. |
| Bilateral visibility | A record's direct audience is the relevant two counterparties. | Blair's quote is shared with Alex and Blair. |
| Observer | A party explicitly entitled to read a contract; action rights come from declared controllers. | A Holding owner is an observer and can control owner choices, while an extra viewer has no spending authority solely from viewing. |
| Signatory / controller | Authority involved in creating a contract / exercising a choice. | The borrower controls acceptance of its offer. |
| Atomic settlement | Required effects commit together or do not commit. | Cash and collateral exchange in one acceptance transaction. |
| Locked / reserved holding | Assets restricted for a quote or position. | Casey's unused quote cash stays reserved until an authorized release. |
| Contract ID | Identifier for one contract instance. | A consuming update creates a replacement with a new ID. |
| Participant / synchronizer | Infrastructure hosting parties / coordinating Canton transactions. | They support execution; they are not borrower or lender roles. |
| Receipt / ClosedRepo | Correlated action evidence / ledger closing record. | Repurchased records full repayment and collateral return. |

## A quick interpretation

“1,000 principal, 7% APR, 30 days, 150% cover, 105% margin” means roughly 5.83 fixed term interest; 1,500 initial collateral value; and a 1,050 maintenance requirement. These figures describe different parts of the agreement and should not be treated as one percentage.
