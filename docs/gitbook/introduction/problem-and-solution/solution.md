# Solution

Symbolon combines private bilateral quotes, a fixed repurchase amount, and collateral management on Canton. The borrower compares offers addressed to them; each dealer manages its own request, quote, and position.

## Agree the economics before moving assets

An RFQ specifies cash, collateral, maturity, and proposed risk terms. A dealer responds with a fixed annualized simple rate and an expiry. The desk calculates the ACT/360 repurchase amount before acceptance.

The quote reserves dealer cash on the ledger. Acceptance exchanges that cash against the borrower's exact collateral input atomically and creates the repo position. A failed acceptance does not leave one settlement leg committed by itself.

## Manage the position through closure

The position preserves the rate, maturity, oracle, and coverage requirement. A dealer can raise a margin call when a valid mark proves a shortfall. The borrower can restore coverage, propose collateral substitution, or pay the full repurchase amount to recover collateral.

After an uncured call, dealer-led liquidation requires the elapsed cure window and a fresh matching mark that still proves a shortfall. A separate maturity-default choice handles the repayment deadline. The prototype records closure and releases collateral; it does not sell collateral or calculate realized recovery.

## Limit unilateral oracle administration

The BitSafe integration places simulated price-mark publication under 2-of-3 governance. A single confirmation cannot execute the proposal; two confirmations can publish the mark. The accepted mark affects repo health factor and margin behavior.

This addresses unilateral control over a sensitive input. It does not establish a correct market price or independent operators. The [integration guide](../../guides/bitsafe-localnet.md) provides the working LocalNet setup and evidence.
