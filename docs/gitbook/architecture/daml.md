# Contracts and Permissions

Daml defines which parties can perform a financing action and which conditions must hold. The app assembles commands; the ledger decides whether they are valid.

## Actions by party

| Action | Authorized actor | Main condition |
| --- | --- | --- |
| Create request | Borrower | Valid counterparties and financing terms. |
| Send funded offer | Addressed lender | Compatible, unlocked cash and valid rate/expiry. |
| Accept offer | Quote's borrower | Unexpired quote, valid collateral and a current agreed mark. |
| Repay | Position's borrower | Full agreed cash and an open repayment window. |
| Add collateral | Position's borrower | Valid additional collateral that restores the required margin. |
| Accept substitution | Position's lender | Compatible reserved replacement and valid coverage. |
| Issue margin call | Position's lender | Fresh agreed mark proving a shortfall. |
| Liquidate after cure | Position's lender | Expired call window and a fresh post-cure mark still below margin. |
| Declare maturity default | Position's lender | Missed repurchase at maturity. |
| Publish a price | Named oracle | Authority for that particular feed. |

## Example: knowing an ID does not grant control

Casey learns Blair's party ID from the public lender directory. That ID does not let Casey send a quote as Blair, accept Alex's offer, or move Blair's cash. Those commands still need the correct signing authority and contract conditions.

## Exact asset identities

An asset is identified by its issuer and instrument, not its ticker alone. Locked holdings cannot be treated as freely spendable cash or collateral.

**Example:** a 1,000 USDCx-demo holding from Issuer X cannot repay an agreement requiring USDCx-demo from Issuer Y, even though both labels contain the same symbol.

## Settlement and closeout

Acceptance commits cash transfer, collateral transfer and position creation together. Repayment returns pledged collateral when the full agreed cash is paid. The simulated liquidation/default model releases collateral to the lender; it does not implement a sale, auction or surplus/deficiency accounting.

The [contract source](https://github.com/EndPx/symbolon/tree/codex/public-devnet-app/daml/Symbolon) and tests provide the detailed choices. The current demo model is not an official production-token adapter.
