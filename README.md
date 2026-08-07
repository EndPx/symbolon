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

Pre-hackathon scaffold for HackCanton Season 3. Nothing to run yet.
