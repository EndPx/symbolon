# Sources and documentation maintenance

## Primary implementation source

The [Symbolon repository](https://github.com/EndPx/symbolon) is the source for implemented behavior. The main files are:

- `daml/Symbolon/Repo.daml` and `daml/Symbolon/DemoAsset.daml` for choices, assertions, state and authorization.
- `daml-test/Symbolon/Test/EndToEnd.daml` for executable behavior and negative checks.
- `daml-live/Symbolon/Setup.daml` and `daml-live/Symbolon/Live.daml` for a seeded and wall-clock environment.
- `web/src/ledger/`, `web/src/app/actions.ts` and `web/src/app/DeskApp.tsx` for browser projection and submitted payloads.
- `scripts/` for reproducible local operations.

If a comment, screenshot or earlier README contradicts executable source, inspect the relevant test and update the documentation. Do not treat an old successful run as evidence for a changed package.

## Canton and Daml references

Digital Asset's [ledger privacy explanation](https://docs.digitalasset.com/overview/3.5/explanations/ledger-model/ledger-privacy.html), [participant overview](https://docs.digitalasset.com/operate/3.4/overview/index.html), [party hosting explanation](https://docs.digitalasset.com/overview/3.4/explanations/canton/external-party.html), [templates reference](https://docs.digitalasset.com/build/3.4/reference/daml/templates.html) and [choices reference](https://docs.digitalasset.com/build/3.4/reference/daml/choices.html) provide conceptual background. Some links are to a different documentation minor version than the pinned SDK; verify version-specific API behavior against the runtime actually used.

## Grofty integration references

The [official Grofty dApp SDK](https://github.com/groftywallet/grofty-dapp-sdk) supplies the interface used by `web/src/ledger/grofty.ts`; the application pins `@groftylabs/dapp-sdk` to `0.2.0`. Its version is distinct from the compatible wallet-extension version. Grofty's [onboarding guide](https://www.grofty.cc/docs/quick-start), [Canton asset/preapproval explanation](https://www.grofty.cc/docs/canton-network) and [transfer/bridge flow](https://www.grofty.cc/docs/transfer-flow) provide operational context. Source documentation describes the provider's API; it does not prove that Symbolon has executed its product on MainNet.

The [official hackathon challenge page](https://hackathon.appsfactory.cc/season-3#challenges) is the requirement reference. Keep qualification claims separate from SDK tests and recheck the current sponsor requirements before submission.

## Product and information-architecture references

[ATFI's documentation index](https://atfi.gitbook.io/atfi-docs/sitemap.md) informed the organization into introduction, workflow, technical details, deployment and roadmap. Its product content was not copied. The `/documentation` reference is a navigation group; individual Markdown pages are listed in its sitemap.

[Centuari staging documentation](https://docs-staging.centuari.finance/introduction) informed questions about rate presentation, maturity, collateral operations and failure states. Symbolon is not an implementation of Centuari. It uses a private bilateral repo model, ACT/360 term interest and full-price early repurchase, rather than Centuari's documented order-book/CBT model. Competitor documentation does not validate Symbolon's customers or establish deployed capabilities.

Detailed research notes are maintained locally and are not part of this public GitBook. These pages contain original Symbolon explanations and source links rather than republishing a third party's documentation.

## Maintaining the GitBook source

`SUMMARY.md` lists the pages and section order. Root `.gitbook.yaml` points GitBook at this folder. Keep internal links relative to the GitBook root; keep links to external documentation explicit. Avoid linking public pages to private research notes, local machine paths or credentials.

When a contract changes, update the API reference, lifecycle, economic examples, test evidence, role guides and demo together. When a network is added, update wallet support only after the checks have been executed. A change to the frontend label alone is not evidence of a new integration.

## Publication

Import or synchronize this source into a GitBook space owned by the project. GitBook documents [importing existing repository content](https://gitbook.com/docs/guides/editing-and-publishing-documentation/import-or-migrate-your-content-to-gitbook-with-git-sync) and [scoping a docs folder with the root configuration](https://gitbook.com/docs/help-center/integrations/integrations-troubleshooting/git-sync/gitbook-is-not-using-my-docs-folder). For an initial import of this prepared source, choose the repository-to-GitBook direction so an empty space does not overwrite the files.

Check navigation, Mermaid rendering, tables, direct links and mobile layout in preview. Set the desired visibility in that account and publish only when the team is ready. No public GitBook URL is asserted merely because these source files exist.

### Import this repository

1. Ensure the reviewed documentation and root `.gitbook.yaml` exist on the repository branch that will be synchronized.
2. In the project's GitBook account, create or select the destination space and open **Set up Git Sync**.
3. Authorize the GitBook GitHub integration for `EndPx/symbolon` and select the intended branch. Use the repository root as the project directory, because `.gitbook.yaml` is located there.
4. Choose **GitHub → GitBook** for the first synchronization of these existing files. The configured `root: ./docs/gitbook/` limits the content scope; `README.md` is the home page and `SUMMARY.md` supplies navigation.
5. Review the imported introduction, nested sections, diagrams, code blocks and internal links in GitBook preview. Confirm that local research notes from `docs/references` and runtime artifacts from `.omc` are absent.
6. Configure the documentation site's title, visibility and desired URL in the project account, then publish when approved by the team.
7. Record the real published URL only after opening it successfully. Keep later changes on the reviewed Git Sync workflow; changes to an already live space can affect the public site.
