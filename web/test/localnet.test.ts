import test from "node:test";
import assert from "node:assert/strict";
import { createServer as createHttpServer } from "node:http";
import { once } from "node:events";
import { createServer, resolveConfig } from "vite";
import { localnetConfig, localnetLedgerOrigin, localnetManifest, localnetToken } from "../vite.localnet.config.ts";
import { defaultDeployment } from "../src/ledger/deployment.ts";

const hash = "a".repeat(64);
const manifest = () => localnetManifest({ deployment: {
  ...structuredClone(defaultDeployment), network: "localnet", walletNetwork: "localnet", corePackageId: hash,
  synchronizerId: "localnet::sync", releaseEvidence: "https://example.org/localnet-proof",
  assets: {
    collateral: { symbol: "cBTC-demo", admin: "issuer::localnet", adapter: "demo-holding", packageIds: [hash] },
    cash: { symbol: "USDCx-demo", admin: "issuer::localnet", adapter: "demo-holding", packageIds: [hash] },
  },
}, parties: ["borrower::localnet", "issuer::localnet", "borrower::localnet"] });
const token = "header.payload.signature";

test("LocalNet proxy rejects remote endpoints and embedded credentials", () => {
  assert.equal(localnetLedgerOrigin("http://127.0.0.1:13975"), "http://127.0.0.1:13975");
  assert.equal(localnetLedgerOrigin("http://[::1]:13975"), "http://[::1]:13975");
  for (const endpoint of ["https://127.0.0.1:13975", "http://remote.example:13975", "http://127.0.0.1",
    "http://user:password@127.0.0.1:13975", "http://127.0.0.1:13975?token=secret", "http://127.0.0.1:13975/v2",
    "http://127.0.0.1:13975/#token", "http://localhost.attacker.example:13975"]) {
    assert.throws(() => localnetLedgerOrigin(endpoint));
  }
});

test("LocalNet token is read as a literal and never evaluated as shell code", () => {
  assert.equal(localnetToken(`export LOCALNET_CANTON_TOKEN='${token}'\n`), token);
  assert.equal(localnetToken(`LOCALNET_CANTON_TOKEN="${token}"`), token);
  for (const source of ["LOCALNET_CANTON_TOKEN=$(read_secret)", "LOCALNET_CANTON_TOKEN='header.payload.$(command)'", "OTHER_TOKEN='header.payload.signature'"]) {
    assert.throws(() => localnetToken(source));
  }
  assert.throws(() => localnetManifest({ ...manifest(), token }));
  assert.deepEqual(manifest().parties, ["borrower::localnet", "issuer::localnet"]);
});

test("LocalNet cannot be launched on a public host or in production mode", async () => {
  const config = localnetConfig(manifest(), token, "http://127.0.0.1:13975");
  await assert.rejects(resolveConfig({ ...config, configFile: false, server: { ...config.server, host: "0.0.0.0" } }, "serve"), /bound to 127/);
  await assert.rejects(resolveConfig({ ...config, configFile: false, mode: "production" }, "serve"), /development server/);
});

test("LocalNet serves its safe manifest and injects ledger authorization only at the proxy", async () => {
  const requests: Array<{ path?: string; authorization?: string; body: string }> = [];
  const upstream = createHttpServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += String(chunk);
    requests.push({ path: request.url, authorization: request.headers.authorization, body });
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(request.url?.endsWith("submit-and-wait") ? { updateId: "localnet-update" } : { offset: 42 }));
  });
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");
  const upstreamPort = (upstream.address() as { port: number }).port;
  const config = localnetConfig(manifest(), token, `http://127.0.0.1:${upstreamPort}`);
  const server = await createServer({ ...config, configFile: false, logLevel: "silent", server: { ...config.server, port: 0, hmr: false } });
  const previousFetch = globalThis.fetch;
  const previousWindow = globalThis.window;
  try {
    await server.listen();
    const port = (server.httpServer!.address() as { port: number }).port;
    const origin = `http://127.0.0.1:${port}`;
    const response = await fetch(`${origin}/deployment.json`);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const publicManifest = await response.json();
    assert.equal(publicManifest.network, "localnet");
    assert.equal(publicManifest.participant, null);
    assert.doesNotMatch(JSON.stringify(publicManifest), /header\.payload\.signature|LOCALNET_CANTON_TOKEN/);
    assert.deepEqual(await (await fetch(`${origin}/demo-parties`)).json(), manifest().parties);
    assert.equal((await fetch(`${origin}/deployment.json`, { headers: { Origin: "https://attacker.example" } })).status, 403);
    assert.equal((await fetch(`${origin}/vite.localnet.config.ts`)).status, 403);
    assert.equal((await fetch(`${origin}/ledger/http://remote.example`)).status, 403);
    assert.deepEqual(await (await fetch(`${origin}/ledger/v2/state/ledger-end`, { headers: { Authorization: "Bearer browser-token" } })).json(), { offset: 42 });
    assert.equal(requests[0].path, "/v2/state/ledger-end");
    assert.equal(requests[0].authorization, `Bearer ${token}`);

    // Vite SSR applies the same DEV/user-ID definitions as the served frontend.
    const deployment = await server.ssrLoadModule("/src/ledger/deployment.ts");
    globalThis.fetch = async (input, options) => previousFetch(new URL(String(input), origin), options);
    await deployment.loadDeployment();
    globalThis.window = { location: { hostname: "127.0.0.1" } } as Window & typeof globalThis;
    const session = await server.ssrLoadModule("/src/ledger/session.ts");
    assert.equal(session.sandboxModeEnabled(), true);
    assert.deepEqual(await session.listWalletOptions(), []);
    assert.equal(await session.connectAccount(), null);
    await assert.rejects(session.connectWallet("console", "devnet"), /Remote wallet connections are disabled/);
    const sandbox = session.connectSandbox("borrower::localnet");
    assert.equal(sandbox.networkId, "localnet");
    assert.equal(session.canTrade(sandbox), true);
    assert.equal(session.canTrade({ kind: "wallet", networkId: "localnet" }), false);
    assert.equal(await sandbox.submit([{ CreateCommand: { templateId: `${hash}:Symbolon.Test:Test`, createArguments: {} } }]), "localnet-update");
    const posted = JSON.parse(requests.at(-1)!.body);
    assert.equal(posted.userId, "ledger-api-user");
    assert.equal(posted.synchronizerId, "localnet::sync");
    assert.deepEqual(posted.packageIdSelectionPreference, [hash]);
    assert.deepEqual(posted.actAs, ["borrower::localnet"]);
    globalThis.window = { location: { hostname: "symbolon.endpx.cloud" } } as Window & typeof globalThis;
    assert.equal(session.sandboxModeEnabled(), false);
    assert.throws(() => sandbox.submit([{ CreateCommand: { templateId: "test", createArguments: {} } }]), /local demo server/);
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.window = previousWindow;
    await server.close();
    await new Promise<void>((resolve, reject) => upstream.close(error => error ? reject(error) : resolve()));
  }
});
