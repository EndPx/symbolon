# Contribution to the Canton Ecosystem

Symbolon demonstrates a financing workflow for assets and counterparties on Canton: discover lenders, negotiate bilateral offers, settle cash against collateral, and manage the agreement through repayment or permitted closeout.

## A practical privacy use case

The borrower approves the funding request's audience, while lender quotes and the resulting position retain their separate counterparties. The ledger applies visibility and signing authority alongside financial checks.

**Example:** Blair and Casey both price Alex's request. Alex compares 7% and 7.5%, then chooses Blair. Casey does not automatically receive the accepted Alex/Blair position.

## A reusable integration boundary

The offchain directory stores public discovery metadata, while Daml controls the financing records and asset movements. This keeps registration separate from the authority to quote or settle.

**Example:** changing Blair's directory name cannot change a 7% quote, unlock reserved cash or repay Alex's position. Those are ledger actions with their own controllers.

## Governed price-publication demonstration

The separate BitSafe LocalNet integration demonstrates a 2-of-3 governed price change affecting a real simulated repo workflow. A lower mark enabled a margin call, the borrower topped up, and the original repayment remained unchanged.

The evidence is a reproducible technical demonstration, not proof of independent institutions, production token adapters or customer demand. Current discovery and the proposed external rehearsal are described in the Roadmap.
