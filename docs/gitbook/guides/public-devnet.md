# Getting Started

The public product entry is `/app`. HackCanton account sign-in uses authorization
code with PKCE against the existing NODERS identity provider. The participant
validates the user's token and existing party rights. Account access is a hosted
participant flow; it is not evidence of a browser wallet signature or MainNet
custody. Access and party allocation require a HackCanton/NODERS account.

The public access package is vetted and the enabled DevNet profile now references
an actual dedicated dealer contract. The primary account borrower flow was
verified through the frontend, including a trade from the public app URL. See
[public receipts](https://github.com/EndPx/symbolon/blob/codex/public-devnet-app/docs/submission/evidence/public-devnet.md) and
[executed UI coverage](https://github.com/EndPx/symbolon/blob/codex/public-devnet-app/docs/submission/evidence/frontend-e2e.md). The connected,
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

Borrow no longer requires a manual reference-refresh step. When the caller's
exact public DevNet reference has expired, **Review request** prepares a current
mark through the existing PublicDesk choice, reads its confirmed replacement,
and opens the review with actual collateral requirements. This click-triggered
preparation applies only to the simulated public reference. Private/committee
oracles and production prices retain their own freshness and authorization.

Before borrowing, a lender opens the exact market from its authorized party,
selects **Lend**, and uses **Register as lender**. It explicitly publishes its
name, party ID and market preference in the off-ledger directory. Registration
is verified against live HackCanton CanActAs rights and does not reserve cash.

The borrower uses **All registered lenders**, reviews the current recipient
list and approves sharing its funding request. Sending creates one private RFQ
per lender and waits. It does not request an automatic 5.20% standing offer.
Each lender enters its own APR and sends a funded offer from Lend; the borrower
then compares, accepts, settles and repays. In a same-account rehearsal, switch
the authorized signing party between borrower and lender. Selecting Borrow or
Lend changes the activity, not the signer.

The directory is persistent discovery metadata, not proof of available cash or
external market demand. Matching is scoped to network/deployment, both issuers
and the agreed oracle. An empty or unavailable directory blocks sending.
Deactivating a registration affects future requests, not existing ledger records.
The public standing dealer contract remains available for historical test
reproduction, but is no longer invoked automatically by the borrower form.

## Position health and expired marks

Borrower and lender positions use the same agreed oracle/issuer identity and
maximum mark age. When that exact feed expires, Positions retains the health
estimate from its last published price with neutral **Last mark / Price expired**
labels. It is not current collateral health. Future-dated, invalid and missing
prices produce no estimate. Price-sensitive actions remain blocked until a fresh
valid mark is available; refreshing a ledger read does not update the mark itself.

For the published public test market only, the party acting as its configured
oracle may use **Details → Refresh test timestamp**. This reuses the oracle's
existing `SetPrice` authority and preserves the exact current price; a price the
numeric builder cannot preserve is refused. The control does not publish in the
background and is unavailable to borrowers, other networks and committee oracles.
The lender's call, cure and fresh post-cure requirements remain in force.

## Receipts and uncertain results

The v3.5 client uses `eventFormat` with an own-party filter and validates command ID,
update ID, offset, synchronizer and ledger timestamps before reporting a commit.
A timeout or uncertain wallet response retains the original command ID and blocks
another submission for that party. The status action queries the original command
completion and corresponding transaction; it does not automatically replay.

Production requires real token adapters, canonical valuation, complete closeout
accounting and operating controls. MainNet remains disabled for this release.
