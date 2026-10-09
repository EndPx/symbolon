import { defineConfig, mergeConfig, type UserConfig } from "vite";
import { fileURLToPath } from "node:url";
import baseConfig from "./vite.config";
import { defaultDeployment, parseDeployment } from "./src/ledger/deployment";
import { localnetLedgerOrigin } from "./vite.localnet.config";

const webRoot = fileURLToPath(new URL("./", import.meta.url));
const loopback = new Set(["127.0.0.1", "localhost", "[::1]"]);

/** Native dpm sandbox uses package-name resolution and seeded CETH/CUSD assets. */
export const sandboxDeployment = parseDeployment({
  ...structuredClone(defaultDeployment), network: "localnet", walletNetwork: "localnet",
  assets: {
    collateral: { symbol: "CETH", admin: null, adapter: "demo-holding", packageIds: [] },
    cash: { symbol: "CUSD", admin: null, adapter: "demo-holding", packageIds: [] },
  },
});

export function sandboxConfig(origin = "http://127.0.0.1:6864"): UserConfig {
  const target = localnetLedgerOrigin(origin);
  const profile: UserConfig = {
    root: webRoot,
    define: {
      "import.meta.env.VITE_LEDGER_URL": JSON.stringify("/ledger"),
      "import.meta.env.VITE_LOCAL_LEDGER_USER_ID": JSON.stringify("symbolon-local"),
    },
    plugins: [{
      name: "symbolon-native-sandbox", enforce: "pre",
      configResolved(config) {
        if (config.command !== "serve" || config.mode === "production" || config.isProduction || config.server.host !== "127.0.0.1") {
          throw new Error("The sandbox must run as a development server bound to 127.0.0.1.");
        }
      },
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          let host: URL;
          try { host = new URL(`http://${request.headers.host}`); }
          catch { response.statusCode = 403; response.end("Loopback requests only."); return; }
          if (!loopback.has(host.hostname) || host.username || host.password
            || !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(request.socket.remoteAddress ?? "")
            || (request.headers.origin && request.headers.origin !== host.origin)) {
            response.statusCode = 403; response.end("Loopback requests only."); return;
          }
          const path = request.url?.split("?")[0];
          if (path === "/deployment.json") {
            if (!["GET", "HEAD"].includes(request.method ?? "")) { response.statusCode = 405; response.end(); return; }
            response.setHeader("Content-Type", "application/json");
            response.setHeader("Cache-Control", "no-store");
            response.end(request.method === "HEAD" ? "" : JSON.stringify(sandboxDeployment));
            return;
          }
          if (path?.startsWith("/ledger") && (!/^\/ledger\/v2\/[a-z0-9/-]+$/i.test(path)
            || path.includes("//") || !["GET", "POST"].includes(request.method ?? ""))) {
            response.statusCode = 403; response.end("Unsupported sandbox ledger resource."); return;
          }
          next();
        });
      },
    }],
    server: {
      host: "127.0.0.1", port: 5173, strictPort: true, cors: false,
      fs: { strict: true, allow: [webRoot], deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/.omc/**", "**/.vercel/**", "**/vite.*.config.ts"] },
      proxy: { "/ledger": { target, changeOrigin: true, followRedirects: false, rewrite: (path: string) => path.replace(/^\/ledger/, "") } },
    },
  };
  return mergeConfig(baseConfig, profile);
}

export default defineConfig(({ command }) => {
  if (command !== "serve") throw new Error("The sandbox config is for local development only. Use vite.config.ts for production builds.");
  return sandboxConfig(process.env.LEDGER_ORIGIN ?? "http://127.0.0.1:6864");
});
