# Symbolon DecMan LocalNet installation

The active challenge is **BitSafe Contribution Pool**. This installation runs the
official BitSafe sandbox on an existing Linux host; it is not a live Canton
DevNet node. The public Symbolon app continues to use shared HackCanton DevNet.

## Requirements

- Linux Docker host, Docker Compose 2.24.4+ for private port overrides.
- 12 GB RAM / 4 CPU allocated to Docker and at least 20 GB free disk.
- Git, Bash, curl, jq, tar and base64.
- Existing workloads must have enough memory headroom for the sandbox.

## Install and seed

Copy this directory to a private operator directory, then run:

```bash
BITSAFE_LOCALNET_HOME=/opt/symbolon/decman-source ./localnet.sh up
BITSAFE_LOCALNET_HOME=/opt/symbolon/decman-source ./localnet.sh seed
```

The wrapper pins source `21ffdedf64366b1f2824301c434b427bf4726663`, LocalNet
0.6.12 and DecMan image v1.8.0. It uses the official starter's download, health,
onboarding and governance procedures. Project, network and container names are
isolated from other applications. The app-provider gRPC host port is 13901,
allowing another application to keep using host port 3901.

All participant/Admin/JSON and DecMan host ports bind to `127.0.0.1`. Postgres
and Splice have no host port. The unauthenticated sandbox must stay private.
The three participants and three managers share one host; this proves test
topology and threshold behavior, not independent operators or outage tolerance.

## Integrate with Symbolon

Build the application DARs from the checked-out source using the existing
build instructions and put the resulting files under their normal `.daml/dist`
directories. Install `web` dependencies, then run from Symbolon's root:

```bash
BITSAFE_LOCALNET_HOME=/opt/symbolon/decman-source \
  node web/node_modules/tsx/dist/cli.mjs scripts/bitsafe-localnet.mjs
BITSAFE_LOCALNET_HOME=/opt/symbolon/decman-source node scripts/export-bitsafe-localnet-app.mjs
```

This distributes/vets the DARs, initializes the committee oracle, rejects one
confirmation, accepts two, then completes an actual repo margin/top-up/repurchase
using Symbolon's ledger adapter and action builders. Output is
`.omc/evidence/bitsafe-localnet.json`.

For another simulated mark, use:

```bash
BITSAFE_LOCALNET_HOME=/opt/symbolon/decman-source \
  node web/node_modules/tsx/dist/cli.mjs scripts/decman-localnet-mark.mjs \
  --local-only --price 60000
```

This helper deliberately uses two distinct **test member roles controlled by
the same operator**. It is not a production oracle or an independent committee.
Partial proposal evidence is saved before execution; inspect the original
proposal if a request fails instead of submitting a replacement automatically.

## Access from the operator's laptop

Forward the private services over SSH:

```bash
ssh -N \
  -L 127.0.0.1:18081:127.0.0.1:8081 \
  -L 127.0.0.1:18082:127.0.0.1:8082 \
  -L 127.0.0.1:18083:127.0.0.1:8083 \
  -L 127.0.0.1:13975:127.0.0.1:3975 operator@your-vps
```

The three DecMan UIs are then available on localhost ports 18081–18083.
The Symbolon LocalNet frontend uses the tunneled JSON API and an exported
test-party manifest. Shared DevNet credentials are never used by this sandbox.

When the harness ran on the VPS, copy its two private frontend inputs into
`.omc/decman-localnet/` on the laptop. Replace `operator@your-vps` with your
existing SSH host or alias:

```powershell
New-Item -ItemType Directory -Force .omc/decman-localnet | Out-Null
scp operator@your-vps:/opt/symbolon/app/.omc/decman-localnet/app.json .omc/decman-localnet/
scp operator@your-vps:/opt/symbolon/app/.omc/decman-localnet/localnet.sh .omc/decman-localnet/
Set-Location web
npm.cmd run dev -- --config vite.localnet.config.ts
```

Open `http://127.0.0.1:15173/app`. Select one of the seeded test parties in
Session controls. The separate development config labels the environment
LocalNet, supplies the `ledger-api-user` identity and attaches the official
unsafe sandbox JWT only at its server proxy. It rejects remote targets,
public host binding, foreign origins, and production builds. The ignored
script contains the upstream public development token; it must never be
used as a shared DevNet credential or included in a public app deployment.

```bash
./localnet.sh status
./localnet.sh stop
```

`stop` preserves the ledger and manager databases; it only targets the two
Symbolon Compose projects. No other application is stopped or reset.

## Shared DevNet boundary

The app's hosted-account repo flow on shared DevNet remains available. A live
DecMan deployment additionally needs operator-authorized Canton Admin and
Ledger **gRPC** APIs, topology/key-store authority and peer setup. Console/Wallet
login and the JSON Ledger API do not supply those capabilities. The workshop's
Contribution Pool path does not require purchasing or deploying that node.

See the [BitSafe workshop](https://docs.google.com/presentation/d/1gP00fYAInXhts58fVVQt1dAVIrQAvF52pdefcalVFBE/edit),
[official starter](https://github.com/DLC-link/decentralization-manager/blob/hackathon/hackathon/README.md),
and [DecMan deployment guide](https://github.com/DLC-link/decentralization-manager/blob/v1.12.0/docs/DEPLOYMENT_GUIDE.md).
