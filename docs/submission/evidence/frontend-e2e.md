# Frontend E2E coverage

Browser checks ran in Microsoft Edge against the actual Symbolon frontend on 7 October 2026 UTC, continuing into 8 October WIB. Financial workflows used real Canton ledger transactions with explicitly simulated assets. No MainNet or real-funds action was performed.

## Environments and method

- **Public URL / shared DevNet:** `https://symbolon.endpx.cloud/app`, NODERS account authorization-code/PKCE, actual scoped parties, vetted Symbolon packages and the disclosed public desk. The app performed RFQ, quote, settlement and repayment; [public receipts](public-devnet.md) identify the network, actors and updates.
- **Locally served frontend / shared DevNet:** the same app additionally exercised public asset issuance, a simulated mark drop, margin call, top-up, unrelated-party view and repurchase.
- **LocalNet:** a fresh wall-clock Canton sandbox on loopback JSON 6864 / gRPC 6865, SDK 3.5.2 and seeded test parties. The local role selector was used only on the development origin. Setup scripts provisioned parties/assets; the transaction flows below were driven through the browser UI.

## Executed UI checks

| Area | Result observed |
| --- | --- |
| Public account connection | Sign-in returned the primary party and real own-party ledger reads. The active DevNet deployment has no Read-only label or Connect CTA for that connected account. |
| Connection and permission states | Three earlier regression cases and two outage cases distinguish unconnected, connected/read-only, missing market, loading, failed first read and paused stale data. |
| Public onboarding | The caller exercised the disclosed `PublicDesk` with own-party authority, received 0.1 cBTC-demo and 5,000 USDCx-demo, and obtained a funded quote. |
| Counterparty roles | Primary account remained Borrower despite owning another oracle feed. Dealer/Oracle role switching worked; Request financing is absent outside Borrower mode. |
| Quote comparison | Borrower compared funded 5.2% / 5.8% offers from two local dealers, reviewed exact ACT/360 repayment and accepted dealer A. |
| Quote funding | Dealer A showed 249,000 available / 1,000 locked CUSD after quoting. Rejecting dealer B's unused offer restored its 250,000 available / 0 locked balance. |
| Party visibility | Losing dealer and unrelated parties had no winning position/private quote in their selected views. This demonstrates party-scoped access in controlled test environments, not independent hosting. |
| Collateral substitution | Proposal reserved 1,050 TBILL; withdrawal released it; dealer rejection released it; acceptance replaced 15 CETH with 1,050 TBILL. Rate, maturity and repayment remained unchanged. |
| Repurchase after substitution | Browser repaid 1,004.3333333333 CUSD and closed as Repurchased, returning the pledged TBILL. |
| Margin handling | Shared-DevNet mark 60,000 → 36,000 moved HF 1.43 → 0.86. Dealer called; insufficient 0.001 top-up was disabled; 0.005 committed and restored HF to 1.03. |
| Recovered margin | Local mark recovery restored coverage; borrower cleared the call through UI and repurchased the separate position. |
| Cure liquidation | Liquidation was disabled before cure, and still disabled without a post-cure mark. After the one-minute window and a fresh low mark, dealer review and liquidation completed with Liquidated at HF 0.86. |
| Maturity default | A dedicated historical fixture supplied an already-matured local position. Borrower repurchase/top-up were disabled. Dealer declared default through UI and received a Defaulted record. The fixture's opening is not claimed as a browser transaction. |
| RFQ cancellation | Borrower withdrew a pending RFQ; dealer passed another RFQ. Both committed through UI. |
| Quote expiry | A one-minute quote changed to Expired and could not be accepted. Dealer revoked it and released cash. |
| Invalid conditions | Stale CBTC mark, self-addressed request and insufficient collateral all disabled the request action. Healthy-position margin call was disabled. |
| Session lifecycle | Local disconnect/reconnect and public sign-out/sign-in restored the appropriate party view. |
| Read failure/recovery | Tab-specific network emulation blocked a ledger read; the app retained the session, paused actions and explained the error. Clearing the condition and refreshing recovered. An initial failed public ACS read showed Ledger view unavailable rather than an endless loading state. |
| Receipt export | Frontend downloaded a real committed receipt. Its six own-party ledger events contain Repurchase, exact dealer payment, unlocked collateral return and ClosedRepo. Public sample omits private contract blobs. |
| Responsive/navigation | Public app inspected at CSS widths 375, 768 and desktop viewport 1280 (content width reduced by scrollbar), without document horizontal overflow. Keyboard Tab advanced between navigation links. Wallet modal Cancel/Escape were exercised. Tablet anchor/header overlap was identified and corrected by putting wrapped headers in document flow. |
| Landing navigation | Public landing links to `/app` and published docs, with no `/demo` navigation link and no document overflow in the inspected desktop view. |

## Reproduce

For LocalNet setup, follow the existing [walkthrough](../../gitbook/guides/demo.md), using the current `.omc/demo/parties.json`. For the mature-position boundary only, run:

```powershell
./scripts/seed-frontend-fixtures.ps1 -LocalOnly
```

The helper builds `daml-ui-fixtures` in a space-free directory and hardcodes submission to the disposable loopback sandbox. It creates a historically matured, jointly authorized test position; it neither advances a production clock nor changes the repo model. Default closeout is then performed in the app.

Retained local observations/screenshots live in ignored `.omc/frontend-e2e-oct7/` on the team's workstation. Public final receipts and the closing ledger event are retained in the linked evidence files; these are narrower than the full internal observation log.

## Limits

Coverage establishes the implemented hosted-account and LocalNet product paths. It is not an exhaustive accessibility audit, a wallet-signing test, a MainNet deployment, a live oracle integration or customer validation. The uncertain-submission guard/reconciliation is covered by client tests; a deliberately lost submission response was not forced in the browser. Console Wallet still requires an allocated, approved wallet account and end-to-end signing verification. Loop's unsupported custom-template path remains disabled.

The BitSafe Contribution Pool evidence is the separate [three-participant DecMan LocalNet run](bitsafe-localnet.json). The public desk's standing reference oracle is simulated and singly operated, not a DevNet BitSafe decentralized party.
