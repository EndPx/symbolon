import test from "node:test";
import assert from "node:assert/strict";
import { createServer, resolveConfig } from "vite";
import { createServer as createHttpServer } from "node:http";
import { once } from "node:events";
import { sandboxConfig } from "../vite.sandbox.config.ts";

test("Native sandbox rejects remote ledgers, public binding and production", async () => {
  assert.throws(() => sandboxConfig("https://remote.example"), /loopback/);
  const config = sandboxConfig();
  await assert.rejects(resolveConfig({ ...config, configFile: false, server: { ...config.server, host: "0.0.0.0" } }, "serve"), /bound to 127/);
  await assert.rejects(resolveConfig({ ...config, configFile: false, mode: "production" }, "serve"), /development server/);
});

test("Native sandbox serves LocalNet identity instead of the public DevNet desk", async () => {
  const config = sandboxConfig();
  // Vite treats port 0 as its default port. Allocate one to avoid parallel-test collisions.
  const probe = createHttpServer();
  probe.listen(0, "127.0.0.1"); await once(probe, "listening");
  const testPort = (probe.address() as { port: number }).port;
  await new Promise<void>((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  const server = await createServer({ ...config, configFile: false, logLevel: "silent", server: { ...config.server, port: testPort, hmr: false } });
  const previousFetch = globalThis.fetch, previousWindow = globalThis.window;
  try {
    await server.listen();
    const port = (server.httpServer!.address() as { port: number }).port;
    const origin = `http://127.0.0.1:${port}`;
    const response = await fetch(`${origin}/deployment.json`);
    const deployment = await response.json();
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(deployment.network, "localnet");
    assert.equal(deployment.participant, null);
    assert.equal(deployment.tradingEnabled, false);
    assert.equal(deployment.publicDesk, undefined);
    assert.equal(deployment.assets.cash.symbol, "CUSD");
    assert.equal((await fetch(`${origin}/deployment.json`, { headers: { Origin: "https://attacker.example" } })).status, 403);
    assert.equal((await fetch(`${origin}/vite.sandbox.config.ts`)).status, 403);
    assert.equal((await fetch(`${origin}/ledger/http://remote.example`)).status, 403);
    const module = await server.ssrLoadModule("/src/ledger/deployment.ts");
    globalThis.fetch = async (input, options) => previousFetch(new URL(String(input), origin), options);
    await module.loadDeployment();
    globalThis.window = { location: { hostname: "127.0.0.1" } } as Window & typeof globalThis;
    const session = await server.ssrLoadModule("/src/ledger/session.ts");
    assert.equal(session.sandboxModeEnabled(), true);
    assert.deepEqual(await session.listWalletOptions(), []);
    assert.equal(session.connectSandbox("borrower::local").networkId, "localnet");
  } finally {
    globalThis.fetch = previousFetch; globalThis.window = previousWindow;
    await server.close();
  }
});
