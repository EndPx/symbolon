# Privacy and trust model

Privacy has three layers: the stakeholders and witnesses defined by Daml, the rights enforced on Ledger API access, and the operators of the infrastructure hosting those parties. Symbolon must satisfy all three in a real deployment. Hiding data in the browser addresses none of them on its own.

## Expected contract visibility

This matrix describes direct stakeholder visibility in the model. Transaction witnesses can also receive consequences of actions they are entitled to see. It is therefore not a claim that every non-stakeholder can never learn an individual field in any transaction.

| Record | Borrower | Relevant dealer | Other dealer | Oracle | Demo issuer |
| --- | --- | --- | --- | --- | --- |
| RFQ addressed to Dealer A | Yes | Dealer A | No automatic access | Not by its oracle role | Not by its issuer role |
| Dealer A quote | Yes | Dealer A | No automatic access | Not by its oracle role | Sees related asset effects where entitled |
| RepoPosition | Yes | Winning dealer | No automatic access | Not a position stakeholder | Not a position stakeholder solely as issuer |
| SubstitutionProposal | Yes | Position dealer | No automatic access | Not by its oracle role | Sees related asset effects where entitled |
| ClosedRepo | Yes | Position dealer | No automatic access | Not by its oracle role | Not a receipt stakeholder solely as issuer |
| PriceFeed | If listed as reader | If listed as reader | If listed as reader | Signatory | Only if independently entitled |
| Demo Holding | If owner/viewer/lock party | If owner/viewer/lock party | Only if independently entitled | Only if independently entitled | Signatory |

The issuer is not a neutral party that disappears from the transaction. It signs demo holdings and can observe their lifecycle. Asset transfers can reveal information even when the issuer is not a stakeholder of the repo position itself. A production adapter must document the real token's disclosure model.

## Authority is separate from visibility

An observer can see a contract but cannot automatically exercise every choice. A controller has authority for the named choice. Signatories authorize contract creation and consequences under Daml's authorization rules. The contract model uses these roles to compose settlement without asking the UI to impersonate another party. Refer to Digital Asset's [templates](https://docs.digitalasset.com/build/3.4/reference/daml/templates.html) and [choices](https://docs.digitalasset.com/build/3.4/reference/daml/choices.html) references.

## Trust dependencies

| Actor or system | What must be trusted | What the prototype does not solve |
| --- | --- | --- |
| Borrower/dealer wallet | Correct party, intended approvals, protected keys | Compromised browser or wallet |
| Hosting participant operator | Correct access control and handling of hosted data | Privacy from an administrator hosting all parties |
| Demo issuer | Honest creation and handling of demo holdings | Asset authenticity, reserves, redemption or issuer revocation |
| Oracle | Economically correct mark for the identified pair | Price manipulation or independent price discovery |
| Synchronizer/network | Required infrastructure availability and protocol operation | Guaranteed availability under outage |
| Application host | Untampered frontend delivered to users | A malicious replacement browser bundle |

## Tests and their limits

Party-scoped queries can demonstrate that a losing dealer does not see the winning position or another dealer's quote. They do not establish that parties use independent participant operators, that no operator has privileged access, or that no information is inferred from off-ledger messages.

For a multi-node privacy demonstration, record the party-to-participant topology, credentials, permitted readers, test queries and contract IDs. Verify both positive access for the counterparties and negative access for an unrelated party. Avoid publishing the sensitive payloads being used to prove that they are private.

No anonymous identity scheme, traffic-analysis defense, universal compliance policy, or legal confidentiality undertaking is supplied by this prototype.
