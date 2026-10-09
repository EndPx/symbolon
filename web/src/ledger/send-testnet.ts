import { createDiscoveryStore, type DiscoveredWallet } from "@sigilry/dapp/discovery";
import type { SpliceProvider } from "@sigilry/dapp/provider";
import type { Session } from "./session";
import { decodeActiveContracts, partyEventFormat } from "./canton-v2";
import { LedgerError, parseResponse } from "./api";
import { normalizeNetwork } from "./deployment";
import { partyLabel } from "./symbolon";
import { probeParticipant, probeError, symbolonCorePackage } from "./participant-probe";

const sendExtension = "ldmohiccoioolenadmogclhoklmanpgi";
export function isSendAnnouncement(wallet: DiscoveredWallet): boolean {
  return /\bsend\b/i.test(wallet.info.name) || /(^|\.)cantonwallet\.com$/.test(wallet.info.rdns);
}
export async function discoverSendTestnet(): Promise<DiscoveredWallet | null> {
  if (typeof window === "undefined") return null;
  const store = createDiscoveryStore();
  try {
    const immediate = store.getProviders().find(isSendAnnouncement);
    if (immediate) return immediate;
    return await new Promise(resolve => {
      const timer = setTimeout(() => { off(); resolve(null); }, 1200);
      const off = store.subscribe(wallets => {
        const match = wallets.find(isSendAnnouncement);
        if (match) { clearTimeout(timer); off(); resolve(match); }
      });
    });
  } finally { store.destroy(); }
}

export async function openSendTestnet(provider: SpliceProvider, interactive: boolean, forget: () => void): Promise<Session | null> {
  const first = await provider.request({method: "status"});
  if (first.provider.id !== sendExtension && !/send/i.test(first.provider.id)) throw new LedgerError("The selected provider is not Send.");
  // Permission can already be approved even when the legacy connect reply timed out.
  if (!first.connection.isConnected) {
    if (!interactive) return null;
    const permission = await provider.request({method: "connect"});
    if (!permission.isConnected) throw new LedgerError("Approve the Send connection in your wallet, then reconnect.");
  }
  const primaryAccount = async () => {
    const accounts = await provider.request({method:"listAccounts"});
    const primary = accounts.filter(account => account.primary);
    if (primary.length !== 1) throw new LedgerError("Select one primary Send TestNet account in your wallet.");
    return primary[0];
  };
  const account = await primaryAccount();
  if (!account.primary || account.status !== "allocated" || !account.partyId?.includes("::")) throw new LedgerError("Send needs an allocated primary TestNet party.");
  const party = account.partyId;
  let disposed = false, invalid: string | null = null;
  const listeners = new Set<(reason: string) => void>();
  const invalidate = (reason: string) => {
    if (disposed || invalid) return;
    invalid = reason; forget(); listeners.forEach(listener => listener(reason));
  };
  const bound = async () => {
    if (disposed || invalid) throw new LedgerError(invalid ?? "This Send session has closed.");
    const [status, network, active] = await Promise.all([
      provider.request({method: "status"}), provider.request({method: "getActiveNetwork"}), primaryAccount(),
    ]);
    if (!status.connection.isConnected || status.connection.isNetworkConnected === false
      || normalizeNetwork(network.networkId) !== "testnet" || normalizeNetwork(active.networkId) !== "testnet"
      || active.partyId !== party || active.status !== "allocated") {
      invalidate("Send changed party, network or connection. Reconnect on Canton TestNet.");
      throw new LedgerError(invalid!);
    }
    if (disposed || invalid) throw new LedgerError(invalid ?? "This Send session has closed.");
  };
  await bound();
  const accountsChanged = () => { void bound().catch(() => {}); };
  provider.on("accountsChanged", accountsChanged);
  const request = async (resource: string, body?: Record<string, unknown>) => {
    await bound();
    const result = await provider.request({method: "ledgerApi", params: {requestMethod: body ? "post" : "get", resource, ...(body ? {body} : {})}});
    await bound();
    // Current Sigilry returns raw JSON. Keep compatibility with envelope responses.
    return parseResponse(result && !Array.isArray(result) && "response" in result ? result.response : result);
  };
  return {
    kind: "wallet", party, label: partyLabel(party), wallet: "send", networkId: "testnet", ledgerRead: true,
    async read() {
      const end = await request("/v2/state/ledger-end") as {offset: number};
      if (!Number.isSafeInteger(end?.offset) || end.offset < 0) throw new LedgerError("Send returned no valid ledger offset.");
      return decodeActiveContracts(await request("/v2/state/active-contracts", {activeAtOffset: end.offset, eventFormat: partyEventFormat(party)}));
    },
    submit: async () => { throw new LedgerError("TestNet financing is not enabled yet. This wallet connection is read-only."); },
    async inspectParticipant() {
      await bound();
      const status = await provider.request({method: "status"});
      const result = await probeParticipant(party, resource => request(resource), status.session?.userId);
      await bound(); return result;
    },
    async tryInstallApplication() {
      const checks: Awaited<ReturnType<typeof probeParticipant>>["checks"] = [];
      try {
        await bound();
        const [status, network] = await Promise.all([provider.request({method: "status"}), provider.request({method: "getActiveNetwork"})]);
        await bound();
        const base = network.ledgerApi ?? status.network?.ledgerApi;
        const token = network.accessToken ?? status.network?.accessToken ?? status.session?.accessToken;
        if (!base || !token) throw new LedgerError("Send did not provide an authenticated binary DAR upload endpoint to this connection. Its JSON-only proxy cannot encode a DAR archive.");
        const endpoint = new URL(base);
        if (endpoint.protocol !== "https:" || endpoint.hostname !== "api-testnet.cantonwallet.com" || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw new LedgerError("The wallet upload endpoint is not the approved Send TestNet gateway.");
        const installed = await request("/v2/packages") as {packageIds?: string[]};
        if (installed.packageIds?.includes(symbolonCorePackage)) {
          checks.push({label:"DAR upload",status:"passed",detail:"The core package is already installed. No duplicate upload was sent; vetting remains separate."});
        } else {
          const syncs = await request(`/v2/state/connected-synchronizers?party=${encodeURIComponent(party)}`) as {connectedSynchronizers?: Array<{synchronizerId?: string}>};
          if (syncs.connectedSynchronizers?.length !== 1 || !syncs.connectedSynchronizers[0].synchronizerId) throw new LedgerError("A single verified wallet synchronizer is required before upload.");
          const archive = await fetch("/operator/symbolon-v2-0.2.0.dar", {credentials:"omit",cache:"no-store"});
          if (!archive.ok) throw new LedgerError("The reviewed Symbolon DAR is unavailable.");
          const bytes = await archive.arrayBuffer();
          const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),byte=>byte.toString(16).padStart(2,"0")).join("");
          if (digest !== "4d6cddabfcae5b364d0550832fb31471ac0dcfa9e134a8d7d1bcee2b22406602") throw new LedgerError("The DAR checksum differs from the reviewed build.");
          endpoint.pathname = endpoint.pathname.replace(/\/$/,"") + "/v2/packages";
          endpoint.search = new URLSearchParams({vetAllPackages:"true",synchronizerId:syncs.connectedSynchronizers[0].synchronizerId}).toString();
          await bound();
          const result = await fetch(endpoint, {method:"POST",credentials:"omit",redirect:"error",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/octet-stream"},body:bytes,signal:AbortSignal.timeout(45000)});
          checks.push({label:"DAR upload",status:result.ok?"passed":"unavailable",detail:result.ok?"Upload endpoint accepted the archive. Checking installed package; vetting was requested.":`Upload endpoint rejected the request (HTTP ${result.status}). No retry was sent.`});
          await bound();
          if (result.ok) {
            const after = await request("/v2/packages") as {packageIds?:string[]};
            checks.push({label:"Installed core after upload",status:after.packageIds?.includes(symbolonCorePackage)?"passed":"missing",detail:after.packageIds?.includes(symbolonCorePackage)?"Reviewed core package confirmed in this participant's package list.":"The core package was not confirmed; inspect the original upload before retrying."});
          }
        }
      } catch (error) { checks.push({label:"DAR upload",status:"unavailable",detail:probeError(error)}); }
      await bound(); return {checkedAt:new Date().toISOString(),checks};
    },
    onInvalidated(listener) { if (invalid) listener(invalid); else listeners.add(listener); return () => listeners.delete(listener); },
    dispose() { disposed = true; provider.removeListener("accountsChanged", accountsChanged); listeners.clear(); },
    async disconnect() { disposed = true; provider.removeListener("accountsChanged", accountsChanged); listeners.clear(); forget(); await provider.request({method: "disconnect"}); },
  };
}
