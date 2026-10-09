# Shared DevNet

The public [Symbolon app](https://symbolon.endpx.cloud/app) uses the shared HackCanton DevNet participant. Users connect their own authorized account parties and use simulated cBTC-demo / USDCx holdings.

## Current application flow

A borrower signs one OpenRequest and consents to publish its full terms to authenticated connected Symbolon parties. Unauthenticated readers see only random ID, supported market/pair, open state and date. Lenders quote directly with their own authority and compatible existing cash; no access-request approval is needed. The offchain board indexes verified ledger publications; it is not an external liquidity pool or evidence of customer adoption.

## Network and public contract identities

| Item | Current value |
| --- | --- |
| Network | HackCanton DevNet |
| Participant | hackcanton-devnet-3 |
| Core package | `1d40e972b56e42c279140639d33dc362b432f2c0f608c77ec36410f0395f3e19` |
| OpenRequest package | `53e322d473cb992c4d38889869bc7b4e0a814cc6e10af3492aa126a24735c882` |
| OpenRequest template | `Symbolon.OpenRequest:OpenRequest` |
| Public access package | `c2eeb6d65814e813ecc6dc2c3e583b31f20bf9b8781f956fd6250d8b720cd04b` |
| Public access contract | `00e16002aadc1044748a4b560d48e71aec87eb88b49f49d65e017af48e0bd8639bca1212204e445d12cb185ccfeee0e0ad4720de77f0295db561f87fc5c61ad56bd70cfc5a` |
| Test issuer and reference oracle | `229547bc-symbolon-proof-c685b6d1-dealer::12204a9d883d1158141d8f099d06dd2e42cb52615deb42da5a46f042c8d0e1dbdf0e` |
| Assets | cBTC-demo collateral / USDCx cash |

These Canton identifiers are recorded in the [deployment profile](https://github.com/EndPx/symbolon/blob/main/web/public/deployment.json). They are not EVM addresses. Inspection uses the authorized [NODERS Console](https://console.participant.hackcanton-01.devnet.naas.noders.services/); this shared environment has no public transaction explorer.

The separate OpenRequest DAR has been uploaded and vetted on the shared DevNet participant. A founder-operated rehearsal with synthetic test roles completed publication, a funded 7% quote synchronized from its original receipt, settlement with request withdrawal, and full repurchase. The 1,000 USDCx principal over 30 days repaid **1,005.8333333333 USDCx**; **0.0250 cBTC-demo** returned and the closing record reached **ClosedRepo: Repurchased**. This establishes a simulated shared-DevNet cycle, not external customers, independent operators or native-token financing.

The [direct Open RFQ execution record](https://github.com/EndPx/symbolon/blob/main/docs/submission/evidence/open-rfq-devnet.md) retains the agreement, update IDs, screenshots and evidence limits. Both synthetic roles were authorized under one operator account; this was not an independent-wallet or independent-operator rehearsal. No competing offer existed in that live request, so cleanup of multiple reservations is supported by separate contract tests rather than attributed to this cycle.

## Example from retained execution

A completed simulated repo used 1,000 principal, 5.20% APR and 30 days. Its agreed repayment remained **1,004.3333333333** through a lower mark, margin call, top-up and Repurchased closure. [Retained shared-network records](https://github.com/EndPx/symbolon/tree/main/docs/submission/evidence) include correlated receipts and source checks.

Those historical runs are execution evidence. They do not mean that the discovery board has attracted external counterparties. The public reference is single-operator and simulated; the separate LocalNet DecMan demonstration is the governed integration evidence. Native wallet-signed financing, independent operators and real-token settlement remain separate verification gates.
