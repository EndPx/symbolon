# Symbolon: 60-second pitch

Treasury teams can know the rate on a financing deal and still lose track of its collateral obligations across separate tools.

Symbolon is a private, bilateral fixed-rate repo desk on Canton. A borrower asks selected dealers for quotes, compares the annualized rate and full repurchase amount, and settles cash against collateral in one workflow.

We are building for treasury managers at digital-asset funds holding tokenized assets on Canton, and the dealers who finance those holdings. This customer profile still needs validation.

Our local Canton prototype reserves dealer cash before acceptance, locks pledged collateral and enforces the repo lifecycle in Daml. It handles margin calls, top-ups, collateral substitution and repayment. Local tests also exercise a BitSafe 2-of-3 governance action that changes a simulated oracle mark and affects the repo's health factor.

The demo shows two private quotes, acceptance at 5.2%, a price drop and margin call, a top-up, and a closing Repurchased record with a committed ledger receipt. The fixed repayment amount does not change when the collateral price falls.

Our next step is a reproducible BitSafe LocalNet contribution and a verified DevNet pilot. We want feedback from treasury and collateral operators before promoting a reviewed cBTC/USDCx release to MainNet.

## Presenter boundaries

The asset and price examples are simulations. Do not imply that local transactions settle real cBTC or USDCx. Package vetting on the shared DevNet is older installation evidence, not the complete product flow. Add a successful three-node run to the proof line only after its all-participant audit has been checked. No discovery interviews or usage metrics have been completed.
