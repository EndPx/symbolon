# Public Faucet and notification verification — 8 October 2026

The public `/app` exposes Faucet beside Markets and Portfolio. The selected
view survives the hosted-account OAuth redirect through a validated,
non-sensitive session preference; no balances, receipt data or credentials
are stored by this preference.

An Edge browser signed in from Faucet and submitted one **Get DevNet assets**
action through the application. Available cBTC-demo increased from 0.1 to 0.2;
available USDCx-demo increased by 5,000 (displayed as 4,995.36 → 9,995.36).
The account's retained receipt confirmed the original command:

| Field | Value |
| --- | --- |
| Update ID | `12201eb6d0d9a3fc629234ffac3ac9994b8c3f9c465cdd34862fdab9dd8e5694bb04` |
| Command ID | `symbolon-public-eaabffdd-c633-400e-a2bc-2a09c7406ed0` |
| Ledger offset | `2376934` |
| Recorded UTC | `2026-10-08T01:32:55.663200Z` |
| Synchronizer | `global-domain::1220be58c29e65de40bf273be1dc2b266d43a9a002ea5b18955aeef7aac881bb471a` |

The pending notice appeared at the bottom right, and both claim/mark controls
were disabled during submission. Faucet's top stayed at CSS84px before and
during the operation, demonstrating that the notice does not move the page.
The confirmed toast closed automatically; Account → Latest transaction still
exposed the confirmed update, offset, timestamp and receipt download.

The **View receipt** action in a later confirmed reference-mark toast opened
the native receipt dialog with a real correlated update at offset 2377540.
The successful toast stayed present while that receipt dialog was open.

Assets and prices are simulated. The grant uses the existing vetted PublicDesk
contract on shared DevNet, through the hosted account; it does not establish
wallet signing, real-token issuance, MainNet execution or external adoption.
LocalNet uses seeded balances and exposes no public claim action.

Supporting checks: 51 frontend tests and production builds pass. Tests cover
read-only/unconnected/unavailable-ledger/busy Faucet states and non-dismissible
pending/uncertain notices. Independent source/visual review found no material
transaction-state or network-boundary regression. The ledger/action builders,
Daml and deployment identities were unchanged by this UI revision.

## Request preparation follow-up

Borrow has no manual reference-refresh banner, and Account omits the normal
Trading enabled row. In a later public browser run, the selected reference
was actually Stale. With a one-minute age requirement, one Review request click
prepared the exact simulated reference on the ledger, changed the displayed
mark to Current, and opened the review with Send private request enabled.
The reviewed 100 USDCx-demo request required 0.0025000000 cBTC-demo. No RFQ or
repo was submitted during this preparation-only check.

Preparation receipt: update
`12204155d11df8066ba5733b256e2f18e1daafe28e377a1ebd647bc1189537a7f074`,
command `symbolon-public-3851b4f9-751d-41f4-bcb4-0c55920ffe61`, offset
`2396908`, recorded `2026-10-08T05:31:43.463984Z` on the same shared DevNet.

53 frontend tests and the build pass for this follow-up. Automatic preparation
is restricted to the caller-readable exact public DevNet demo identity.
Private/committee, LocalNet, MainNet and future/invalid marks retain their
guards. Independent source review also checked the changed-price collateral
case: expired 36,000 versus fixed reference 60,000 uses a clearly labelled
estimate before preparation and actual fresh pricing at final review.
