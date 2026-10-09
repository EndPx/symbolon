# Why Privacy Matters

A financing request and a negotiated deal need different audiences. Symbolon makes an open request available for pricing after the borrower consents, while lender APRs, funded quotes and settled positions remain bilateral.

{% hint style="info" %}
**Open request, private quotes:** publishing shares borrower identity, cash amount, collateral quantity, tenor and financing rules with all authenticated connected Symbolon parties. It is not a confidential request after publication. Competing lenders do not automatically see each other's quotes or the winning position.
{% endhint %}

## Example: Alex, Blair and Casey

Alex publishes 1,000 USDCx for 30 days against 0.0250 cBTC-demo. Blair and Casey connect their authorized accounts, read the full request and immediately choose their own APRs—without lender registration, an access request or per-lender borrower approval.

Blair quotes 7%; Casey quotes 7.5%. Alex sees both. Blair can see Blair's own funded quote, and Casey can see Casey's. If Alex selects Blair, Casey does not automatically receive Blair's rate or their accepted position.

![Open financing request and private borrower/lender quotes](../assets/privacy-map.png)

## What Is Shared, and With Whom?

| Information | Audience | Purpose |
| --- | --- | --- |
| Random listing ID, supported market/pair, open state and date | Anyone reading the minimal board | Discovery without publishing full terms to unauthenticated visitors. |
| Borrower party ID, cash amount, collateral quantity, tenor and financing rules | All authenticated connected Symbolon parties after publication consent | Lenders can evaluate the request and quote directly. |
| OpenRequest disclosure used to submit a quote | Authenticated quote context for an active request | The ledger can check the borrower's already-authorized request. |
| Blair's APR, expiry and funded quote | Alex and Blair | Their potential agreement stays bilateral. |
| Casey's APR, expiry and funded quote | Alex and Casey | Their separate potential agreement stays bilateral. |
| Accepted position, repayment and collateral management | Alex and the winning lender under core contract rights | They manage the settled agreement. |

An automatic party label is an identity hint, not a verified human or company name. Full party IDs and actual signing authority remain authoritative. Publication is not a collateral-balance proof or credit assessment; the ledger checks compatible cash when a lender funds a quote and collateral when the borrower accepts.

## Why Canton Is Useful Here

The borrower signs the OpenRequest once. A lender can submit its own funded quote using that published disclosure and its own account authority; the borrower need not separately sign in for every quote. The funded quote uses the existing bilateral core contracts. Acceptance still belongs to the borrower, and settlement exchanges cash against collateral atomically.

## Public Evidence for Controlled Disclosure

The Canton Network's November–December 2023 pilot involved **45 firms, 22 applications and over 350 simulated transactions**. Its report describes permissioned views of relevant data across interoperating applications. This is infrastructure context, not Symbolon adoption or a completed customer pilot.

Source: [Digital Asset's March 2024 pilot announcement](https://blog.digitalasset.com/press-release/the-canton-network-completes-the-most-comprehensive-blockchain-pilot-to-date-for-tokenized-real-world-assets) and the [Canton Network Pilot Report, pp. 2–5 and 29](https://www.canton.network/hubfs/Canton%20Network%20Files/Images/Pilot%20Program/Canton%20Network%20Pilot%20Report-1548ed.pdf).

## Privacy Has Boundaries

Request disclosure is deliberate and broader than quote disclosure. Withdrawn requests can no longer receive new quotes, but copies already disclosed cannot be erased. Legacy private records are not automatically republished by this change.

The app/database operator can read stored disclosures and quote-index metadata. Hosting providers, participant administrators, issuers and permitted witnesses remain trust dependencies, and asset effects can allow inference. UI hiding is not an API authorization boundary. The technical [Privacy and Visibility](../architecture/privacy-and-trust.md) page shows the exact roles, published-disclosure exception and shared-party implications.
