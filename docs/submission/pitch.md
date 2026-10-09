# Symbolon: 60-second pitch

Today's floating borrowing rate does not tell a treasury team how much interest it will pay by the time it repays.

Symbolon is a private, bilateral fixed-rate financing desk on Canton. A borrower asks selected dealers for quotes, agrees a rate and term, and knows the exact contractual principal-plus-interest repurchase amount before settlement. The rate remains fixed for that agreement; collateral risk and network costs remain.

We are building for treasury managers at digital-asset funds holding tokenized assets on Canton, and the dealers who finance those holdings. This customer profile still needs validation.

Our Canton prototype reserves dealer cash before acceptance, locks pledged collateral and enforces the repo lifecycle in Daml. The governed mark, margin call, top-up and repayment have executed on shared HackCanton DevNet with simulated assets. A separate official LocalNet run uses three participants and DecMan services for the 2-of-3 oracle action.

The demo shows two private quotes, acceptance at 5.2%, a price drop and margin call, a top-up, and a closing Repurchased record with a committed ledger receipt. The fixed repayment amount does not change when the collateral price falls.

Our next step is an operator pilot and official cBTC/USDCx asset adapters. We want feedback from treasury and collateral operators before promoting a reviewed release to MainNet.

## Presenter boundaries

The asset and price examples are simulations. Do not imply they settle real cBTC or USDCx. The [shared DevNet flow](evidence/shared-devnet.md) uses ordinary hosted parties and Ledger API submission, without wallet signing or a DevNet decentralized party. The three-participant DecMan evidence remains LocalNet. The recorded browser quote comparison is local. One informal borrower discussion and follow-up have started [human discovery](borrower-discovery.md); institutional ICP fit, willingness to switch/pay, external app use and pilot participation remain unvalidated.
