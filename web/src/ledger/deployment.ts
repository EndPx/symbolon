/** Public, runtime deployment data. No bearer token or wallet key belongs here.
 * The bundle is identical across networks; the served JSON selects its target.
 */
export interface AssetDeployment {
  symbol: string;
  admin: string | null;
  adapter: "demo-holding" | "cip56";
  packageIds: string[];
}
export interface Deployment {
  schemaVersion: 1;
  network: "devnet" | "mainnet";
  walletNetwork: string;
  participant: string | null;
  synchronizerId: string | null;
  corePackageId: string | null;
  tradingEnabled: boolean;
  releaseEvidence: string | null;
  assets: { collateral: AssetDeployment; cash: AssetDeployment };
}
export const normalizeNetwork = (value?: string) => {
  const name = value?.toLowerCase();
  if (name === "devnet" || name === "canton:da-devnet") return "devnet";
  if (name === "mainnet" || name === "canton:da-mainnet") return "mainnet";
  return name;
};
const packageHash = /^[a-f0-9]{64}$/;
export function parseDeployment(value: unknown): Deployment {
  if (!value || typeof value !== "object") throw new Error("Missing deployment configuration.");
  const d = value as Deployment;
  const allowed = ["schemaVersion", "network", "walletNetwork", "participant", "synchronizerId", "corePackageId", "tradingEnabled", "releaseEvidence", "assets"];
  if (Object.keys(d).some(key => !allowed.includes(key))) throw new Error("Unexpected deployment field. Credentials must stay outside public configuration.");
  if (d.schemaVersion !== 1 || !["devnet", "mainnet"].includes(d.network)
    || normalizeNetwork(d.walletNetwork) !== d.network || typeof d.tradingEnabled !== "boolean") {
    throw new Error("Invalid deployment network or schema.");
  }
  for (const field of ["participant", "synchronizerId", "corePackageId", "releaseEvidence"] as const) {
    if (d[field] !== null && (typeof d[field] !== "string" || !d[field]?.trim())) throw new Error(`Invalid ${field}.`);
  }
  if (d.corePackageId !== null && !packageHash.test(d.corePackageId)) throw new Error("Invalid core package ID.");
  if (d.participant !== null) {
    const url = new URL(d.participant);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
      throw new Error("Remote participant must use HTTPS without embedded credentials.");
    }
  }
  for (const role of ["collateral", "cash"] as const) {
    const a = d.assets?.[role];
    if (!a || typeof a.symbol !== "string" || !a.symbol.trim() || !["demo-holding", "cip56"].includes(a.adapter)
      || (a.admin !== null && (typeof a.admin !== "string" || !a.admin.includes("::")))
      || !Array.isArray(a.packageIds) || a.packageIds.some(id => typeof id !== "string" || !packageHash.test(id))) {
      throw new Error(`Invalid ${role} asset identity.`);
    }
    if (Object.keys(a).some(key => !["symbol", "admin", "adapter", "packageIds"].includes(key))) throw new Error(`Unexpected ${role} asset field.`);
  }
  return d;
}
export const defaultDeployment: Deployment = {
  schemaVersion: 1, network: "devnet", walletNetwork: "devnet", participant: null,
  synchronizerId: null, corePackageId: null, tradingEnabled: false, releaseEvidence: null,
  assets: {
    collateral: { symbol: "cBTC", admin: null, adapter: "demo-holding", packageIds: [] },
    cash: { symbol: "USDCx", admin: null, adapter: "demo-holding", packageIds: [] },
  },
};
let active = defaultDeployment;
let failure: string | null = null;
export const deployment = () => active;
export const deploymentFailure = () => failure;
export async function loadDeployment() {
  // No environment-specific URL is compiled into the frontend.
  try {
    const response = await fetch("/deployment.json", { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Deployment configuration returned HTTP ${response.status}.`);
    active = parseDeployment(await response.json());
    failure = null;
  } catch (error) {
    active = defaultDeployment;
    failure = error instanceof Error ? error.message : "Deployment configuration unavailable.";
  }
}
export function tradingBlocker(network?: string, d = active): string | null {
  if (normalizeNetwork(network) !== d.network) return `This deployment uses ${d.network}. Connect a wallet on that network.`;
  if (!d.tradingEnabled) return `${d.network === "mainnet" ? "MainNet" : "DevNet"} trading is disabled in this deployment configuration.`;
  if (!d.corePackageId || !d.participant || !d.synchronizerId || !d.releaseEvidence) return "The deployment needs a pinned package, participant, synchronizer and release evidence.";
  // This release has only the trusted-issuer demo adapter. Configuration cannot
  // make a simulated Holding into a real cBTC/USDCx contract.
  for (const a of Object.values(d.assets)) {
    if (a.adapter !== "demo-holding") return "The CIP-56 adapter is not implemented in this release.";
    if (!a.admin || !a.packageIds.length) return "The asset administrator and packages must be verified before trading.";
  }
  if (d.network === "mainnet") return "MainNet trading is disabled for this release: demo holdings cannot settle real cBTC / USDCx. Verify the token adapters, oracle policy and closeout accounting on DevNet first.";
  return null;
}
export const templateReference = () => deployment().corePackageId ?? "#symbolon-v2";
export const deploymentSubmissionOptions = () => ({
  ...(active.synchronizerId ? { synchronizerId: active.synchronizerId } : {}),
  ...(active.corePackageId ? { packageIdSelectionPreference: [active.corePackageId] } : {}),
});
