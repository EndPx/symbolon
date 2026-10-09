export interface WalletBalance { id: string; symbol: string; name: string; balance: string; }
export interface WalletBalanceSnapshot { party: string; network: string; balances: WalletBalance[]; readAt: string; }

const networks: Record<string, string> = { devnet: "CANTON_NETWORK_DEV", testnet: "CANTON_NETWORK_TEST", mainnet: "CANTON_NETWORK" };
export function consoleBalanceNetwork(network: string): string {
  const value = networks[network];
  if (!value) throw new Error("Wallet balances are unavailable on this network.");
  return value;
}

export function consoleBalanceTokens(response: unknown, network: string): WalletBalance[] {
  if (!response || typeof response !== "object" || !("tokens" in response) || !Array.isArray(response.tokens)) throw new Error("The wallet did not return a token balance list.");
  const seen = new Set<string>();
  return response.tokens.map((token: unknown) => {
    if (!token || typeof token !== "object") throw new Error("The wallet returned an invalid token balance.");
    const t = token as Record<string, unknown>;
    if (t.network !== consoleBalanceNetwork(network) || typeof t.id !== "string" || !t.id.trim() || typeof t.symbol !== "string" || !t.symbol.trim()
      || typeof t.name !== "string" || typeof t.balance !== "string" || !/^\d+(?:\.\d{1,38})?$/.test(t.balance) || seen.has(t.id)) {
      throw new Error("The wallet returned an invalid, duplicate or different-network balance.");
    }
    seen.add(t.id);
    return { id: t.id, symbol: t.symbol, name: t.name, balance: t.balance };
  });
}

/** Recheck identity after the read so a changed wallet cannot publish old balances. */
export async function readBoundWalletBalances(identity: { party: string; network: string }, verify: () => Promise<unknown>, request: () => Promise<unknown>): Promise<WalletBalanceSnapshot> {
  await verify();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = await Promise.race([request(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("The wallet balance read timed out. Try Refresh balances.")), 15_000);
    })]);
    await verify();
    return { ...identity, balances: consoleBalanceTokens(response, identity.network), readAt: new Date().toISOString() };
  } finally { clearTimeout(timer); }
}
