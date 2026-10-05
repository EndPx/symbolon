# BitSafe LocalNet integration

Symbolon's BitSafe integration is a Daml proposal that uses DecMan's `GovernableAction` interface. A governance member proposes a new `PriceFeed` mark; the decentralized oracle party publishes it only after the governance rules reach their confirmation threshold. That mark can move a repo's health factor below `1.00`, allowing the dealer to issue a margin call. The mark remains simulated and governance approval does not certify market accuracy.

## What has run

The `symbolon-bitsafe` DAR builds against BitSafe's pinned governance-action DAR. Its Daml Script creates a repo, checks that one confirmation cannot execute the mark, then executes with two of three confirmations. It checks that the old feed is archived, the replacement price is 60, and the dealer can issue a Symbolon margin call. The script passed both in the Daml test runner and twice against a native wall-clock Canton 3.5.6 sandbox on 29 September 2026. The latter is **single-participant local evidence**. We have not yet run these steps through the three DecMan services in BitSafe's official LocalNet.

## Build the Symbolon action

On Windows, from the Symbolon repository root:

```powershell
./scripts/demo.ps1 build
./scripts/build-bitsafe.ps1
```

The second helper fetches the two released governance DARs from BitSafe commit `21ffdedf64366b1f2824301c434b427bf4726663`, checks their pinned SHA-256 digests, and builds the adapter and its Daml Script package. Downloads stay in ignored `.omc/research/bitsafe/`. Built outputs are:

```text
daml/.daml/dist/symbolon-v2-0.2.0.dar
daml-bitsafe/.daml/dist/symbolon-bitsafe-0.2.0.dar
daml-bitsafe-test/.daml/dist/symbolon-bitsafe-test-0.2.0.dar
```

The source templates are in `daml-bitsafe/Symbolon/BitSafe/PriceMarkProposal.daml`; the threshold and repo effect script is in `daml-bitsafe-test/Symbolon/BitSafe/Test/PriceMark.daml`. `symbolon-bitsafe` uses SDK 3.5.2 and successfully compiled against BitSafe's released governance DARs, which were built with SDK 3.4.11. Actual package vetting on the BitSafe starter remains to be checked.

For the narrower live-ledger check on Symbolon's own Canton sandbox, run:

```powershell
./scripts/demo.ps1 start
./scripts/verify-bitsafe-live.ps1
./scripts/demo.ps1 stop
```

The verification script uploads the combined test DAR, executes the 2-of-3 proposal and repo margin-call scenario, and writes ignored local evidence to `.omc/demo/bitsafe-live.json`. This local check does not start DecMan.

## Run BitSafe's starter before integrating

The [official hackathon README](https://github.com/DLC-link/decentralization-manager/blob/hackathon/hackathon/README.md) specifies Docker Compose v2.1.1+, **12 GB RAM and 4 CPUs allocated to Docker**, roughly 20 GB free disk, and Bash/curl/jq/base64/tar. Run the starter in an environment meeting those requirements. Its HTTP admin UIs are intentionally loopback-only with authentication disabled; do not expose them to a public interface.

On Linux or WSL, clone BitSafe's pinned source and run its own steps:

```bash
git clone https://github.com/DLC-link/decentralization-manager.git
cd decentralization-manager
git checkout 21ffdedf64366b1f2824301c434b427bf4726663
./hackathon/up.sh
./hackathon/seed.sh
./hackathon/demo.sh
```

`seed.sh` creates the 2-of-3 decentralized party, distributes BitSafe's governance packages, allocates one member party per participant and deploys `GovernanceRules`. Its local `hackathon/.state` records the decentralized party and member IDs. `demo.sh` proves the generic governance workflow, which has no Symbolon effect. Keep those commands as a starter health check, then perform the Symbolon-specific steps below. BitSafe's [walkthrough](https://github.com/DLC-link/decentralization-manager/blob/hackathon/hackathon/WALKTHROUGH.md) explains the three DecMan UIs and audit trail.

## Symbolon-specific DecMan run to complete

The repository now includes `scripts/bitsafe-localnet.mjs` and a GitHub Actions workflow for this run. The harness is confined to the pinned official disposable LocalNet, uses all three DecMan services, distributes and records vetting of the DARs, initializes the oracle through a governed proposal, opens a repo using demo cBTC/USDCx holdings, tests rejection at one confirmation, executes at two approvals, then completes margin top-up and repurchase. It checks that all participants see the same execution update IDs and saves `.omc/evidence/bitsafe-localnet.json`. A workflow definition is not successful execution evidence; check the run and JSON result before claiming completion.

After `up.sh` and `seed.sh`, run from Symbolon's root:

```bash
BITSAFE_LOCALNET_HOME=/absolute/path/to/decentralization-manager \
  node web/node_modules/tsx/dist/cli.mjs scripts/bitsafe-localnet.mjs
```

The default starter checkout is `.omc/bitsafe-localnet`. The source commit must match the pinned release. Credentials for shared DevNet/MainNet must never be passed to this LocalNet harness. `InitializePriceFeedProposal` removes the need for a single participant to directly impersonate the decentralized oracle during initialization. It does not provide a unique canonical oracle lineage.

1. Distribute both the core Symbolon DAR and `symbolon-bitsafe` DAR to all three LocalNet participants using DecMan's `/dars/distribute` workflow. Vetting must be visible on each peer.
2. Create a `PriceFeed` whose `oracle` is the BitSafe decentralized party and whose readers include the borrower and dealer demo parties. Seed demo holdings and one funded Symbolon repo against that feed.
3. Create `PriceMarkProposal` with one governance member as `proposer`, the decentralized party as `governanceParty`, the active feed contract ID, and a lower simulated price. Use a Ledger API or Daml Script submission for proposal creation: DecMan's generic `/contracts` field serializer does not include the needed `Decimal` and `ContractId PriceFeed` field types. The proposal is visible to the decentralized party through its observer role.
4. Confirm once and attempt execution. Record the ledger rejection and show that the old price remains active. Confirm with a second distinct member, then execute using DecMan's `/governance/execute` with `governance_type: "core_domain"` and the proposal CID. The [custom-template guide](https://github.com/DLC-link/decentralization-manager/blob/hackathon/docs/CUSTOM_DAML_TEMPLATES.md) documents this package-agnostic endpoint.
5. Show the new `PriceFeed` on the ledger and a Symbolon margin call against the active repo. Capture the DecMan audit entries and update IDs from all three nodes, then continue to top-up or the separately demonstrated post-cure liquidation branch.

That full three-node run is the remaining Contribution Pool proof. A Daml Script passing on one participant does not establish DecMan peer coordination or completion of the challenge. The current Symbolon web desk does not yet expose a governance-proposal screen; the first integration run can use a documented command for proposal creation while keeping the repo workflow in the desk.
