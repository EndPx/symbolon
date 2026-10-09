# Why Privacy Matters

A financing conversation reveals business information. A borrower discloses its funding need and collateral; a lender discloses its pricing and, after settlement, its exposure. Symbolon shares those details with the parties needed for the workflow.

{% hint style="info" %}
**A practical reason for privacy:** User A may need several lenders to price a request without giving every lender access to a competitor's quote or the final financing position.
{% endhint %}

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

## Public Evidence for Controlled Disclosure

The Canton Network's November–December 2023 pilot involved **45 firms, 22 applications and over 350 simulated transactions**. The pilot report describes participants receiving permissioned views of the data relevant to them while applications interoperated. This illustrates the infrastructure pattern Symbolon needs: multiple parties can coordinate an asset workflow without giving everyone the same data view.

{% hint style="info" %}
**What this evidence establishes:** a reported multi-firm test of privacy-enabled infrastructure. These were simulated pilot transactions, not Symbolon customers, production financing volume or proof of demand for our app.
{% endhint %}

Source: [Digital Asset's March 2024 pilot announcement](https://blog.digitalasset.com/press-release/the-canton-network-completes-the-most-comprehensive-blockchain-pilot-to-date-for-tokenized-real-world-assets) and the [Canton Network Pilot Report, pp. 2–5 and 29](https://www.canton.network/hubfs/Canton%20Network%20Files/Images/Pilot%20Program/Canton%20Network%20Pilot%20Report-1548ed.pdf).

## Privacy has boundaries

Privacy means controlled visibility, not anonymity. Counterparties know the party identities in their agreement. Asset issuers can observe asset movements they are entitled to see, and hosting operators remain a trust dependency. A single-operator demo demonstrates party-scoped views; it does not demonstrate independent infrastructure operators or legal confidentiality by itself.

The technical [Privacy and Visibility](../architecture/privacy-and-trust.md) page compares the direct contract audiences and remaining trust boundaries.
