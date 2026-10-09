# Documentation illustrations

These editable Excalidraw scenes explain Symbolon's workflow. Their examples are illustrative; the images are not ledger receipts or evidence of a newly executed financing cycle.

| Illustration | Purpose |
| --- | --- |
| `product-overview` | User A publishes one request; B and C quote privately; A compares and repays the selected agreement. |
| `repo-journey` | A published OpenRequest leads directly to private funded quotes, settlement, collateral management and repayment. |
| `privacy-map` | Unauthenticated visitors get minimal metadata; authenticated connected parties read full consented request terms, while quotes/positions stay bilateral. |
| `component-map` | The Open RFQ API verifies request/quote/withdrawal receipts; its stored disclosures/private quote indexes have an operator trust boundary. |
| `fixed-rate-overview` | An explicitly hypothetical variable-rate path compared with an accepted fixed agreement. |

`symbolon-overview-illustration-v2.png` is the selected conceptual isometric borrower/lender artwork with the stage label **Discover and quote**. It is not a ledger screenshot or evidence of a newly executed cycle. The earlier V1 is not selected for publication.

Each Excalidraw illustration has an editable `.excalidraw` file, a text/vector `.svg` export and a `.png` used in GitBook. The current scene text is the source for the diagram labels. Typography uses Excalidraw's Virgil font; local vector rendering can regenerate a PNG without changing the editable geometry.

The guides use USDCx as a short display label for simulated cash. The on-ledger symbol remains `USDCx-demo`, and the current financing model uses simulated Holding contracts rather than native faucet/bridge token adapters.

Current source: [documentation assets](https://github.com/EndPx/symbolon/tree/main/docs/gitbook/assets), [Repo.daml](https://github.com/EndPx/symbolon/blob/main/daml/Symbolon/Repo.daml) and [DemoAsset.daml](https://github.com/EndPx/symbolon/blob/main/daml/Symbolon/DemoAsset.daml).
