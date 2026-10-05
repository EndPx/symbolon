import { readFile } from "node:fs/promises";
const record = JSON.parse(await readFile(new URL("../config/mainnet-release.json", import.meta.url), "utf8"));
const blocked = [];
if (record.releaseStatus !== "ready") blocked.push("release status is not ready");
if (!/^[a-f0-9]{64}$/.test(record.corePackageId ?? "")) blocked.push("reviewed core package ID");
if (!record.participant) blocked.push("verified MainNet participant");
for (const [role, asset] of Object.entries(record.assets)) {
  if (!asset.adapter || asset.adapter.toLowerCase().includes("demo")) blocked.push(`${role}: official token adapter`);
  if (!asset.admin || !asset.packageIds.length || !asset.verification) blocked.push(`${role}: verified admin, packages and transaction evidence`);
}
for (const [gate, result] of Object.entries(record.gates)) {
  if (!result.passed || !result.evidence) blocked.push(gate);
}
if (blocked.length) {
  process.stderr.write(`MainNet release BLOCKED (${blocked.length} unmet requirements)\n${blocked.map(item => `- ${item}`).join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("MainNet release record is complete. Verify the referenced evidence before enabling wallet signing.\n");
}
