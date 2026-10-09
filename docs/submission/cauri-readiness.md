# Cauri fresh-wallet rehearsal readiness

Prepared 9 October 2026. This is a preparation record, not live Cauri compatibility or customer-adoption evidence.

## Work prepared before the provider reply

- Pinned official `@lithiumdigital/cauri-dapp-sdk` version `0.2.0`.
- Staged, tested DevNet adapter construction in `web/src/ledger/cauri-profile.ts`. It is not yet registered in the public wallet picker.
- Explicit wallet host: `https://devnet.cauri.cc`.
- Explicit dApp API host: `https://api.devnet.cauri.cc`.
- Required deployment identities come from `web/public/deployment.json`; the profile rejects MainNet, a different wallet network, or missing core/access package, synchronizer and desk identities.

Official SDK reference: [Cauri SDK](https://github.com/lithiumdigital/cauri-dapp-sdk). Package placement reference: [PartyLayer Canton topology](https://partylayer.xyz/docs/partylayer-and-canton-topology).

## Information needed from Cauri

1. Invitation and fresh-account access on **DevNet**, including whether tester invitations can be provided.
2. Support for Symbolon's custom Daml templates through CIP-103 `ledgerApi` and `prepareExecuteAndWait`.
3. The process for uploading and vetting the same Symbolon packages on the participant hosting the wallet party.
4. Access to the same synchronizer as Symbolon's published desk, or confirmation that a separate deployment will be required.

## Public deployment identity to share

- Core package: `1d40e972b56e42c279140639d33dc362b432f2c0f608c77ec36410f0395f3e19`.
- Public access package: `c2eeb6d65814e813ecc6dc2c3e583b31f20bf9b8781f956fd6250d8b720cd04b`.
- Synchronizer: `global-domain::1220be58c29e65de40bf273be1dc2b266d43a9a002ea5b18955aeef7aac881bb471a`.
- Public test-asset policy: `0.1 cBTC-demo` and `5,000 USDCx-demo` per claim. These have no monetary value.

An invitation solves wallet creation. It does not prove that custom templates are vetted or that cross-participant transactions can be routed. PartyLayer does not host participants or move packages between networks.

## Rehearsal after access is available

| Step | Evidence required |
| --- | --- |
| Create a fresh wallet | User completes invitation/passkey setup on the official wallet host; no keys or invitation codes are collected by Symbolon. |
| Connect | Live wallet party and effective DevNet network match the selected session. |
| Participant readiness | Required packages are installed/vetted and the party can submit on the configured synchronizer. |
| Ledger read | An authenticated own-party read succeeds; an empty private book is allowed. |
| Market discovery | Published pair is visible as Reference before the party receives a private feed. |
| Faucet | User approves the test-asset action. Matching committed receipt and own holdings/feed are verified. |
| Request and offer | Borrower creates a private request and receives a funded offer; contractual repayment is shown before settlement. |
| Settlement | User approves; matching committed ledger evidence creates the position and exchanges the simulated cash/collateral. |
| Repurchase | User approves full agreed repayment; matching dealer payment, unlocked collateral return and `ClosedRepo: Repurchased` are verified. |
| Reload and identity change | Same authorized session can restore; changing party/network discards the old view and blocks stale authority. |

## SDK behaviors to review during wiring

- Use the official adapter instance in PartyLayer's `adapters` list, alongside the existing adapters. Preserve the bound party/network checks and correlated ledger confirmation.
- The SDK uses an approval popup and verifies both its source window and configured wallet origin. Test popup-blocked, rejected, closed and timed-out paths.
- SDK `prepareExecuteAndWait` uses a terminal `txChanged` event. An approval or signed-only event is not a committed receipt; correlate command/update/synchronizer through the ledger.
- SDK `CauriUserRejectedError` uses code `4001` for multiple reasons. Treat a timeout or uncertain post-approval closure conservatively; do not erase an ambiguous pending command merely because the error has a rejection code.
- The official SDK persists a wallet session token in localStorage. Keep this separate from Symbolon's public UI preferences; never include it in logs, exports, URLs or submission evidence. Review restore/disconnect and session isolation with the real provider.

## Evidence boundary

Current evidence is official SDK inspection, staged adapter/configuration tests, and existing Symbolon engineering proof. No Cauri invitation, connected wallet, native signature, external borrower/lender rehearsal or customer adoption has been obtained through this preparation.
