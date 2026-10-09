# Position health display and test-oracle recovery

Verified 9 October 2026 through the public app at https://symbolon.endpx.cloud/app.
This is an internal hosted-account DevNet check with simulated assets and marks.
It is not external adoption, wallet-signature evidence or a new financing cycle.

## Observed failure and correction

The lender's position used a 60,000 USDCx-demo mark published at 09:56 WIB with
a maximum age of one hour. After expiry, the old UI showed Health unavailable.
The new UI retains the last-mark estimate of 1.43 with neutral **Last mark /
Price expired** labels. The underlying fresh-price check still fails until a
current valid mark is published; margin-call and liquidation controls stayed
disabled in the expired state.

Missing, invalid and future-dated marks do not receive a historical estimate.
Borrower and lender views use the exact agreed oracle and asset issuer identities.

## Executed recovery

Acting as the existing public test oracle, the tester clicked **Refresh test
timestamp** in position Details. The downloaded receipt contains one `SetPrice`
exercise and its replacement `PriceFeed` creation:

| Receipt field | Recorded value |
| --- | --- |
| Update ID | `12200b17a3884a2692015b84351ab5b5e956374a5bd5ff6a1a9ddb6123728d45c6be` |
| Command ID | `symbolon-public-812e6cd2-e745-4ac2-bac5-9373cae18a05` |
| Ledger offset | `2699534` |
| Recorded time | `2026-10-09T06:52:34.111935Z` |
| New price argument and created price | `60000.0000000000` |
| New timestamp argument and created mark timestamp | `2026-10-09T06:52:30.887Z` |

The matching receipt was downloaded and checked locally; private disclosure
blobs are not reproduced here. Both borrower and lender subsequently showed
health factor 1.43 with **Margin covered**. Principal 1,000, collateral 0.0250,
fixed annualized rate 5.20%, repayment 1,004.3333333333 and maturity remained the
existing agreement. No new quote, settlement, top-up, liquidation or repayment
was submitted during this check.

## Scope and guards

Timestamp recovery is available only to the bound public DevNet test oracle,
for an expired exact-identity feed readable by the position's borrower. It uses
existing oracle authority and refuses future prices, foreign issuers, committee
oracles, other networks and prices the existing numeric builder cannot preserve.
It does not publish on connection, navigation or a background timer.

All 111 frontend tests and the production build passed. The retained shared
DevNet and exported repurchase receipt consistency checks passed with unchanged
frozen financial/ledger sources. General structural/performance warnings remain
in React Doctor; no comprehensive accessibility or Lighthouse score is claimed.

Current-health table readability was also checked in the public app at 375,
768 and 1280 CSS-pixel widths; the temporary viewport override was reset. The
expired last-mark state and recovery control were visually checked at the
normal desktop viewport before publication of the refreshed mark.
