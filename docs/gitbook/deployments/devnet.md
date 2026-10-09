# Shared DevNet

The public [Symbolon app](https://symbolon.endpx.cloud/app) uses the shared HackCanton DevNet participant. Users connect their own authorized account parties and use simulated cBTC-demo / USDCx-demo holdings.

## Current application flow

A lender registers for the market, the borrower approves All registered lenders and sends separate requests, and each lender supplies its own APR and funded offer. The directory is deployed discovery metadata; it is not an external liquidity pool or evidence of customer adoption.

## Network and public contract identities

| Item | Current value |
| --- | --- |
| Network | HackCanton DevNet |
| Participant | hackcanton-devnet-3 |
| Core package | `1d40e972b56e42c279140639d33dc362b432f2c0f608c77ec36410f0395f3e19` |
| Public access package | `c2eeb6d65814e813ecc6dc2c3e583b31f20bf9b8781f956fd6250d8b720cd04b` |
| Public access contract | `00e16002aadc1044748a4b560d48e71aec87eb88b49f49d65e017af48e0bd8639bca1212204e445d12cb185ccfeee0e0ad4720de77f0295db561f87fc5c61ad56bd70cfc5a` |
| Test issuer and reference oracle | `229547bc-symbolon-proof-c685b6d1-dealer::12204a9d883d1158141d8f099d06dd2e42cb52615deb42da5a46f042c8d0e1dbdf0e` |
| Assets | cBTC-demo collateral / USDCx-demo cash |

These Canton identifiers are recorded in the [deployment profile](https://github.com/EndPx/symbolon/blob/codex/public-devnet-app/web/public/deployment.json). They are not EVM addresses. Inspection uses the authorized [NODERS Console](https://console.participant.hackcanton-01.devnet.naas.noders.services/); this shared environment has no public transaction explorer.

## Example from retained execution

A completed simulated repo used 1,000 principal, 5.20% APR and 30 days. Its agreed repayment remained **1,004.3333333333** through a lower mark, margin call, top-up and Repurchased closure. [Retained shared-network records](https://github.com/EndPx/symbolon/tree/codex/public-devnet-app/docs/submission/evidence) include correlated receipts and source checks.

Those historical runs are execution evidence. They do not mean that the new registered-lender directory has attracted external counterparties. The public reference is single-operator and simulated; the separate LocalNet DecMan demonstration is the governed integration evidence. Native wallet-signed financing, independent operators and real-token settlement remain separate verification gates.
