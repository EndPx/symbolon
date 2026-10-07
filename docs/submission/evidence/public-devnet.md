# Public borrower frontend on shared DevNet

On 7 October 2026, Symbolon's browser frontend completed two internal repo lifecycles on the shared HackCanton DevNet participant. Actions were submitted through the app's NODERS authorization-code/PKCE account connection; no manual Ledger API calls were used to drive these trades.

The frontend was served locally during these initial browser checks. The ledger was the actual shared DevNet. These are hosted-account transactions, not Console Wallet signatures, MainNet settlement or external customer adoption. Assets and valuation marks are simulated.

## Deployment identity

- Participant: `hackcanton-devnet-3::12204a9d883d1158141d8f099d06dd2e42cb52615deb42da5a46f042c8d0e1dbdf0e`
- JSON API: `https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services`
- Synchronizer: `global-domain::1220be58c29e65de40bf273be1dc2b266d43a9a002ea5b18955aeef7aac881bb471a`
- Core package: `1d40e972b56e42c279140639d33dc362b432f2c0f608c77ec36410f0395f3e19`
- Public access package: `c2eeb6d65814e813ecc6dc2c3e583b31f20bf9b8781f956fd6250d8b720cd04b`
- Public DAR SHA-256: `b5d4cb164547d9796eadb15ce5badb17c24a3f32697d5a5bc662084a0b87687d`
- The Console confirmed `symbolon-public` v0.1.0 as uploaded and **Vetted** before either public-contract trade.

The final public desk uses a dedicated operator party (`229547bc-symbolon-proof-c685b6d1-dealer::12204a9d883d1158141d8f099d06dd2e42cb52615deb42da5a46f042c8d0e1dbdf0e`), allowing the account's ordinary primary party to borrow. Its actual contract disclosure is in the DevNet runtime profile. The operator is the trusted test issuer, standing dealer and simulated reference oracle.

## First UI lifecycle: margin handling

An authorized borrower party claimed 0.1 cBTC-demo and 5,000 USDCx-demo. The borrower requested and received a funded 5.2% annualized quote for 1,000 USDCx-demo, 0.025 cBTC-demo and a 30-day term. Review showed an ACT/360 repurchase amount of `1004.3333333333` before acceptance.

Settlement increased cash to 6,000 and reduced available collateral to 0.075. A simulated mark change from 60,000 to 36,000 reduced health factor from 1.43 to 0.86 and produced a 150 USDCx-demo collateral-value shortfall. The dealer issued a margin call. An insufficient 0.001 top-up was disabled in the UI; a 0.005 top-up committed and restored health factor to 1.03. The repurchase amount stayed unchanged.

Repurchase closed the position and returned all 0.030 pledged collateral, restoring available collateral to 0.1. Cash ended at `4995.6666666667` at ledger precision (the balance card displays 4,995.67). An unrelated authorized test party's selected ledger view showed no position or private quote from this trade.

## Second UI lifecycle: primary borrower and dedicated dealer

The account's primary party signed in as borrower, claimed assets from the dedicated operator, automatically selected that operator's matching issuer/oracle feed, requested a funded quote, reviewed the fixed terms, settled and repurchased. This confirmed that owning another oracle feed does not force the account into Oracle mode or hide its borrower workspace.

The same 1,000 / 0.025 / 30-day / 5.2% terms produced the same `1004.3333333333` repayment. All collateral returned. A receipt downloaded from the frontend contains the real `Repurchase` exercise, cash transfer, unlocked returned holding and `ClosedRepo: Repurchased` event.

## Captured final-operation receipts

These 11 receipts are final operations observed in the UI, not a count of every submission. RFQ creation and asset splitting/merging can add preparation transactions.

| UI operation | Ledger offset | Update ID |
| --- | ---: | --- |
| First borrower grant | 2323337 | `1220513664ee17ec0cebde4a8eb08879e39ef45ead302caa9c3f8c3f4f68041424d5` |
| First funded quote | 2323489 | `1220f0a6b175908377f277a92899dbaf97cf1e01d8cd3be03a14262cd1ad49e48d60` |
| First settlement | 2323577 | `122077de781c5b28e72134cc87ab66b2f56cf8c14501290320870e39cf18396d55b5` |
| Simulated mark drop | 2323856 | `1220208fe900bc48a9556c4b1d1ef6079864cc8707c75c073de13b40415cb4b9dfc4` |
| Margin call | 2323941 | `1220296bba4ea3bf766e934d3d4d0a5a622cc6ad801b426511fdae66d0748c83a927` |
| Margin top-up | 2324000 | `122056c3be4640d7a094e9ae2b5fb026c1791355e389dfb34f376dbe1818c6ae7bbe` |
| First repurchase | 2324053 | `1220f26526a4c1ce78af85c54b29dfc96e5ea16c58556c4ced8b1aedd9ca6b5afd95` |
| Primary borrower grant | 2324502 | `1220907d28d2052c86f9728d691420f3445138ae216d83cf3fbb665d320c3367d615` |
| Primary funded quote | 2324573 | `1220450206a6f0f4ef97834970343503277eac10e8ef62fb98027154e246fbda8c6d` |
| Primary settlement | 2324671 | `12209c67472a73114e4ee3e377b7347d0ad41be4db3643ce37d9ae2ec5dd72be7f43` |
| Primary repurchase | 2324835 | `1220b616db5e7faf6bb71b6dad93967c42d1f055a30cef4564d77d8a1c59356e2137` |

The redacted closing receipt is [public-devnet-repurchase.json](public-devnet-repurchase.json). Private contract disclosure blobs are omitted from this public sample; the public desk's intentionally published disclosure is separate.

## Scope and remaining checks

All roles in these runs are controlled by one internal account on one hosted participant. The price change was a single-operator simulated mark. The separate [BitSafe LocalNet record](bitsafe-localnet.json) demonstrates threshold-governed publication through three DecMan services; this browser run does not claim that topology on shared DevNet.

These runs establish the public-contract claim, funded quote, settlement, margin/top-up and repurchase paths through the frontend. Full UI coverage of substitutions, expiry, liquidation, maturity defaults, responsive states and wallet-signed transactions is tracked separately. Production cBTC/USDCx adapters, live valuation and MainNet operating controls remain future work.
