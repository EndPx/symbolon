import { SendProvider, type SendStatusResponse, type SendAccount } from "@partylayer/adapter-send";
import type { Session } from "./session";
import { CantonV2Client } from "./canton-v2";
import { LedgerError, parseResponse } from "./api";
import { deployment, normalizeNetwork } from "./deployment";
import { requireTradingRelease } from "./release";

type Provider = Pick<SendProvider, "status" | "getPrimaryAccount" | "ledgerApi" | "prepareExecuteAndWait">;
export function verifySendIdentity(status: SendStatusResponse, account: SendAccount, party: string, network: string) {
  if (!(status.connection?.isConnected ?? status.isConnected)) throw new LedgerError("Send's connection permission expired. Reconnect your wallet.");
  if (status.isNetworkConnected === false) throw new LedgerError("Send is not connected to its Canton network. Open the wallet and finish network setup.");
  if (account.status !== "allocated") throw new LedgerError(`Send reports this party as ${account.status ?? "allocation status unavailable"}. Finish allocating it in the wallet before trading.`);
  if (account.disabled) throw new LedgerError("The selected Send account is disabled. Select an enabled wallet account.");
  if (account.partyId !== party || !party.includes("::")) throw new LedgerError("The Send primary party differs from the connected party. Reconnect to use the current wallet account.");
  const activeNetwork = status.network?.networkId ?? account.networkId;
  if (normalizeNetwork(activeNetwork) !== normalizeNetwork(network) || normalizeNetwork(account.networkId) !== normalizeNetwork(network)) {
    throw new LedgerError(`Send reports ${activeNetwork ?? "an unknown network"} (account: ${account.networkId ?? "unknown"}). Symbolon uses ${normalizeNetwork(network)}. Switch the wallet network and reconnect.`);
  }
}

/** Send owns signing; its Ledger API supplies the correlated committed receipt. */
export function attachSendLedger(session: Session, verifySession: () => Promise<void>, invalidate: (reason: string) => void,
  provider: Provider = new SendProvider(), d = deployment()) {
  if (!d.corePackageId || !d.synchronizerId || normalizeNetwork(session.networkId) !== d.network) throw new LedgerError("Send needs the configured Symbolon packages and synchronizer.");
  const bound = async () => {
    await verifySession();
    const [status, account] = await Promise.all([provider.status(), provider.getPrimaryAccount()]);
    await verifySession();
    try { verifySendIdentity(status, account, session.party, session.networkId!); }
    catch (error) { invalidate((error as Error).message); throw error; }
  };
  const client = new CantonV2Client({ party: session.party, corePackageId: d.corePackageId,
    ...(d.publicPackageId ? { publicPackageId: d.publicPackageId } : {}), synchronizerId: d.synchronizerId,
    store: typeof sessionStorage === "undefined" ? undefined : sessionStorage,
    request: async (method, resource, body) => {
      await bound();
      const result = await provider.ledgerApi({ requestMethod: method === "GET" ? "get" : "post", resource,
        ...(body === undefined ? {} : { body: body as Record<string, unknown> }) });
      await bound();
      return parseResponse(result.response);
    },
  });
  let readiness: Promise<unknown> | null = null;
  const ready = () => readiness ??= client.preflight().catch(error => { readiness = null; throw error; });
  session.read = async () => { await bound(); await ready(); return client.read(); };
  session.submit = async (commands, options) => {
    requireTradingRelease(session.networkId);
    await bound(); await ready();
    return client.submit(commands, options, async payload => { await bound(); return provider.prepareExecuteAndWait(payload); });
  };
  session.pendingCommand = () => client.pendingCommand();
  session.reconcilePending = () => client.reconcile();
  session.lastReceipt = () => client.lastReceipt;
  return session;
}
