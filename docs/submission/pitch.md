# Symbolon: 60-second pitch

Treasury teams can know the rate on a financing deal and still lose track of its collateral obligations across separate tools.

Symbolon is a private, bilateral fixed-rate repo desk on Canton. A borrower asks selected dealers for quotes, compares the annualized rate and full repurchase amount, and settles cash against collateral in one workflow.

We are building for treasury managers at digital-asset funds holding tokenized assets on Canton, and the dealers who finance those holdings. This customer profile still needs validation.

Our Canton prototype reserves dealer cash before acceptance, locks pledged collateral and enforces the repo lifecycle in Daml. The governed mark, margin call, top-up and repayment have executed on shared HackCanton DevNet with simulated assets. A separate official LocalNet run uses three participants and DecMan services for the 2-of-3 oracle action.

The demo shows two private quotes, acceptance at 5.2%, a price drop and margin call, a top-up, and a closing Repurchased record with a committed ledger receipt. The fixed repayment amount does not change when the collateral price falls.

Our next step is an operator pilot and official cBTC/USDCx asset adapters. We want feedback from treasury and collateral operators before promoting a reviewed release to MainNet.

## Presenter boundaries

The asset and price examples are simulations. Do not imply they settle real cBTC or USDCx. The [shared DevNet flow](evidence/shared-devnet.md) uses ordinary hosted parties and Ledger API submission, without wallet signing or a DevNet decentralized party. The three-participant DecMan evidence remains LocalNet. The recorded browser quote comparison is local. No discovery interviews or usage metrics have been completed.
