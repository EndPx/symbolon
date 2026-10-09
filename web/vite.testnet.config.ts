import react from "@vitejs/plugin-react";
import { defineConfig, type UserConfig } from "vite";
import { readFile } from "node:fs/promises";
import { parseDeployment } from "./src/ledger/deployment";

/** Wallet connection rehearsal only; no sandbox proxy or signing credentials. */
export default defineConfig(({ command }) => {
  if (command !== "serve") throw new Error("Use the standard production build. This profile is a TestNet connection rehearsal.");
  const profile: UserConfig = {
    plugins: [react(), {
      name: "symbolon-testnet-connection",
      configureServer(server) {
        server.middlewares.use("/deployment.json", async (request, response) => {
          try {
            if (!["GET", "HEAD"].includes(request.method ?? "")) { response.statusCode = 405; response.end(); return; }
            const profile = parseDeployment(JSON.parse(await readFile(new URL("./public/deployment.testnet.json", import.meta.url), "utf8")));
            response.setHeader("Content-Type", "application/json");
            response.setHeader("Cache-Control", "no-store");
            response.end(request.method === "HEAD" ? "" : JSON.stringify(profile));
          } catch { response.statusCode = 500; response.end("TestNet connection profile unavailable."); }
        });
      },
    }],
    server: { host: "127.0.0.1", port: 5174, strictPort: true, cors: false },
  };
  return profile;
});
