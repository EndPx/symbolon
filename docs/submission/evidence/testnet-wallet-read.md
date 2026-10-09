# Direct TestNet wallet and package checks

Checked on 9 October 2026 against the public app at https://symbolon-testnet.vercel.app/app . This records actual connection/read evidence, not a financing deployment.

The user subsequently selected two Grofty accounts and asked to remove Send from the TestNet app. The live picker/restoration path now uses Grofty only. Send observations below are historical and do not establish Grofty's capabilities.

## Observed results

- A real Send TestNet wallet connected through the updated native Sigilry 3 discovery/transport path. Its allocated primary party was bound to the app, and an own-party active-contract read completed.
- The wallet participant returned Canton ledger version `3.5.19`.
- Its supported-package list did not contain the existing Symbolon core package `1d40e972b56e42c279140639d33dc362b432f2c0f608c77ec36410f0395f3e19`.
- Its connected-synchronizer endpoint returned one connection. A counter derived from one permission encoding was removed: external wallet signing capability cannot be concluded from that counter.
- The Send gateway refused `/v2/users/{userId}/rights` with HTTP 403 and `Resource not allowed`. This demonstrates a gateway route restriction, not proof that all package deployment methods are forbidden. The follow-up probe uses the gateway's advertised `/v2/authenticated-user` resource instead.
- The user also supplied a screenshot of a connected Grofty TestNet party. Its package/version probe returned `Unknown or unsupported ledgerApi resource` for `/v2/version`; connection success and that endpoint's availability are separate results.
- A later Send attempt reached a signed-out wallet portal requiring passkey login. The user must complete this step; app permission alone is not an active authenticated wallet session.
- After the user completed login, the direct DAR attempt reached `Failed to fetch`. No successful upload or package installation was confirmed, and no automatic retry was performed. The user then stopped Send work.

## Changes and boundaries

The Grofty Connect button now uses the configured deployment network instead of passing MainNet unconditionally. Send TestNet uses the current native SDK, the announced routing target and `listAccounts` primary selection. Already-approved connections do not request another connect unless status reports disconnected. Reads check party/network before and after responses, and session changes discard stale results.

Account exposes a read-only participant check and a bounded application-DAR attempt. Binary upload is possible only when the wallet explicitly supplies an authenticated endpoint on the approved Send TestNet gateway. The archive checksum is checked against the reviewed build, an already installed package is not re-uploaded, and no upload request is retried automatically. No DevNet credential is sent to TestNet.

The reviewed DAR is the existing simulated-holding model, not a real cBTC/USDCx adapter. A successful package upload would not establish token compatibility or a working repo. Request creation, funded quotes, settlement and repayment remain disabled on TestNet until their dependencies and execution are verified.

130 frontend tests and the TestNet build pass. No financing transaction, faucet request or token transfer was submitted during these checks. Screenshots retained locally exclude keys, recovery phrases and access tokens.
