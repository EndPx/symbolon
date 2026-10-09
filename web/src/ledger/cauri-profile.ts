import { createCauriAdapter } from "@lithiumdigital/cauri-dapp-sdk";
import { normalizeNetwork, type Deployment } from "./deployment";

/** Official SDK profile staged for the invitation-based DevNet rehearsal. */
export const CAURI_DEVNET = Object.freeze({
  apiBase: "https://api.devnet.cauri.cc",
  walletUiBase: "https://devnet.cauri.cc",
});

export function cauriReadinessProfile(d: Deployment) {
  if (d.network !== "devnet" || normalizeNetwork(d.walletNetwork) !== "devnet") throw new Error("The staged Cauri integration is for Canton DevNet only.");
  if (!d.corePackageId || !d.publicPackageId || !d.synchronizerId || !d.publicDesk?.contractId) throw new Error("Publish the pinned Symbolon core/access packages and public desk before a Cauri rehearsal.");
  return { ...CAURI_DEVNET, network: "devnet" as const, synchronizerId: d.synchronizerId,
    requiredPackages: [d.corePackageId, d.publicPackageId],
    publicDeskId: d.publicDesk.contractId, nativeSubmissionMethod: "prepareExecuteAndWait" as const };
}

export function createStagedCauriAdapter(d: Deployment) {
  cauriReadinessProfile(d);
  return createCauriAdapter(CAURI_DEVNET);
}
