# Symbolon

**Private fixed-rate bilateral repo on Canton, with agreed repayment terms and a complete collateral workflow.**

Symbolon connects a borrower that needs cash with a dealer willing to purchase collateral and sell it back on agreed terms. A borrower requests quotes from dealers separately. Accepting one quote settles the cash and collateral legs together. Both parties then manage the same position through health-factor margin calls, top-ups, collateral substitution, repurchase, dealer-led liquidation after an uncured call, or maturity default.

Maturity is an agreed deal parameter. The current contracts support whole-day terms from 1 to 365 days; a 30-day walkthrough is an example, not the product's defining maturity.

This documentation explains the product, its Daml model, the browser application, and how to reproduce a local demonstration. It also separates the working prototype from the integrations and commercial assumptions that still need validation.

{% hint style="info" %}
**Development status.** Symbolon is a hackathon prototype. Its assets and price marks are simulated. It has no production asset adapter, independent security audit, verified customer traction, or established production deployment. A successful local test is not evidence that a wallet works on the shared hackathon DevNet. See [status and limitations](reference/status.md).
{% endhint %}

## Choose a starting point

| Your goal | Start here |
| --- | --- |
| Understand the problem and intended user | [Problem and solution](introduction/problem-and-solution.md) |
| Understand why rate and privacy matter | [Fixed interest on Canton](introduction/fixed-interest.md) and [Why privacy is required](introduction/privacy.md) |
| Follow a transaction | [Repo lifecycle](how-it-works/lifecycle.md) |
| Run the prototype | [Local setup](guides/local-setup.md) and [complete demo](guides/demo.md) |
| Understand wallet integration | [DevNet readiness](guides/wallet-devnet.md) and [Grofty MainNet integration](guides/grofty.md) |
| Integrate or inspect the implementation | [Architecture](architecture/overview.md), [Daml contracts](architecture/daml.md), and [API reference](reference/api.md) |
| Evaluate the project | [Validation plan](mission/validation.md), [evidence and disclosure](mission/submission.md), and [roadmap](mission/roadmap.md) |

## What a repo means here

The borrower sells a quantity of collateral for the **purchase price**, then commits to paying a **repurchase price** to recover that collateral. The difference is the fixed term interest. This is represented as a title transfer on the demo ledger. The implementation does not establish legal rights to external securities or make an underlying token enforceable in a particular jurisdiction.

The name *Symbolon* reflects the idea of two parties retaining matching evidence of an agreement. In the application, each counterparty keeps a ledger view of the transaction and its closing receipt. That metaphor does not replace the technical trust boundaries described in [privacy and trust](architecture/privacy-and-trust.md).

## Source and documentation

The [Symbolon repository](https://github.com/EndPx/symbolon) contains the application, Daml packages, scripts, and this documentation. GitBook source lives under `docs/gitbook`; `SUMMARY.md` defines the navigation. These files are ready to import or synchronize into a GitBook space. Preparing them does not publish a GitBook website or create a public documentation URL.

Documentation baseline: **23 September 2026**. Deployment and test evidence should always be read with its environment and revision, rather than assumed to apply to every network.
