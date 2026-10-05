# System architecture

Symbolon has two principal implementation layers: Daml contracts that enforce the transaction and a React browser application that presents and submits it. The current application has no Symbolon-operated database, order matcher or business-logic API. Canton participants and wallets remain essential infrastructure; the absence of a custom application backend does not remove infrastructure trust.

```mermaid
flowchart TB
    subgraph Browser[User browser]
        UI[React desk and landing]
        Actions[Action builders]
        Session[Session boundary]
        UI --> Actions --> Session
    end
    Session -->|Development only| Proxy[Vite ledger proxy]
    Session -->|Compatible wallet mode| Wallet[PartyLayer and Canton wallet]
    Session -->|Grofty MainNet| Grofty[Grofty SDK: own-party reads and prepared commands]
    Proxy --> JSON[Canton JSON Ledger API]
    Wallet --> JSON
    Grofty --> Participant
    JSON --> Participant[Participant: authorization, execution and contract store]
    Participant --> Repo[Symbolon.Repo Daml]
    Repo --> Assets[DemoAsset holdings]
    Repo --> Marks[Agreed PriceFeed]
    Participant --> Sync[Canton synchronizer infrastructure]
```

## Component ownership

| Component | Responsibility | Source location |
| --- | --- | --- |
| Repo model | Quote, settlement, position and closing transitions | `daml/Symbolon/Repo.daml` |
| Demo assets | Transferable test holdings and restrictions | `daml/Symbolon/DemoAsset.daml` |
| Script tests | Deterministic and adversarial assertions | `daml-test/Symbolon/Test/EndToEnd.daml` |
| Live setup/scripts | Seed and exercise a wall-clock sandbox | `daml-live/Symbolon/` |
| Ledger transport | HTTP or wallet requests and command encoding | `web/src/ledger/api.ts` |
| Grofty transport | MainNet account binding, restricted reads and prepared submission | `web/src/ledger/grofty.ts` |
| Session model | Current party, wallet connection and local mode | `web/src/ledger/session.ts` |
| Contract projection | Typed payloads, contract buckets and display calculations | `web/src/ledger/symbolon.ts` |
| Actions | Assemble authorized choices from current state | `web/src/app/actions.ts` |
| Desk UI | Forms, balances, positions, errors and oracle controls | `web/src/app/DeskApp.tsx` |

## Why the boundary matters

The UI can calculate an estimated repurchase amount and determine whether a button appears useful. It cannot authorize an invalid trade. Daml checks still run when a client bypasses the UI, changes a payload, retries a stale command or references a different asset.

Conversely, correct contracts do not automatically produce a safe deployment. An unrestricted local Ledger API is suitable only for a controlled demo. Production authentication, party rights, wallet behavior, token adapters, operator access and monitoring require separate work.

## Deployment shapes

**Local development:** one sandbox may host borrower, dealers, oracle and issuer. The browser accesses it through a local proxy, and developers may switch demo roles. This is a convenient test environment, not independent institutional hosting.

**Wallet demonstration:** the browser connects to a wallet that identifies a party and routes supported reads and submissions. Grofty uses its dedicated SDK and MainNet account; other compatible wallets use the PartyLayer path. The party, packages, tokens, synchronizer and wallet must actually be compatible. A wallet connection alone does not prove successful settlement. See the [Grofty integration boundary](../guides/grofty.md).

**Future multi-operator pilot:** counterparties use appropriately isolated participant infrastructure and real authorized assets. The transaction model can be tested in that topology, but the current repository does not claim such a deployment has been completed. See [DevNet readiness](../guides/wallet-devnet.md).
