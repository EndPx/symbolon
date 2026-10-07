# Solution

Symbolon makes the contractual principal-plus-interest amount known before financing is accepted. A dealer offers a fixed annualized rate for the requested term; the borrower compares private quotes and accepts an exact repurchase amount. Collateral management and controlled visibility support that agreement on Canton. Each dealer manages its own request, quote and position.

## Agree the economics before moving assets

An RFQ specifies cash, collateral, maturity, and proposed risk terms. A dealer responds with a fixed annualized simple rate and an expiry. The desk calculates the ACT/360 repurchase amount before acceptance.

The quote reserves dealer cash on the ledger. Acceptance exchanges that cash against the borrower's exact collateral input atomically and creates the repo position. A failed acceptance does not leave one settlement leg committed by itself.

## Manage the position through closure

The position preserves the rate, maturity, oracle, and coverage requirement. A dealer can raise a margin call when a valid mark proves a shortfall. The borrower can restore coverage, propose collateral substitution, or pay the full repurchase amount to recover collateral.

After an uncured call, dealer-led liquidation requires the elapsed cure window and a fresh matching mark that still proves a shortfall. A separate maturity-default choice handles the repayment deadline. The prototype records closure and releases collateral; it does not sell collateral or calculate realized recovery.

## Limit unilateral oracle administration

The BitSafe integration places simulated price-mark publication under 2-of-3 governance. A single confirmation cannot execute the proposal; two confirmations can publish the mark. The accepted mark affects repo health factor and margin behavior.

This demonstrates authorization on the governed action path. It does not establish a correct market price, independent operators or an operator-resistant oracle. An account with native authority to act as the ordinary oracle party can invoke its oracle choices directly in the shared-node prototype. Production needs appropriate authority/hosting policy and verified price provenance. The [integration guide](../../guides/bitsafe-localnet.md) provides the working LocalNet setup and evidence.
