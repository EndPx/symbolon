# MainNet

MainNet financing is not enabled in the current release. The intended production pair is cBTC collateral with USDCx cash, subject to verified official token adapters and operating arrangements.

## What must be ready?

| Requirement | Why it matters |
| --- | --- |
| Supported token adapters and issuer identity | Real assets need their actual transfer and restriction model. |
| Reliable agreed price sourcing | A structurally valid timestamp does not establish economic accuracy. |
| Counterparty and participant permissions | Both parties must be able to authorize the intended asset movements. |
| Complete closeout accounting | Production needs sale/recovery and surplus/shortfall treatment beyond demo collateral release. |
| Operating and legal arrangements | The recorded workflow does not by itself establish external enforceability or custody terms. |

## Example: why a wallet balance is not enough

A user may hold a token called USDCx in a wallet. That does not make it interchangeable with Symbolon's simulated USDCx holdings, or prove the current DemoAsset contracts can transfer that production token. The adapter, issuer and permitted transfer context need verification first.

There are no active Symbolon MainNet contract addresses to list for this release. Use Shared DevNet for the current hosted test workflow.
