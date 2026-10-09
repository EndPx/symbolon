# Three-minute demo storyboard

## Final application video

Watch the latest [shared-DevNet app demo](https://symbolon.endpx.cloud/demo/symbolon-app-demo-devnet.mp4), **2 minutes 20 seconds**, with Albary narration generated through ElevenLabs and burned-in English subtitles. [SRT subtitles](symbolon-app-demo-devnet.srt) and [timed narration](symbolon-app-demo-devnet-narration.md) are supplied separately. There is no pitch-deck video.

The genuine browser screencast shows the Symbolon demo faucet, borrower publication with sharing consent, direct lender quotation at 7% APR, private offer review, cash/collateral settlement, position health, full repayment and the confirmed Repurchased receipt at offset **2791970**. It uses cBTC-demo / USDCx-demo, a simulated mark and two founder-operated synthetic parties authorized under one account. Waiting time is condensed; static views are held for reading. It does not demonstrate external customer use, native tokens or independent operators.

The edit uses **17 separate voice clips**, each **3.08–4.41 seconds**, with at least **2.25 seconds of silence** between clips. The [recording evidence](evidence/app-demo-devnet.json) identifies the actual cycle and media checks. Raw screen frames, timing manifest, original voice assets and unedited screen capture are retained locally under `.omc/app-demo-oct10/`.

## Retained LocalNet recording

The [recorded local UI demo](symbolon-local-demo.mp4) is an edited, silent browser screencast with captions, about 2 min 26 sec. It shows two quotes, acceptance, a simulated price drop, margin call, top-up and repurchase through `/app`, ending with a committed update receipt. [Browser evidence](evidence/browser-repurchase.json) records the exact amounts and closing ID. Its assets are simulated CETH/CUSD on a native local Canton sandbox; the BitSafe three-participant proof is a separate CI artifact.

The storyboard below is suitable for a later narrated recording of the application and its committed ledger actions. Keep the environment disclosure visible. Do not show credentials, participant administration tokens or unrelated accounts.

| Time | Screen/action | Narration |
| --- | --- | --- |
| 0:00–0:15 | Product overview, local environment | “Symbolon is a private fixed-rate repo desk. This demo uses simulated assets on local Canton.” |
| 0:15–0:40 | Borrower RFQ to two dealers | “The borrower requests financing terms from selected counterparties. Each request is bilateral.” |
| 0:40–1:00 | Dealer A 5.2%, Dealer B 5.8%; borrower compares | “Dealer cash is reserved when a funded quote is made. The borrower sees both offers and the full ACT/360 repurchase price.” |
| 1:00–1:20 | Review/accept A; open position and committed receipt | “Accepting exchanges cash against collateral atomically. The repo fixes repayment at 1,004.3333333333 for 1,000 principal over 30 days.” |
| 1:20–1:35 | Losing dealer's party view | “This dealer sees its own quote. It cannot query the winning private repo through its party view.” |
| 1:35–2:10 | Simulated mark drops, HF < 1, dealer call, borrower top-up | “Fixed rate stays unchanged. Collateral risk remains. The borrower restores the agreed margin before the cure deadline.” |
| 2:10–2:30 | Repay; closing Repurchased record; returned collateral | “Repayment and collateral return occur together. The ledger receipt confirms the close.” |
| 2:30–2:50 | BitSafe audit and mark effect, if verified | “A threshold-governed oracle action needs two members. Show the failed one-confirmation attempt and the committed execution visible on all three participants.” |
| 2:50–3:00 | Disclosure and next step | “DevNet comes before MainNet. Real cBTC/USDCx adapters, oracle policy and production closeout accounting remain release requirements.” |

If the three-node run is unavailable, replace its segment with the narrower local threshold test and say “single participant local test.” Never present it as completed DecMan deployment. A separate liquidation clip can show an expired call, a new post-cure price, and dealer-led closeout; explain that this prototype unlocks collateral without modeling a sale or surplus accounting.

Use readable zoom, preserve the environment label and allow the judge to see the closing outcome and update ID. Keep a raw recording and source revision beside the published edit. A narrated screenshot montage must be labeled as such.
