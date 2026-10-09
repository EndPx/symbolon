import { useState } from "react";
import type { Session } from "../ledger/session";
import type { ParticipantProbe } from "../ledger/participant-probe";

export function ParticipantCheck({session}: {session: Session}) {
  const [busy, setBusy] = useState(false), [report, setReport] = useState<ParticipantProbe | null>(null), [error, setError] = useState<string | null>(null);
  if (!session.inspectParticipant) return null;
  const inspect = async (upload = false) => {
    setBusy(true); setReport(null); setError(null);
    try { setReport(await (upload ? session.tryInstallApplication!() : session.inspectParticipant!())); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The wallet participant check failed."); }
    finally { setBusy(false); }
  };
  return <section className="terms-disclosure" aria-label="Wallet participant compatibility"><h3>Check wallet participant</h3>
    <p className="sm">Check the ledger, installed Symbolon package and your party's synchronizer access. This does not sign a trade or upload a package.</p>
    <button className="ghost sm" disabled={busy} onClick={() => void inspect()}>{busy ? "Checking participant…" : "Check participant access"}</button>
    {session.tryInstallApplication && <><p className="sm">The reviewed application DAR can be uploaded only if this wallet provides an authorized binary upload channel. This installs code; it does not move tokens.</p><button className="ghost sm" disabled={busy} onClick={() => void inspect(true)}>Try application DAR upload</button></>}
    {error && <p className="err" role="alert">{error}</p>}
    {report && <><dl className="review-terms">{report.checks.map(check => <div key={check.label}><dt>{check.label}</dt><dd>{check.status === "passed" ? "Read succeeded" : check.status === "missing" ? "Missing" : "Unavailable"} · {check.detail}</dd></div>)}</dl><p className="sm muted">Checked {new Date(report.checkedAt).toLocaleTimeString()}. Installed package status is separate from vetting and token compatibility.</p></>}
  </section>;
}
