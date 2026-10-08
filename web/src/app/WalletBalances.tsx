import { useEffect, useRef, useState } from "react";
import type { Session } from "../ledger/session";
import type { WalletBalanceSnapshot } from "../ledger/wallet-balances";
import { displayDecimal } from "./financing-display";

export function WalletBalances({ session: s, connect }: { session: Session; connect(): void }) {
  const [snapshot, setSnapshot] = useState<WalletBalanceSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const sequence = useRef(0);
  useEffect(() => {
    const request = ++sequence.current;
    setSnapshot(null); setError(null); setLoading(false);
    if (s.kind !== "wallet" || !s.walletBalances) return;
    setLoading(true);
    const off = s.onInvalidated?.(() => {
      sequence.current++; setSnapshot(null); setLoading(false); setError("The wallet account or network changed. Reconnect to read its balances.");
    });
    void s.walletBalances().then(result => {
      if (request !== sequence.current) return;
      if (result.party !== s.party || result.network !== s.networkId) throw new Error("Wallet identity changed during the balance read.");
      setSnapshot(result);
    }).catch(() => {
      if (request === sequence.current) setError("Unable to read wallet balances. Check your wallet connection and try again.");
    }).finally(() => { if (request === sequence.current) setLoading(false); });
    return () => { sequence.current++; off?.(); };
  }, [s, attempt]);
  return <section className="wallet-balances" aria-labelledby="wallet-balances-title">
    <header><div><h2 id="wallet-balances-title">Wallet balances</h2><p>{s.kind === "wallet" ? `${s.wallet ?? s.label} · Canton ${s.networkId ?? "network unavailable"}` : "Connect a Canton wallet to view its token balances."}</p></div>
      {s.kind === "wallet" && s.walletBalances ? <button type="button" className="ghost sm" disabled={loading} onClick={() => setAttempt(a => a + 1)}>{loading ? "Reading…" : "Refresh balances"}</button>
        : s.kind !== "wallet" && <button type="button" className="ghost sm" onClick={connect}>Connect wallet</button>}
    </header>
    {s.kind === "wallet" && !s.walletBalances && <p className="sm muted">This wallet connection does not expose token balances to Symbolon.</p>}
    {loading && <p role="status" className="sm muted">Reading balances from your wallet…</p>}
    {error && <p role="status" className="err">{error}</p>}
    {snapshot && <><div className="wallet-balance-list">{snapshot.balances.length ? snapshot.balances.map(token => <article key={token.id}><div><strong>{token.symbol}</strong><small>{token.name}</small></div><span className="figure" title={token.balance}>{displayDecimal(token.balance, 6)}</span></article>) : <p>No token balances returned by this wallet.</p>}</div>
      <p className="sm muted">Wallet-reported balances · read {new Date(snapshot.readAt).toLocaleTimeString()}. Shown separately from the demo holdings used for Symbolon financing.</p></>}
  </section>;
}
