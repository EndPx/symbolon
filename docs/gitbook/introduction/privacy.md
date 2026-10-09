# Why Privacy Matters

A financing conversation reveals business information. A borrower discloses its funding need and collateral; a lender discloses its pricing and, after settlement, its exposure. Symbolon shares those details with the parties needed for the workflow.

## Example: Alex, Blair and Casey

Alex requests 1,000 USDCx-demo for 30 days and approves sharing that request with every registered lender in the selected market. Blair and Casey each receive a separate copy addressed to their own party.

Blair quotes 7%; Casey quotes 7.5%. Alex can compare both. Blair can see Blair's own offer, and Casey can see Casey's own offer. Choosing Blair does not give Casey automatic access to Blair's rate or the accepted position.

![Request visibility and private lender offers](../assets/privacy-map.png)

## What is shared, and with whom?

| Information | Audience | Why it is shared |
| --- | --- | --- |
| Registered lender name, party ID and market preference | Directory readers | Borrowers need to discover willing counterparties. |
| Borrower identity, requested amount, collateral and proposed terms | All registered lenders approved in the request review | Each needs enough information to decide whether to quote. |
| Blair's APR, quote expiry and funded terms | Alex and Blair | They negotiate that potential agreement. |
| Casey's APR, quote expiry and funded terms | Alex and Casey | They negotiate their separate potential agreement. |
| Accepted position, repayment, maturity and collateral management | Alex and the winning lender | They manage the settled agreement. |

**The funding request is not secret from its approved recipients.** Privacy begins with knowing that audience and consenting to it. Quotes and positions remain bilateral within the contract model.

Registration means opting into the same issuer/oracle market. It does not certify a lender's cash balance, creditworthiness or institutional approval. Review the actual recipients before sharing the funding need.

## Why Canton is useful here

Canton applies party-specific visibility and authorization to contracts while coordinating settlement between participants. Symbolon can therefore record an agreement and exchange its cash and collateral without making every private record a public market feed.

**Example:** Casey's participant receives the request and quote records Casey is entitled to see. That entitlement does not turn Casey into an observer of Alex and Blair's position.

## Privacy has boundaries

Privacy means controlled visibility, not anonymity. Counterparties know the party identities in their agreement. Asset issuers can observe asset movements they are entitled to see, and hosting operators remain a trust dependency. A single-operator demo demonstrates party-scoped views; it does not demonstrate independent infrastructure operators or legal confidentiality by itself.

The technical [Privacy and Visibility](../architecture/privacy-and-trust.md) page compares the direct contract audiences and remaining trust boundaries.
