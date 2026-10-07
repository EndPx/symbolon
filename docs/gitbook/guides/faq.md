# Frequently Asked Questions

## What does fixed-rate mean here?

The accepted annualized simple rate, principal, and term determine a fixed repurchase amount. A collateral mark changing later does not change that amount. It can change coverage and the actions required to keep the position active.

## Does maturity have to be short-term?

Maturity is an agreed parameter. The current prototype supports 1–365 whole days. Symbolon's focus is predictable financing terms and private collateral workflows.

## Can I repay early?

The borrower can repurchase before maturity by paying the full stored repurchase amount. The prototype does not rebate interest for early repurchase. Review that amount before acceptance.

## What does health factor measure?

It compares pledged collateral value with the agreed required collateral value. Below 1 means the position is below margin. The dealer must submit a valid margin-call choice; a displayed number alone does not change ledger state.

## What happens after a margin call?

The borrower has the agreed cure window to restore coverage or repurchase. Liquidation requires the expired window and a fresh matching post-cure mark that still proves health factor below 1. The prototype releases pledged collateral to the dealer; it does not auction it or calculate sale proceeds.

## Can other dealers see competing quotes?

Requests and quotes are bilateral. A borrower compares offers addressed to them, while a dealer reads its own offers. This does not hide all information from issuers or hosting operators; the [trust model](../architecture/privacy-and-trust.md) explains the boundaries.

## Are cBTC and USDCx integrated?

They are the intended production pair. Verified workflows use simulated holdings. Matching symbols do not establish official instrument identity, compatible adapters, or real-token settlement.

## Is MainNet trading available?

No. The repo and governed mark have executed on LocalNet and shared DevNet with simulated assets. Real assets, oracle lineage, closeout accounting, wallet execution, and operational review remain MainNet gates.

## What does BitSafe add?

Two of three governance members must approve simulated oracle marks affecting repo coverage. One confirmation fails to execute; two can publish the mark. The official LocalNet run links it to margin handling and repurchase. Threshold approval does not guarantee a correct price.
