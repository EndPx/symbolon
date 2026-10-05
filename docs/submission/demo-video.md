# Three-minute demo storyboard

The [recorded local UI demo](symbolon-local-demo.mp4) is an edited, silent browser screencast with captions, about 2 min 26 sec. It shows two quotes, acceptance, a simulated price drop, margin call, top-up and repurchase through `/app`, ending with a committed update receipt. [Browser evidence](evidence/browser-repurchase.json) records the exact amounts and closing ID. Its assets are simulated CETH/CUSD on a native local Canton sandbox; the BitSafe three-participant proof is a separate CI artifact.

The storyboard below is suitable for a later narrated recording. Keep the environment disclosure visible. `/demo` helps explain the product but cannot replace committed ledger proof. Do not show credentials, participant administration tokens or unrelated accounts.

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
