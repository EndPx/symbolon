# Installed BitSafe LocalNet and browser integration

On **8 October 2026 WIB**, Symbolon's BitSafe LocalNet was installed on an
existing Linux VPS. It runs the official LocalNet 0.6.12 sandbox, Canton JSON
API 3.5.8 and three DecMan v1.8.0 services. The source pin remains
`21ffdedf64366b1f2824301c434b427bf4726663`; the manager image digest is retained
in the [evidence JSON](bitsafe-vps-localnet.json).

The three Canton participant instances run in one Canton container. All three
participants and all three managers are controlled by one operator on one
host. This is Contribution Pool LocalNet evidence, without an independent
operator, outage tolerance, MainNet or live DevNet decentralized-party claim.

## Installed topology and reproduction

The decentralized party is
`symbolon-oracle-localnet::1220c505193c7c962c0ad4dfeb6850a0a54ceb71636bd986c7d120e742c71f688265`.
The live governance rules contain exactly three member parties and require two
confirmations. The owner/topology threshold is also two of three. Manager UI
reads verified three hosting participants and governance threshold two.

The installation uses its own Compose projects, container names, network,
persistent databases, and bounded container logs. Participant and manager
host ports bind to loopback; Postgres and Splice have no host ports. An SSH
tunnel makes the private services accessible from the operator's laptop.

Follow [installation and run instructions](../../../infra/decman/README.md).
The public app remains on shared HackCanton DevNet. The separate development
profile serves `/app` on localhost port 15173 with the same financing UI.
Its seeded-party picker exists only on loopback in development mode; remote
wallet signing is disabled on the LocalNet profile. The unsafe sandbox token
is attached only by the local server proxy and is absent from the manifest.

The starter's DecMan UI displays `devnet` because that is its configured
network enum. It points at the private sandbox participants and local
synchronizer; that label is not evidence of shared DevNet deployment.

## Reproduced application integration

The installation completed the Symbolon harness twice. The retained named-role
run has **13 application update receipts**, the actual below-threshold ledger
rejection, the two-member mark execution, margin call, top-up, and
`ClosedRepo: Repurchased`. Its audits specifically match the initialization
and mark proposal CIDs from that run on all three participants. Older
executions on the persistent ledger do not satisfy this check.

The repeatable mark helper also verified the current live member set, threshold,
member configuration, creation receipt, exact feed identity, and the same
execution update ID in all participant audits. It reread that transaction to
verify replacement of the original feed. A pending command marker prevents
creating another proposal after an unresolved submission.

## Browser lifecycle using the committee oracle

An additional financing lifecycle ran through the actual frontend connected to
this installed LocalNet. Setup provisioned the test roles and holdings; the
browser submitted RFQ, dealer quote, acceptance, margin call, top-up and
repurchase. The committee price publication ran through the LocalNet-only
DecMan helper, not through a direct browser oracle choice.

1. Borrower requested 1,000 USDCx-demo against 0.025 cBTC-demo for 30 days.
2. Dealer reserved cash and quoted 5.2% annualized ACT/360. Browser review showed
   `1004.3333333333` before acceptance.
3. Settlement locked collateral and delivered cash; health factor was 1.43.
4. One confirmation failed; two approved the 60,000 → 36,000 mark. The browser
   read this actual replacement feed and showed health factor 0.86.
5. Dealer issued a margin call using that exact governed feed CID.
6. Borrower added 0.005 collateral, restoring health factor to 1.03.
7. Browser repurchased for the unchanged amount. Closure returned the original
   0.025 and top-up 0.005 as two unlocked holdings, totaling 0.030 collateral.
   Available collateral returned to 0.1000; no position remained open.

| Committed operation | Offset on borrower participant | Update ID |
| --- | ---: | --- |
| Funded dealer quote | 337 | `12203c31846a074518e9edf1b99ce4e5e646dd63ed1fd4d899f54a0afa9e8a78b019` |
| Browser settlement | 342 | `1220b58fe14cb9e8d1b1fe2dc70eaf8d79a362bd5af68756c25840173fdfdbb9d35b` |
| Governed mark | See all-node audits | `1220d11fd39a67dbbf1492580f5006f8396a4f33786fdf3e43db2ce6ebab9fe7df0f` |
| Browser margin call | 357 | `1220c332e5967fc7d787523b7316fcb9138f4a70dea678af93b17ca53ec3f128ecc7` |
| Browser top-up | 360 | `12205afe6801429522ca4439afec324b3806e948d52e2a61d92ee707f7339e0e78df` |
| Browser repurchase | 369 | `1220a9760034b2f54e5f7fd033836388be74b20fe08539393a05718d83a0e566783a` |

The five final browser update IDs were reread through the borrower-authorized
event filter. The record checks exact repayment, dealer cash receipt, the sum
of returned unlocked collateral fragments and `Repurchased`. This table does
not count every preparatory asset transaction. The RFQ completion and numeric
before/after states are additionally retained in the private browser log.

An unrelated test-party view contained no position, private quote or holding.
This is controlled party-scoped evidence, not secrecy from the host operator.
Assets and marks remain simulated; governance approval does not establish an
economically correct market price. The public shared DevNet desk retains its
separate standing reference oracle.
