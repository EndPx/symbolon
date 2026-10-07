# Market terminal verification — 8 October 2026 WIB

The `/app` interface uses one selected-market workspace with a Borrow/Lend action
panel and actual Overview, Offers, Positions and Activity tabs. Markets and
Portfolio are separate views. Full identities, authorized party switching and
oracle administration are explicit Account controls. Changing financing side
does not switch the connected signing party.

## Browser execution

### Installed BitSafe LocalNet

An Edge browser completed the following flow at `127.0.0.1:15173/app` through
the server-only proxy to the installed private VPS LocalNet:

1. Borrower requested 1,000 USDCx-demo against 0.025 cBTC-demo for 30 days.
2. The seeded lender reserved cash and offered a 5.2% annualized ACT/360 rate.
3. The borrower reviewed `1004.3333333333` and accepted atomic settlement.
4. The DecMan helper published a 36,000 simulated mark through the actual
   two-confirmation governance workflow; one-confirmation execution failed.
5. Health factor fell from 1.43 to 0.86; the lender issued a margin call.
6. A borrower top-up of 0.005 cBTC-demo restored health factor to 1.03.
7. Repurchase paid the unchanged `1004.3333333333`, returned 0.03 cBTC-demo,
   and produced `Repurchased`. Available collateral returned to 0.1 cBTC-demo.

Closing update:
`122040bee17d10f320e59bc2c75c203a8f3aca58ad0b0cc57f59b7d020a3d866093e`.

The price publications were performed by the DecMan governance helper; all
borrower/lender financing actions above were performed through the revised UI.
All participants, managers and synthetic roles remain under one operator.

### Public shared DevNet

At `https://symbolon.endpx.cloud/app`, the hosted HackCanton account signed in,
refreshed its exact simulated reference mark from the compact setup prompt,
requested 100 USDCx-demo for seven days, accepted the funded 5.2% offer, and
repurchased at the reviewed `100.1011111111`.

The maintenance threshold was set to **105.25%**. Native initial-cover input
validation reported no step mismatch, and the final settlement review retained
105.25% and ten-decimal collateral. Successful settlement opened Positions;
successful repurchase opened Activity without a manual tab change. Portfolio
Holdings showed 0.1 cBTC-demo available and zero locked collateral afterward.

| Closing receipt field | Value |
| --- | --- |
| Update ID | `12203b4d058c13e3b0e293fda6f3747fb52ed69492a81f13d9b4ca35f8f5b7a60d3a` |
| Command ID | `symbolon-public-af3a04dc-072a-412e-8189-274d850b0e81` |
| Ledger offset | `2371519` |
| Recorded UTC | `2026-10-07T23:40:46.550123Z` |
| Synchronizer | `global-domain::1220be58c29e65de40bf273be1dc2b266d43a9a002ea5b18955aeef7aac881bb471a` |

These are simulated assets and hosted-account submissions. This run does not
establish wallet signing, real-token settlement, customer adoption or a DevNet
decentralized oracle party. The public reference oracle and BitSafe LocalNet
committee are separate environments.

## Interface checks

- Browser ArrowLeft wrapping and Home navigation selected the expected active
  content panels. Borrow inputs survived content-tab and Borrow/Lend changes.
- Current party remained unchanged across Borrow/Lend.
- CSS widths 375, 767 and 1280 had no document horizontal overflow. Narrow
  layouts put the action panel before secondary market information.
- Connected read-only, empty-market and ledger-error states remain covered;
  they do not falsely ask an authenticated account to connect again.
- 49 frontend tests pass, including exact market identity isolation, accessible
  tab/panel relationships and public onboarding for absent, foreign or stale
  assets/feeds. Production builds pass. The existing landing-page model-viewer
  chunk-size warning remains.
- Independent screenshot/source review passed after repairs to fractional
  cover input, disappeared-feed isolation and exact contract review precision.

Lighthouse scores and a comprehensive screen-reader audit were not measured.
Development screenshots and DOM snapshots are retained locally under
`.omc/ux-oct8/`; they are not required to reproduce the application.
