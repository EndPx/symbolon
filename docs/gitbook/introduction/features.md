# Features and boundaries

The following capabilities describe the prototype source. They should be tested against the revision and network used for a demonstration.

| Capability | Intended behavior | Boundary |
| --- | --- | --- |
| Private RFQ | One request per borrower/dealer pair | No public order book or competitive auction engine |
| Dealer quotes | Agreed rate, validity period and funding reference | Demo holdings; no external credit commitment |
| Atomic acceptance | Cash and collateral move together, position is created | Requires all inputs and authorizations to remain valid |
| Fixed term | Repurchase amount set at acceptance | Full amount remains due on early repurchase |
| Margin call | Dealer acts on an agreed valid mark and an actual shortfall | The oracle value can still be economically wrong |
| Health factor | Collateral value divided by agreed required margin; `1.00` is the coverage boundary | Preview in the browser; Daml choices enforce the boundary |
| Top-up | Additional collateral must restore coverage | No partial repayment or automatic cash sweep |
| Substitution | Borrower proposes, dealer accepts replacement collateral | New collateral must meet contract checks; no issuer marketplace |
| Liquidation | After an uncured call, dealer uses a post-cure mark with health factor below `1.00` to take pledged collateral | No legal enforcement engine, auction, realized proceeds or surplus accounting |
| Maturity default | Dealer closes a repo whose maturity has passed | Separate from health-factor liquidation |
| Receipts | Both counterparties retain the recorded closing outcome | No enterprise accounting export yet |
| Browser desk | Reads visible contracts and builds ledger commands | Wallet/network interoperability requires explicit validation |

## Deliberate scope

Symbolon focuses on a bilateral fixed-term trade and its subsequent collateral actions. The prototype does not include pooling, transferable lender tokens, secondary-market exit, cross-chain bridging, currency conversion, rehypothecation, or automatic renewal. A change in scope requires a corresponding contract, authority and risk design.

The demo instruments CUSD, CETH, CBTC and TBILL are labels on `DemoAsset.Holding` contracts. They do not claim to be issued cryptocurrencies, stablecoins, Treasury securities or deposits redeemable outside the demo.

## What “implemented” means

A feature has several separate levels of evidence: source exists, it builds, assertions pass, it executes on a wall-clock sandbox, it works through the browser, and it works through a specific wallet on a specific network. These are not interchangeable. Read [status](../reference/status.md) and [submission evidence](../mission/submission.md) for how to record the level actually demonstrated.
