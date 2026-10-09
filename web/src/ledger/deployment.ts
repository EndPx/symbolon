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
  network: "localnet" | "devnet" | "testnet" | "mainnet";
  walletNetwork: string;
  participant: string | null;
  synchronizerId: string | null;
  corePackageId: string | null;
  tradingEnabled: boolean;
  releaseEvidence: string | null;
  publicPackageId?: string | null;
  publicDesk?: {
    contractId: string; createdEventBlob: string; operator: string; label: string;
    referencePrice: string; rate: string; maxPrincipal: string;
  } | null;
  assets: { collateral: AssetDeployment; cash: AssetDeployment };
}
export const normalizeNetwork = (value?: string) => {
  const name = value?.toLowerCase();
  if (name === "localnet") return "localnet";
  if (["devnet", "canton:da-devnet", "canton:devnet", "canton_network_dev"].includes(name ?? "")) return "devnet";
  if (["testnet", "canton:da-testnet", "canton:testnet", "canton_network_test"].includes(name ?? "")) return "testnet";
  if (["mainnet", "canton:da-mainnet", "canton:mainnet", "canton_network"].includes(name ?? "")) return "mainnet";
  return name;
};
export const networkLabel = (network: string = active.network): string =>
  (({ localnet: "LocalNet", devnet: "DevNet", testnet: "TestNet", mainnet: "MainNet" } as Record<string, string>)[normalizeNetwork(network) ?? ""] ?? network);
export function walletConnectionError(error: unknown) {
  const mismatch = error as { actual?: unknown; expected?: unknown };
  if (typeof mismatch?.actual === "string" && typeof mismatch.expected === "string") {
    return `Your wallet is on Canton ${networkLabel(mismatch.actual)}. Symbolon is on Canton ${networkLabel(mismatch.expected)}. Switch the wallet to ${networkLabel(mismatch.expected)}, then reconnect.`;
  }
  return error instanceof Error ? error.message : "The wallet connection could not be completed. Open your wallet and try again.";
}
const packageHash = /^[a-f0-9]{64}$/;
export function parseDeployment(value: unknown): Deployment {
  if (!value || typeof value !== "object") throw new Error("Missing deployment configuration.");
  const d = value as Deployment;
  const allowed = ["schemaVersion", "network", "walletNetwork", "participant", "synchronizerId", "corePackageId", "tradingEnabled", "releaseEvidence", "assets", "publicPackageId", "publicDesk"];
  if (Object.keys(d).some(key => !allowed.includes(key))) throw new Error("Unexpected deployment field. Credentials must stay outside public configuration.");
  if (d.schemaVersion !== 1 || !["localnet", "devnet", "testnet", "mainnet"].includes(d.network)
    || normalizeNetwork(d.walletNetwork) !== d.network || typeof d.tradingEnabled !== "boolean") {
    throw new Error("Invalid deployment network or schema.");
  }
  for (const field of ["participant", "synchronizerId", "corePackageId", "releaseEvidence"] as const) {
    if (d[field] !== null && (typeof d[field] !== "string" || !d[field]?.trim())) throw new Error(`Invalid ${field}.`);
  }
  if (d.corePackageId !== null && !packageHash.test(d.corePackageId)) throw new Error("Invalid core package ID.");
  if (d.publicPackageId != null && !packageHash.test(d.publicPackageId)) throw new Error("Invalid public access package ID.");
  if (d.network === "localnet" && (d.participant !== null || d.tradingEnabled || d.publicDesk != null || d.publicPackageId != null)) {
    throw new Error("LocalNet must use the development proxy with remote signing disabled.");
  }
  if (d.network === "testnet" && d.publicDesk != null) throw new Error("TestNet cannot reuse the public DevNet demo desk.");
  if (Object.keys(d.assets ?? {}).some(key => !["collateral", "cash"].includes(key))) throw new Error("Unexpected deployment asset field.");
  if (d.publicDesk != null) {
    const p = d.publicDesk;
    if (!d.publicPackageId || !d.synchronizerId || !p.operator?.includes("::")
      || typeof p.contractId !== "string" || !p.contractId || typeof p.createdEventBlob !== "string" || !p.createdEventBlob
      || typeof p.label !== "string" || !p.label || !(Number(p.referencePrice) > 0)
      || !(Number(p.rate) >= 0 && Number(p.rate) <= 1) || !(Number(p.maxPrincipal) > 0 && Number(p.maxPrincipal) <= 10000)
      || Object.keys(p).some(key => !["contractId", "createdEventBlob", "operator", "label", "referencePrice", "rate", "maxPrincipal"].includes(key))) {
      throw new Error("Invalid public desk disclosure or policy.");
    }
    if (Object.values(d.assets).some(a => a.admin !== p.operator)) throw new Error("The public desk must match both asset administrators.");
  }
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
    if (d.network === "localnet" && a.adapter !== "demo-holding") throw new Error("LocalNet supports demo holdings only.");
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
  if (d.network === "localnet") return "LocalNet uses the development party picker. Remote wallet and hosted-account signing are disabled.";
  if (normalizeNetwork(network) !== d.network) return `This deployment uses ${d.network}. Connect a wallet on that network.`;
  if (d.network === "testnet") return "TestNet financing is not enabled yet. Verify the Symbolon packages, token adapters and settlement on the wallet participants first.";
  if (!d.tradingEnabled) return `${networkLabel(d.network)} trading is disabled in this deployment configuration.`;
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
