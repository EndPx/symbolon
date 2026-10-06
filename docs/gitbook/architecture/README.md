# Technical Details

Symbolon separates the browser's party-scoped view from ledger authority. Daml controls financing transitions and asset locks; the client constructs requests, delegates authorized submission, and displays committed results.

{% content-ref url="overview.md" %}
[Overview](overview.md)
{% endcontent-ref %}

{% content-ref url="onchain-offchain.md" %}
[Onchain and Offchain Data](onchain-offchain.md)
{% endcontent-ref %}

The [contract model](daml.md), [frontend data flow](frontend.md), and [privacy and trust model](privacy-and-trust.md) describe those boundaries in detail. [Asset adapters](adapters.md) and [security validation](security.md) explain integration requirements and tested failure cases.
