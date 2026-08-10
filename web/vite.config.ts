import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The dev proxy exists only for the local-sandbox path: a browser talking
// straight to `dpm sandbox` would be blocked by CORS, and the sandbox has no
// business growing CORS headers for us. Through a wallet there is no proxy and
// no origin problem — the wallet makes the call.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/ledger": {
        // 6874 by default: when the sandbox runs inside WSL its 6864 is bound
        // to that namespace's loopback and Windows cannot reach it, so a relay
        // republishes it. Override with LEDGER_ORIGIN when it is reachable.
        target: process.env.LEDGER_ORIGIN ?? "http://127.0.0.1:6874",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ledger/, ""),
      },
    },
  },
});
