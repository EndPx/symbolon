# Symbolon

**A confidential bilateral repo desk on Canton Network.**

In ancient Greece, two parties sealing an agreement would break a token — a
*symbolon* (σύμβολον) — in half. Each side kept one piece. Only those two halves
fit together; to anyone else, a single half revealed nothing.

That is exactly how a repo trade should work: two counterparties, one agreement,
and no one else able to read it.

## What this will be

- **Repo, properly**: sell an asset today, commit to repurchase it at a fixed
  price on a fixed date. The rate is locked the moment the deal is struck.
- **Quote-driven, not order-driven**: no public order book. Borrowers request
  quotes; dealers price each counterparty privately (RFQ).
- **Private by construction**: on Canton, a losing dealer never learns the
  winning rate — or that a trade happened at all. Sub-transaction privacy means
  the data is never sent to their node, not merely encrypted.
- **The full post-trade lifecycle**: margin call, collateral substitution,
  default — the part of the trade that actually needs infrastructure.

## Status

Pre-hackathon scaffold for HackCanton Season 3. The contract layer is
written and proven end to end.

## Run the proof

```bash
cd daml && dpm build
cd ../daml-test && dpm test
```

Two scripts, each a complete run on a fresh ledger (Daml SDK 3.5.2):

- **`repoLifecycle`** — 29 transactions: RFQ to two dealers → privacy
  assertions (the losing dealer sees no position, no rate, no trade) →
  atomic quote-acceptance settlement → margin call against the agreed
  oracle feed → cure by top-up → collateral substitution mid-term →
  second breach → default, with nothing to liquidate.
- **`repoHappyPath`** — 9 transactions: strike → settle → early
  repurchase; every balance checked against the fixed repurchase price.

Adversarial paths are asserted throughout: expired quotes can't be
accepted, healthy positions reject margin calls, defaults can't be
declared while the cure window is open, and outsiders see nothing at
all.

Note: paths with spaces break `damlc` data-dependency resolution — if
the checkout lives in one, build from a space-free copy or symlink.
