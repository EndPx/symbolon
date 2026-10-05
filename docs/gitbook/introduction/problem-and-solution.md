# Problem and solution

## Working problem statement

Treasury teams holding tokenized assets may need cash for a limited period while retaining a contractual route to recover those assets. A treasury operator must coordinate more than a rate: the counterparty, eligible collateral, transfer timing, maturity, required coverage, and response to a collateral shortfall all matter.

Our initial hypothesis is that some smaller digital-asset funds and tokenized-asset operators coordinate these steps across dealer conversations and separate operational records. We have not yet demonstrated that these users lack an adequate existing solution, that they can access the desired Canton assets, or that they would pay for Symbolon.

## A concrete scenario

A fund expects a cash receipt in 30 days but has an obligation this week. Selling an investment permanently may disrupt its strategy. A term repo could provide cash now with a known repurchase obligation. The operator needs to compare a few dealer quotes privately and understand what happens if collateral value changes before the expected receipt arrives.

This example is an interview prompt, not a reported customer transaction. It gives the team something specific to test: recent funding timelines, manual steps, available counterparties, collateral restrictions, and the cost of coordination errors.

## Symbolon's approach

1. Express the proposed transaction in a separate RFQ for each dealer.
2. Capture rate, validity and funding in a dealer quote.
3. Commit the cash and collateral legs in one transaction on acceptance.
4. Preserve a position with exact repayment terms and explicit collateral actions.
5. Record whether the repo ended through repurchase or default.

The expected user outcome is fewer gaps between agreeing terms and managing the resulting obligation. The prototype lets us test whether that workflow is useful. It does not establish a measured time saving or lower financing cost.

## Alternatives to understand

Customer research must compare Symbolon with the user's actual process: dealer or broker relationships, existing repo platforms, asset sales or redemptions, and other available secured funding. A comparison should examine access, eligible assets, settlement, privacy, operating effort and legal requirements. It should not assume that existing institutional repo technology is absent.

The [validation plan](../mission/validation.md) defines interview questions, a pilot sequence, and criteria that could disprove the product hypothesis.
