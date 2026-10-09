import { deployment, networkLabel } from "../ledger/deployment";
import type { Session } from "../ledger/session";
import type { DeskState } from "../ledger/symbolon";
import { PublicAccess } from "./PublicAccess";

export function Faucet({ session, state, connected, trading, busy, readError, onConnect, run }: {
  session: Session;
  state: DeskState | null;
  connected: boolean;
  trading: boolean;
  busy: boolean;
  readError?: string | null;
  onConnect(): void;
  run(label: string, action: () => Promise<string>): Promise<boolean>;
}) {
  const d = deployment();
  const configured = d.network === "devnet" && !!d.publicDesk;
  return <section className="terminal-faucet" aria-labelledby="faucet-title">
    <div className="terminal-page-heading"><div><h1 id="faucet-title">Faucet</h1><p>Get Symbolon demo assets to try fixed-rate financing on Canton DevNet.</p></div><span className="terminal-status">{networkLabel()}</span></div>
    <div className="faucet-sheet"><div className="faucet-grant"><h2>Symbolon demo assets per claim</h2>
      <div className="faucet-assets"><div><span>Collateral</span><strong>0.1 <small>cBTC-demo</small></strong></div><div><span>Cash</span><strong>5,000 <small>USDCx-demo</small></strong></div></div>
      <p className="muted">These simulated assets have no monetary value.</p>
    </div>
    {!configured ? <p className="empty-state">The public faucet is available on the configured DevNet deployment. {d.network === "localnet" ? "LocalNet uses seeded test balances." : "No real assets are issued here."}</p>
      : !connected ? <div className="faucet-connect"><p>Connect your account to receive test assets.</p><button className="seal" onClick={onConnect}>Connect</button></div>
      : !trading ? <p className="empty-state" role="status">Your account is connected in read-only mode. Faucet transactions are unavailable.</p>
      : readError ? <p className="empty-state" role="status">The ledger view is unavailable. Faucet transactions are paused until the connection recovers.</p>
      : session.party === d.publicDesk!.operator ? <p className="empty-state">This is the faucet operator account. Use a borrower or lender account to claim test assets.</p>
      : !state ? <p className="empty-state" role="status">Reading your account…</p>
      : <PublicAccess session={session} state={state} busy={busy} run={run}/>}
    </div>
  </section>;
}
