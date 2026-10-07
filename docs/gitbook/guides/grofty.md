# Grofty MainNet integration

Symbolon includes a dedicated transport for the official `@groftylabs/dapp-sdk`, pinned to **0.2.0**. It connects the wallet's own party to the repo action builders used by the desk. This is source-level integration; a successful local demo or fake-provider test does not establish a working MainNet repo. The current release has executed a simulated-asset repo on shared **DevNet** through authenticated Ledger API submission, without Grofty or browser-wallet signing. See [status and limitations](../reference/status.md).

Grofty is a MainNet path, separate from the [PartyLayer DevNet guide](wallet-devnet.md). Changing the runtime network profile does not move a Grofty account to DevNet or make local demo parties available in its wallet. The bounty is deferred; this adapter is a source prototype and is hidden from the submitted wallet picker. Runtime release checks block real trading.

## Compatibility and identity

The adapter checks the provider identity, requires **Grofty Wallet 2.0.4 or later**, and requires network ID `canton:da-mainnet`. It also requires an allocated primary account with a nonempty party ID on that network. An unsupported version, unavailable account or wrong network prevents opening the session.

The SDK and extension have different versions: SDK `0.2.0` does not mean extension `0.2.0`. The [official SDK repository](https://github.com/groftywallet/grofty-dapp-sdk) documents the extension compatibility requirement and prepared-transaction API.

An explicit connection action may request wallet permission. Restoration checks an already authorized connection and its primary account without opening a connection prompt on page load. A remembered wallet selection is only a preference; it does not supply signing authority.

The application integration point is `connectWallet("grofty", "mainnet")`. Its session exposes `networkId: "canton:da-mainnet"` and the reported `walletVersion`. Public connection preferences use the `symbolon.session.v3` storage key; credentials and signing keys are not stored there. There is no Grofty credential environment variable to configure.

## Why there is a dedicated adapter

Grofty exposes a restricted read surface, not an arbitrary Ledger API proxy. Its SDK supports several own-party reads, but deliberately does not advertise a complete generic `ledgerApi` capability through the wallet registry. Requiring that capability or forwarding `POST /v2/commands/submit-and-wait` through its reader would be incorrect.

Symbolon's adapter in `web/src/ledger/grofty.ts` uses two read operations:

| Desk request | Grofty operation | Scope |
| --- | --- | --- |
| Current ledger offset | `ledgerApi` for `/v2/state/ledger-end` | Current wallet connection |
| Active contracts at that offset | `getActiveContracts` with created-event blobs | Connected party only |

The adapter rejects requests for another party and does not expose participant administration or a party directory. An empty wallet book is not permission to switch to a local borrower or dealer identity.

## Submitting a repo action

The session calls `prepareExecuteAndWait` with the Daml command array and a unique command ID. It omits `actAs` and `userId`; Grofty supplies the signing identity. When `readAs` is present, it contains only that same party. Additional submission context is restricted to disclosed contracts, synchronizer ID and package selection preferences.

The actual controller initiates each top-level repo choice. Daml contracts provide the authority already delegated by the counterparties. This does not require the wallet to impersonate both sides. It also does not allow one MainNet wallet to operate every seeded local role: issuer, oracle, borrower and dealer remain independently authorized parties.

The adapter accepts a result only when its transaction status is `executed`, its command ID matches the request, its update ID is present, and its completion offset is valid. A resolved promise or an open approval popup alone is not a successful action. The desk can then refresh state and show the confirmed update ID.

Asset preparation may require several separately committed commands. Merging or splitting an owner-only holding keeps its original balance private before the bilateral action, but on MainNet it may also mean multiple approval and fee-bearing steps. Review the complete sequence; one visible product action does not always mean one ledger transaction.

## Pending requests and changing accounts

The wallet owns its three-minute approval deadline. The adapter's SDK backstop is **240 seconds**, allowing the wallet to report its own timeout. Only one prepared submission can be pending per bound session.

The session checks the provider, connection, network and primary account before reading or submitting. It listens for account and connection/status changes, invalidates the old session when required, and removes listeners when disposed. Pending state associated with one party must not be displayed as another party's book.

If an account changes while a submission is pending, a transaction may already have committed for the original party. The adapter reports the committed update ID when available and requires reconnection; it does not silently resubmit for the new account.

| Result | Meaning and next action |
| --- | --- |
| `4001` | The user explicitly declined permission. Review before initiating a new request. |
| `4100`, disconnected or wrong-network state | Current authorization is unavailable. Unlock/reconnect and reload the correct party. |
| `-32601` | Required capability is unavailable. Check the extension version and supported API. |
| `-32602` | Request parameters are invalid. Inspect the party, contract IDs and context. |
| `-32603`, missing or mismatched receipt | The app cannot confirm the outcome. Check wallet history and refresh ledger state before retrying. |

An expired approval and an internal error can share an error code. An uncertain result must not be labelled as an explicit rejection or as proof that no transaction occurred.

## MainNet readiness for the existing repo model

Connecting Grofty does not provision the repo's dependencies. Before an authorized end-to-end run, establish all of the following on the actual MainNet hosting path:

1. Invited/onboarded wallet access, the supported extension and its actual primary party.
2. The exact Symbolon core package available and vetted for the relevant participants and synchronizer context.
3. Authorized issuer, oracle and counterparties, with the intended parties able to read the contracts they need.
4. Holdings with the exact issuer/instrument identities and ownership expected by the repo, and a fresh agreed price feed.
5. Any required disclosure and synchronizer context for the selected topology.
6. Applicable account/transfer preapprovals, fee funding and a reviewed fee budget for the full action sequence.

The current `Symbolon.DemoAsset.Holding` is a simulated instrument even if its contract is created on MainNet. A real MainNet transaction using it would incur real network or wallet charges while transferring demo quantities. It would not become a real CUSD, CETH, Treasury or cBTC repo. Production token settlement requires an [asset adapter](../architecture/adapters.md).

The local `demo.ps1` setup and role selector are not MainNet provisioning tools. They must not be pointed at a real network as a shortcut for issuer or counterparty authorization.

## Disclosed contracts

The client retains created-event blobs and synchronizer IDs returned with active contracts. Optional disclosed-contract inputs require all four fields: `templateId`, `contractId`, `createdEventBlob` and `synchronizerId`. These values support preparation context; they do not grant a new party authority.

Accepting this envelope does not implement automatic counterparty exchange or prove cross-participant settlement. The application currently has no production service for routing disclosure packages. Establish provenance, minimum required disclosure, delivery to the intended party and actual topology behavior before claiming that integration.

## Transfers, preapproval and the bridge

Grofty documents [account onboarding](https://grofty.cc/docs/quick-start), [CC/USDCx and preapproval](https://grofty.cc/docs/canton-network), and [transfer/bridge flows](https://grofty.cc/docs/transfer-flow) separately. Its wallet profile shows the full Party ID, wallet status, CC and USDCx preapproval states, and bridge onboarding state. Check those states in the wallet before a real funding flow; the party hint alone does not uniquely identify a recipient. Transfer preapproval concerns applicable incoming asset transfers. DApp connection permission concerns the app's wallet interaction. Bridge onboarding concerns an external-network funding route. None substitutes for the others, package deployment or a token adapter.

The [transfer-flow guide](https://grofty.cc/docs/transfer-flow) describes the wallet's prepare, local-sign and execute stages for its own asset transfers. For Symbolon's dApp command envelope and receipt handling, the [official Grofty dApp SDK](https://github.com/groftywallet/grofty-dapp-sdk) is the relevant API reference. Symbolon does not implement Grofty's wallet transfer backend or fee logic. A CC transfer fee example in the wallet docs must not be treated as a universal fee estimate for repo commands; review each wallet approval and maintain enough CC for applicable network fees.

An inbound bridge may deliver a supported real asset to Canton. It does not mint Symbolon's demo CUSD/CETH or supply the asset lock and atomic-transfer behavior needed for repo settlement. Symbolon has no implemented native bridge flow in this integration. A wallet link or an instruction to bridge elsewhere is not evidence for a bridge bonus.

## Verification and bounty evidence

Run the repository's client tests and production build before an installed-wallet check. Record the exact SDK, extension, browser, party hosting context, package IDs and tested revision. Then distinguish discovery, silent restoration, own-party reads, rejected requests, approved commands and completed product actions in the evidence.

The recorded post-integration run passed **22/22 client tests**, including **13 Grofty tests**, and the production build. These Grofty tests exercise the actual SDK 0.2.0 through a fake CIP-0103 provider. They do not establish access to an installed wallet or successful MainNet execution.

The [Grofty challenge](../mission/challenges.md) requires MainNet evidence. No MainNet transaction, fee payment, qualifying video or sponsor approval is claimed by this guide. When those milestones are completed, attach the actual receipt and narrowly describe what it proves rather than promoting every integration test to a production claim.
