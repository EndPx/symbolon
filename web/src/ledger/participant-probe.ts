import profile from "../../public/deployment.json";

export interface ParticipantProbe {
  checkedAt: string;
  checks: Array<{label: string; status: "passed" | "missing" | "unavailable"; detail: string}>;
}
export const symbolonCorePackage = profile.corePackageId;
export function probeError(error: unknown): string {
  const message = error instanceof Error ? error.message : (error as {message?: unknown})?.message;
  if (typeof message === "string" && /403.*Resource not allowed/i.test(message)) return "Wallet gateway denied this resource (HTTP 403).";
  if (typeof message === "string" && /Unknown or unsupported ledgerApi resource/i.test(message)) return "This resource is not exposed by the wallet's Ledger API.";
  return (typeof message === "string" ? message : "The wallet did not provide this capability.")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]").replace(/[\w-]{20,}\.[\w-]{20,}\.[\w-]{10,}/g, "[redacted]").slice(0, 300);
}
export async function probeParticipant(party: string, read: (resource: string) => Promise<unknown>, userId?: string): Promise<ParticipantProbe> {
  const checks: ParticipantProbe["checks"] = [];
  for (const [label, resource, describe] of [
    ["Ledger version", "/v2/version", (value: any) => typeof value?.version === "string" ? value.version : "Ledger responded."],
    ["Symbolon core package", "/v2/packages", (value: any) => {
      if (!Array.isArray(value?.packageIds) || !value.packageIds.every((id: unknown) => typeof id === "string")) throw new Error("Wallet returned no supported-package list.");
      return value.packageIds.includes(symbolonCorePackage) ? "Installed. Installation alone does not confirm vetting." : "Not installed on this participant.";
    }],
    ["Party synchronizers", `/v2/state/connected-synchronizers?party=${encodeURIComponent(party)}`, (value: any) => {
      if (!Array.isArray(value?.connectedSynchronizers)) throw new Error("Wallet returned no synchronizer list.");
      return `${value.connectedSynchronizers.length} connected. Wallet signing permissions require a separate check.`;
    }],
  ] as const) {
    try {
      const detail = describe(await read(resource));
      checks.push({label, status: label === "Symbolon core package" && detail.startsWith("Not installed") ? "missing" : "passed", detail});
    } catch (error) { checks.push({label, status: "unavailable", detail: probeError(error)}); }
  }
  if (userId) {
    try {
      const rights = await read("/v2/authenticated-user") as {rights?: Array<{kind?: {ParticipantAdmin?: unknown; IsParticipantAdmin?: unknown}}>; user?: {rights?: Array<{kind?: {ParticipantAdmin?: unknown;IsParticipantAdmin?: unknown}}>}};
      const list = rights.rights ?? rights.user?.rights;
      if (!Array.isArray(list)) throw new Error("The authenticated-user response did not include rights.");
      checks.push({label: "Own user administration rights", status: "passed", detail: list.some(right => !!(right.kind?.ParticipantAdmin ?? right.kind?.IsParticipantAdmin)) ? "Participant administrator right reported; an upload still needs its own result." : "No participant-administrator flag in this response."});
    } catch (error) { checks.push({label: "Own user administration rights", status: "unavailable", detail: probeError(error)}); }
  }
  return {checkedAt: new Date().toISOString(), checks};
}
