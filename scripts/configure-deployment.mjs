/** Copy only public runtime configuration; never write credentials to the bundle.
 * Usage: node web/node_modules/tsx/dist/cli.mjs scripts/configure-deployment.mjs devnet
 * Add --dist to configure an already-built bundle without rebuilding it.
 */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parseDeployment, tradingBlocker } from "../web/src/ledger/deployment.ts";
const profile = process.argv[2];
if (!["devnet", "mainnet"].includes(profile) || process.argv.slice(3).some(arg => arg !== "--dist")) {
  throw new Error("Usage: configure-deployment.mjs devnet|mainnet [--dist]");
}
const source = new URL(`../config/deployments/${profile}.json`, import.meta.url);
const raw = await readFile(source, "utf8");
const deployment = parseDeployment(JSON.parse(raw));
if (deployment.network !== profile) throw new Error("Profile filename and network disagree.");
const reason = tradingBlocker(deployment.walletNetwork, deployment);
if (deployment.tradingEnabled && reason) throw new Error(`Cannot enable this deployment: ${reason}`);
const output = new URL(`../web/${process.argv.includes("--dist") ? "dist" : "public"}/deployment.json`, import.meta.url);
await mkdir(new URL("./", output), { recursive: true });
await writeFile(output, JSON.stringify(deployment, null, 2) + "\n");
process.stdout.write(`Configured ${profile}; trading ${deployment.tradingEnabled ? "enabled" : "disabled"}; config SHA256 ${createHash("sha256").update(raw).digest("hex")}\n`);
if (reason) process.stdout.write(`Status: ${reason}\n`);
