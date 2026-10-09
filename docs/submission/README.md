# Demonstrations and execution evidence

Symbolon implements fixed-rate collateralized financing on Canton. Borrowers publish open requests, lenders fund private bilateral quotes, and borrowers review the contractual repayment before atomic settlement. The current public application uses simulated assets on shared HackCanton DevNet.

## Start here

| Resource | Scope |
| --- | --- |
| [Live application](https://symbolon.endpx.cloud/app) | Shared DevNet demo with authorized account parties. |
| [Application video](https://symbolon.endpx.cloud/demo/symbolon-app-demo-devnet.mp4) | 2:20 direct quote-to-repurchase screencast with Albary voice and captions. |
| [Final pitch PDF](symbolon-pitch-final-v6.pdf) | 12 slides covering the product, evidence, fee proposal and roadmap. |
| [Editable pitch deck](symbolon-pitch-final-v6.pptx) | Native editable slides, speaker notes, sources and three closing QR links. |
| [Hosted DevNet runbook](hosted-devnet-demo.md) | Account requirements, exact example arithmetic and reproducible click sequence. |
| [Published documentation](https://symbolon.gitbook.io/symbolon-docs/) | Product guides, contract visibility and deployment scope. |

## Inspect the execution

| Evidence | What it establishes |
| --- | --- |
| [Direct Open RFQ](evidence/open-rfq-devnet.md) | Borrower publication, private funded 7% quote, settlement/request withdrawal and repurchase using synthetic test roles. |
| [Recorded app-cycle manifest](evidence/app-demo-devnet.json) | The separate recorded cycle, confirmed closing update, media properties and narration timing. |
| [Shared DevNet reference](evidence/shared-devnet.md) | 20 retained committed receipts, governed marks, margin handling, top-up and Repurchased closure. |
| [Public frontend execution](evidence/public-devnet.md) | Browser-operated simulated financing with matching participant receipts. |
| [BitSafe Contribution Pool integration](bitsafe-contribution.md) | Pinned three-participant LocalNet reproduction and evidence map. |
| [Installed three-participant proof](evidence/bitsafe-vps-localnet.md) | Matching participant audits and the application effect of 2-of-3 governed price publication on one operator host. |
| [Shared DevNet runner](shared-devnet-proof.md) | Provisioning, execution and retained-evidence verification instructions. |

The [earlier LocalNet recording](symbolon-local-demo.mp4) uses simulated CETH/CUSD and demonstrates core margin handling. It remains a separate historical reference from the current cBTC-demo/USDCx-demo application video.

These records demonstrate engineering behavior at their stated scope. They do not establish external customer adoption, independent operators, native wallet signatures, production-token settlement or a security audit. BitSafe's selected entry is Contribution Pool; no Gold deployment claim is made.

Narration scripts, interview notes, mentor journals, form drafts and production working files are retained locally. Public source includes the product, technical documentation, final presentation and reproducible evidence.
