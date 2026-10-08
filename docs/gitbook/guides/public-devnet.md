# Public DevNet access

The public product entry is `/app`. HackCanton account sign-in uses authorization
code with PKCE against the existing NODERS identity provider. The participant
validates the user's token and existing party rights. Account access is a hosted
participant flow; it is not evidence of a browser wallet signature or MainNet
custody. Access and party allocation require a HackCanton/NODERS account.

The public access package is vetted and the enabled DevNet profile now references
an actual dedicated dealer contract. The primary account borrower flow was
verified through the frontend, including a trade from the public app URL. See
[public receipts](../../submission/evidence/public-devnet.md) and
[executed UI coverage](../../submission/evidence/frontend-e2e.md). The connected,
missing-market, read-only and failed-read states are separate; a connected account
is not asked to connect again because trading is paused.

After connection, the app lists only parties for which that account has `CanActAs`.
Ledger views filter only the selected party. Access/refresh tokens stay in memory;
the browser stores a temporary PKCE verifier and public pending-command metadata,
not passwords or private keys. Reconnecting after a reload uses a new sign-in flow.

## Public access contract

`symbolon-public` depends on the unchanged `symbolon-v2` v0.2.0 package. Its
`PublicDesk` contract authorizes three DevNet-only operations:

- `ClaimDevnetAssets` issues 0.1 cBTC-demo and 5,000 USDCx-demo to the submitting
  claimant and creates an explicitly simulated reference feed readable by that
  claimant and its operator. Grants are repeatable test assets with no monetary value.
- `RequestFundedQuote` checks the caller's signed RFQ, dealer, oracle, both issuers,
  denominations and principal cap before issuing exact dealer cash and invoking
  the original consuming `SubmitQuote` choice. The same RFQ cannot be quoted twice.
- `RefreshReferenceMark` allows a feed reader to refresh that desk's simulated
  reference to the operator's fixed policy price. This is not a live or BitSafe
  governed market price. The original BitSafe LocalNet proof is separate.

The operator is the trusted demo issuer, standing dealer and reference oracle.
Publishing its contract disclosure grants no general operator read/act-as permission.
Private repo contracts and holding visibility keep their original stakeholders.

## Operator setup

1. Build the access DAR with `./scripts/build-public-desk.ps1`. Five local Daml
   scripts test grants, caller authorization, denominations/limits, repurchase and
   reference refresh. These are local checks, not a network deployment.
2. Upload `daml-public/.daml/dist/symbolon-public-0.1.0.dar` through the authorized
   NODERS Console and verify it is vetted. A normal account token may not have
   package-admin rights; the app's tested-package installer reports a rejection
   rather than bypassing that permission.
3. Configure the public package ID, reviewed participant and synchronizer with
   trading disabled. Sign in through `/app` and create the public desk from the
   operator setup disclosure. Use a dedicated operator party for the published desk.
4. Take the public deployment profile from the actual created contract: package,
   contract ID, created-event blob, operator, rate and reference policy. Never insert
   a guessed contract ID, signature or account token into runtime configuration.
5. Run an authenticated public-contract lifecycle and retain its receipts before
   publishing the enabled runtime profile. No MainNet promotion is implied.

## User flow

Open **Faucet** in the main navigation and connect your account. **Get DevNet
assets** issues 0.1 cBTC-demo and 5,000 USDCx-demo per claim through the existing
ledger contract. The balances shown are available holdings from the configured
issuer. These are test assets with no monetary value; LocalNet uses seeded
balances and MainNet has no public test-asset claim.

Transaction feedback appears at the bottom right. Confirmed notifications close
automatically, while **Account → Latest transaction** retains the correlated
receipt and download. Pending or uncertain commands remain visible with their
original-status check; dismissing a notification never releases a submission
guard. Opening a receipt or focusing the toast pauses its dismissal timer.

Connect the account, select an authorized borrower party distinct from the dealer,
claim DevNet assets, request a quote, review the fixed annualized rate and full
repurchase amount, settle, then repay. Peer dealers can use their actual issued
cash to quote requests addressed to them; the public standing dealer is a test
counterparty and does not represent external liquidity or market demand.

## Receipts and uncertain results

The v3.5 client uses `eventFormat` with an own-party filter and validates command ID,
update ID, offset, synchronizer and ledger timestamps before reporting a commit.
A timeout or uncertain wallet response retains the original command ID and blocks
another submission for that party. The status action queries the original command
completion and corresponding transaction; it does not automatically replay.

Production requires real token adapters, canonical valuation, complete closeout
accounting and operating controls. MainNet remains disabled for this release.
