# Wallets and DevNet readiness

This guide covers the desk's PartyLayer path and shared hackathon DevNet. The browser reads its network and reviewed package from runtime `/deployment.json`; see [network promotion](network-promotion.md). This setting does not allocate a party, deploy packages, provision assets or establish participant connectivity. Grofty bounty work is deferred and its prototype adapter is hidden from the submitted wallet picker.

## Prepare the network

Before a wallet demonstration, identify the actual participant, synchronizer, supported SDK/runtime versions and operator process. Obtain confirmation that the Symbolon package is uploaded and appropriately available, that the demo or real asset package is supported, and that the party can submit the required commands.

If the network uses real tokens, resolve the [asset adapter requirements](../architecture/adapters.md) first. The local `Holding` template is not automatically compatible with a token called CUSD or cBTC elsewhere.

## Connect and test progressively

| Check | Required evidence |
| --- | --- |
| Wallet discovery | Wallet option is discovered in the browser actually used |
| Connection | Returned party ID and network match the intended account |
| Read access | The wallet can query ledger end and permitted active contracts |
| Package availability | The deployed Symbolon templates resolve on that participant |
| Submission | An authorized low-impact test command commits |
| Economic action | Quote and settlement execute with supported asset inputs |
| Privacy | Unrelated parties cannot query the resulting private records |
| Recovery | Reconnect, rejection, stale inputs and network errors are handled |

Perform these checks for each claimed wallet/network combination. A successful connection through one wallet does not validate every registry entry or every browser.

## Application settings

- `config/deployments/devnet.json` chooses the PartyLayer network, package, synchronizer and public asset identities. Configure it with `scripts/configure-deployment.mjs` before hosting.
- `VITE_LEDGER_URL` controls the direct HTTP transport base when that transport is used; it is not a secret bearer token or a general proxy for wallet authorization.
- `LEDGER_ORIGIN` configures the development proxy's upstream server.

Build-time `VITE_` variables are public. Production authentication must come from a supported wallet or appropriately secured participant integration, not credentials embedded in JavaScript.

## Honest deployment reporting

Record wallet name/version, browser, participant, synchronizer/network, package build and tested actions. Until that record exists, describe the integration as implemented but unverified on the intended DevNet. Do not equate local sandbox results with shared-network deployment.

The BitSafe Contribution Pool work has additional topology requirements. See the [LocalNet guide](bitsafe-localnet.md).

## Shared hackathon participant: approved provisioning path

The organizer's [Canton DevNet Quickstart](https://hackmd.io/@IzUWaelHTRa_fG1NRW376w/HkBpCR5YGx), read on 23 September 2026, describes a tenant account on a NODERS-operated participant. This is a shared node, not a decentralized-party deployment.

1. Sign in to the [DevNet Wallet](https://wallet.validator.hackcanton-01.devnet.naas.noders.services) with the hackathon account and use its self-onboarding action if needed. Wait for allocation rather than submitting it repeatedly.
2. Open the [Node Console](https://console.participant.hackcanton-01.devnet.naas.noders.services/) using Authfactory SSO. Record the ledger user ID, full party ID, endpoint and namespace shown for the account.
3. Create additional role parties through the Console's Parties tab. Verify the account's `CanActAs` and `CanReadAs` rights; a party can exist even when its rights grant failed.
4. Upload the built core DAR through Collections → Upload DAR and verify the resulting package/vetting state. The tenant token does not replace the Console's scoped administration operations.
5. Query the running node's version and OpenAPI schema before preparing script requests. A local sandbox's request shape or default user ID is not automatically correct for that participant.

The guide says an altered model cannot be uploaded with the same package name and version as different content already present. Use a new appropriate version, or a new package name for an incompatible model, and handle existing contracts explicitly. Name-based template resolution is not a workaround for upgrade rules.

## User-run CLI authentication

The guide provides a Keycloak password-grant flow for the participant's existing platform credentials. This is a user-terminal operation, not a login mechanism to embed in Symbolon's static browser bundle. For a custom SPA or machine-to-machine flow, the guide directs developers to coordinate with NODERS.

The following original PowerShell example prompts locally and retains tokens only in the terminal process. Do not paste passwords or tokens into chat, commit them, print the response, or save them into `VITE_` variables. No browser storage extraction is required.

```powershell
$devnetApi = 'https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services'
$devnetOidc = 'https://keycloak.naas.noders.services/realms/noders-appsfactory/protocol/openid-connect/token'
$devnetClient = 'web-app-ui-hackcanton-01-devnet'
$devnetCredential = Get-Credential -UserName (Read-Host 'Platform email') -Message 'HackCanton DevNet login'
try {
    $devnetTokens = Invoke-RestMethod -Method Post -Uri $devnetOidc `
        -ContentType 'application/x-www-form-urlencoded' -Body @{
            grant_type = 'password'
            client_id = $devnetClient
            username = $devnetCredential.UserName
            password = $devnetCredential.GetNetworkCredential().Password
            scope = 'openid daml_ledger_api offline_access'
        }
} finally {
    Remove-Variable devnetCredential -ErrorAction SilentlyContinue
}
$devnetHeaders = @{ Authorization = 'Bearer ' + $devnetTokens.access_token }
$devnetVersion = Invoke-RestMethod -Uri "$devnetApi/v2/version" -Headers $devnetHeaders
$devnetVersion
```

The bearer value must be `access_token`, not `id_token` or `refresh_token`. If a command supplies `userId`, use the account's ledger user ID/JWT subject shown in the Console, not the local sandbox value `symbolon-local`. The official [Canton 3.5 OpenAPI definition](https://docs.digitalasset.com/build/3.5/reference/json-api/openapi.html) permits omitting `userId` when authenticating with a user token; the participant then takes the user identity from that token. Symbolon's wallet transport uses this option rather than inventing an account ID. Node rights still determine which parties it can read or act as.

For longer terminal sessions, the documented refresh grant is `grant_type=refresh_token` with the same client ID and the current refresh token. Replace both retained token values with the new response because rotation may occur. The requested offline scope can produce a long-lived refresh credential; treat it with password-level care. Close the terminal or remove the retained token/header variables when finished.

The approved gRPC endpoint is `ledger-api-grpc.participant.hackcanton-01.devnet.naas.noders.services:443` with TLS and bearer metadata. The JSON API exposes `/docs/openapi` and `/docs/asyncapi` for the exact runtime request shapes. The guide's newer ACS example uses `eventFormat`, while some local client versions use `filter`; compare against the node's schema instead of retrying guessed payloads.

Provisioning, package upload, an authenticated read, a committed command and an end-to-end wallet trade are separate milestones. These instructions do not assert that all have already been completed for Symbolon.
