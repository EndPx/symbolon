# Local setup

The supported project helper is `scripts/demo.ps1`, run from the repository root with **PowerShell 7**. It builds the Daml packages through a space-free cache, starts a local Canton runtime, seeds the ledger and runs wall-clock scenarios. This avoids the Daml data-dependency problems seen with Windows paths containing spaces. The default build cache is under `D:\symbolon-build\build-...` on this checkout's drive; `SYMBOLON_BUILD_HOME` can select another writable space-free location. Avoid Windows packaged-app redirected paths, which can also break DPM tooling.

## Prerequisites

- PowerShell 7 for the helper.
- The project's Daml SDK and `dpm` tooling. Package manifests pin **SDK 3.5.2**.
- A compatible Canton runtime. The current local runtime is **Canton 3.5.6**.
- Node.js and npm to install and build the frontend; use the committed npm lockfile.
- Free loopback ports **6864** for HTTP JSON, **6865** for gRPC, and normally **5173** for Vite.

These instructions create simulated assets and local parties. They do not require a funded MainNet wallet.

## Build and start

Open PowerShell 7 at the repository root and run each command after the previous one finishes:

```powershell
./scripts/demo.ps1 build
./scripts/demo.ps1 start
./scripts/demo.ps1 seed
./scripts/demo.ps1 verify
./scripts/demo.ps1 status
```

| Command | Purpose | Expected artifact |
| --- | --- | --- |
| `build` | Build the core, test and live DARs; run Daml tests | DARs copied back into package `.daml/dist` folders |
| `start` | Start the local runtime bound to loopback | Local JSON/gRPC APIs and runtime logs |
| `seed` | Upload the live package and dependencies, then run `Symbolon.Live:setupDesk` | `.omc/demo/parties.json` with six allocated party identities |
| `verify` | Execute live happy path and lifecycle scenarios | `.omc/demo/verification.json` with run/offset evidence |
| `status` | Inspect local runtime state | Status output |
| `stop` | Stop the helper-managed runtime | Runtime stopped |

Read the output and stop at a failed command. Do not treat expected filenames as evidence that their contents represent a successful run. Rerunning seed may allocate a new set of identities; use the latest party record rather than assuming display names uniquely identify a party.

## Run the browser application

In a second terminal:

```powershell
Set-Location web
npm.cmd ci
npm.cmd test
npm.cmd run doctor
npm.cmd run dev -- --host 127.0.0.1
```

Open the loopback URL Vite prints and visit `/app`. The local party picker is restricted to a loopback host in development mode. The dev-only `/demo-parties` endpoint reads `.omc/demo/parties.json`, keeping the seeded role picker separate from parties allocated by verification runs. Select a party from that seeded environment. An unauthenticated remote visitor does not automatically receive a borrower's view.

The development proxy maps `/ledger` to `http://127.0.0.1:6864` by default. If the local runtime is reachable at a different address, configure `LEDGER_ORIGIN` in the frontend terminal before launching Vite:

```powershell
$env:LEDGER_ORIGIN = 'http://127.0.0.1:6864'
npm.cmd run dev -- --host 127.0.0.1
```

`VITE_LEDGER_URL` can override the direct client base, normally `/ledger`. Do not put credentials in a `VITE_` variable. For a local production preview, `VITE_ENABLE_LOCAL_DEMO=true` can enable the demo path on loopback; it does not enable a remote public party picker.

## Build the frontend artifact

```powershell
npm.cmd run build
```

This runs TypeScript checking and creates `web/dist`. `npm.cmd test` covers client behavior, while `npm.cmd run doctor` checks static integration concerns. Neither substitutes for the Daml scripts or a browser demonstration. The `.cmd` form avoids PowerShell npm-shim argument handling issues; on other shells the equivalent command is `npm`.

## Exercise the frontend adapter over real HTTP

After `npm.cmd ci` and a successful ledger seed, run this from the repository root:

```powershell
node web/node_modules/tsx/dist/cli.mjs scripts/demo-http.mjs
```

This imports the frontend's real action builders and HTTP adapter and exercises the complete local workflow. It creates six isolated `http-demo-*` parties so the browser's seeded desk remains separate. It accepts only the loopback ledger on port 6864 and does not connect a wallet or authenticate to DevNet. See [security validation](../architecture/security.md) for the recorded checks.

## Finish

Stop Vite in its terminal, return to the repository root in PowerShell, and run:

```powershell
./scripts/demo.ps1 stop
```

Runtime logs, party allocation and verification records are local working artifacts under `.omc/demo`. They should not be published indiscriminately with private data or credentials. Next: [complete demo walkthrough](demo.md).
