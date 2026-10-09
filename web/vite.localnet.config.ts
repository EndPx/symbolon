import react from "@vitejs/plugin-react";
import { defineConfig, type UserConfig } from "vite";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseDeployment, type Deployment } from "./src/ledger/deployment";

const webRoot = fileURLToPath(new URL("./", import.meta.url));
const loopback = new Set(["127.0.0.1", "localhost", "[::1]"]);
type LocalnetManifest = { deployment: Deployment; parties: string[] };

export function localnetLedgerOrigin(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "http:" || !loopback.has(url.hostname) || !url.port
    || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("LocalNet ledger must be an HTTP loopback origin with a port and no credentials, path or query.");
  }
  return url.origin;
}

export function localnetManifest(value: unknown): LocalnetManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Missing LocalNet app manifest.");
  const manifest = value as LocalnetManifest;
  if (Object.keys(manifest).some(key => !["deployment", "parties"].includes(key))) throw new Error("Unexpected LocalNet app manifest field.");
  const deployment = parseDeployment(manifest.deployment);
  if (deployment.network !== "localnet" || !deployment.corePackageId || !deployment.synchronizerId || !deployment.releaseEvidence) {
    throw new Error("LocalNet app manifest needs its deployed package, synchronizer and evidence.");
  }
  if (!Array.isArray(manifest.parties) || !manifest.parties.length
    || manifest.parties.some(party => typeof party !== "string" || !party.includes("::"))) {
    throw new Error("LocalNet app manifest needs seeded party IDs.");
  }
  return { deployment, parties: [...new Set(manifest.parties)] };
}

/** Read a literal from the official local script; never execute shell input. */
export function localnetToken(source: string): string {
  const match = source.match(/^\s*(?:export\s+)?LOCALNET_CANTON_TOKEN\s*=\s*(["'])([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*)\1\s*(?:#.*)?$/m);
  if (!match) throw new Error("The official LocalNet script has no literal LOCALNET_CANTON_TOKEN.");
  return match[2];
}

export function localnetConfig(manifest: LocalnetManifest, token: string, origin: string): UserConfig {
  const app = localnetManifest(manifest);
  const target = localnetLedgerOrigin(origin);
  return {
    root: webRoot,
    // Only this non-secret development user ID enters the client module.
    define: { "import.meta.env.VITE_LOCAL_LEDGER_USER_ID": JSON.stringify("ledger-api-user"), "import.meta.env.VITE_LEDGER_URL": JSON.stringify("/ledger") },
    plugins: [react(), {
      name: "symbolon-decman-localnet",
      apply: "serve",
      configResolved(config) {
        if (config.command !== "serve" || config.mode === "production" || config.isProduction || config.server.host !== "127.0.0.1") {
          throw new Error("The LocalNet app must run as a development server bound to 127.0.0.1.");
        }
      },
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          let host: URL;
          try { host = new URL(`http://${request.headers.host}`); }
          catch { response.statusCode = 403; response.end("Loopback requests only."); return; }
          const peer = request.socket.remoteAddress;
          if (!loopback.has(host.hostname) || host.username || host.password
            || !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(peer ?? "")
            || (request.headers.origin && request.headers.origin !== host.origin)) {
            response.statusCode = 403; response.end("Loopback requests only."); return;
          }
          const path = request.url?.split("?")[0];
          if (path === "/deployment.json" || path === "/demo-parties") {
            if (request.method !== "GET" && request.method !== "HEAD") { response.statusCode = 405; response.end(); return; }
            response.setHeader("Content-Type", "application/json");
            response.setHeader("Cache-Control", "no-store");
            response.end(request.method === "HEAD" ? "" : JSON.stringify(path === "/deployment.json" ? app.deployment : app.parties));
            return;
          }
          if (path?.startsWith("/ledger") && (!/^\/ledger\/v2\/[a-z0-9/-]+$/i.test(path)
            || path.includes("//") || !["GET", "POST"].includes(request.method ?? ""))) {
            response.statusCode = 403; response.end("Unsupported LocalNet ledger resource."); return;
          }
          next();
        });
      },
    }],
    server: {
      host: "127.0.0.1", port: 15173, strictPort: true, cors: false,
      fs: { strict: true, allow: [webRoot], deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/.omc/**", "**/.vercel/**", "**/vite.localnet.config.ts"] },
      proxy: {
        "/ledger": {
          target, changeOrigin: true, followRedirects: false,
          rewrite: path => path.replace(/^\/ledger/, ""),
          configure(proxy) {
            proxy.on("proxyReq", proxyRequest => { proxyRequest.setHeader("Authorization", `Bearer ${token}`); });
          },
        },
      },
    },
  };
}

export default defineConfig(async ({ command }) => {
  if (command !== "serve") throw new Error("The LocalNet config is for the loopback development server only. Use vite.config.ts for production builds.");
  const [app, script] = await Promise.all([
    readFile(new URL("../.omc/decman-localnet/app.json", import.meta.url), "utf8"),
    readFile(new URL("../.omc/decman-localnet/localnet.sh", import.meta.url), "utf8"),
  ]);
  return localnetConfig(localnetManifest(JSON.parse(app)), localnetToken(script), process.env.LOCALNET_LEDGER_ORIGIN ?? "http://127.0.0.1:13975");
});
