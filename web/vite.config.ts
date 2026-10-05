import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { readFile } from "node:fs/promises";

// The dev proxy exists only for the local-sandbox path: a browser talking
// straight to `dpm sandbox` would be blocked by CORS, and the sandbox has no
// business growing CORS headers for us. Through a wallet there is no proxy and
// no origin problem — the wallet makes the call.
export default defineConfig({
  plugins: [react(), {
    name: "symbolon-local-demo-parties",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/demo-parties", async (_request, response) => {
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Cache-Control", "no-store");
        try {
          const parties = JSON.parse(await readFile(new URL("../.omc/demo/parties.json", import.meta.url), "utf8"));
          response.end(JSON.stringify(Object.values(parties).filter(value => typeof value === "string")));
        } catch {
          response.statusCode = 404;
          response.end(JSON.stringify({ error: "Run scripts/demo.ps1 seed first." }));
        }
      });
    },
  }],
  server: {
    host: "127.0.0.1",
    proxy: {
      "/ledger": {
        target: process.env.LEDGER_ORIGIN ?? "http://127.0.0.1:6864",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ledger/, ""),
      },
    },
  },
});
