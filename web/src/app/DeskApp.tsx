import { useCallback, useEffect, useMemo, useState } from "react";
import type { Contract } from "../ledger/api";
import {
  connectSandbox,
  connectWallet,
  listSandboxParties,
  listWalletOptions,
  sandboxAvailable,
  walletNetwork,
  type Session,
  type WalletOption,
} from "../ledger/session";
import {
  cureDeadline,
  cureLeft,
  daysUntil,
  deskState,
  feedFor,
  fmtAmount,
  health,
  isUnderCall,
  num,
  partyLabel,
  priceOf,
  type DeskState,
  type PriceFeed,
  type RepoPosition,
} from "../ledger/symbolon";
import * as act from "./actions";
import { pickHolding } from "./actions";

function useDesk(session: Session | null) {
  const [state, setState] = useState<DeskState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) return;
    try {
      setState(deskState(await session.read()));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [session]);

  useEffect(() => {
    void refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  return { state, error, refresh };
}

/** Runs an action, surfaces whatever the ledger says, then refreshes. */
function useRunner(refresh: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async (what: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    setNote(null);
    try {
      await fn();
      setNote({ ok: true, text: `${what} — settled on the ledger.` });
      await refresh();
    } catch (e) {
      setNote({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return { busy, note, run };
}

function ConnectScreen({ onSession }: { onSession: (s: Session) => void }) {
  const [wallets, setWallets] = useState<WalletOption[] | null>(null);
  const [parties, setParties] = useState<string[]>([]);
  const [hasSandbox, setHasSandbox] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const ok = await sandboxAvailable();
      setHasSandbox(ok);
      if (ok) setParties(await listSandboxParties());
    })();
  }, []);

  const loadWallets = async () => {
    setBusy("wallets");
    setError(null);
    try {
      setWallets(await listWalletOptions());
    } catch (e) {
      setError(
        `Wallet discovery failed: ${(e as Error).message}. The sandbox route below still works.`,
      );
    } finally {
      setBusy(null);
    }
  };

  const pickWallet = async (id?: string) => {
    setBusy(id ?? "any");
    setError(null);
    try {
      onSession(await connectWallet(id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="connect">
      <div className="connect-card">
        <img src="/brand/logo-mark.png" alt="" width={44} height={44} />
        <h1>Open the app</h1>
        <p className="connect-lede">
          Your Canton wallet holds your keys and signs every command. Symbolon
          never takes custody and never sees another party's book.
        </p>

        <button
          className="seal wide"
          onClick={() => (wallets ? pickWallet() : loadWallets())}
          disabled={busy !== null}
        >
          {busy ? "Connecting…" : wallets ? "Connect a wallet" : "Connect wallet"}
        </button>

        {wallets && (
          <ul className="wallet-list">
            {wallets.map((w) => (
              <li key={w.id}>
                <button onClick={() => pickWallet(w.id)} disabled={busy !== null}>
                  <span>{w.name}</span>
                  <span className="muted">
                    {w.installed ? "detected" : "not installed"}
                  </span>
                </button>
              </li>
            ))}
            {wallets.length === 0 && (
              <li className="muted pad">
                No Canton wallet found in this browser.
              </li>
            )}
          </ul>
        )}

        <p className="net-note">
          Wallet network: <code>{walletNetwork()}</code>
        </p>

        {hasSandbox && (
          <>
            <div className="rule-label">or use the local sandbox</div>
            <ul className="wallet-list">
              {parties.map((p) => (
                <li key={p}>
                  <button onClick={() => onSession(connectSandbox(p))}>
                    <span>{partyLabel(p)}</span>
                    <span className="muted">local party</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {hasSandbox === false && !wallets && (
          <p className="net-note">
            Connect a wallet to trade. Symbolon holds no balances of its own —
            everything you see is read from your own party on the ledger.
          </p>
        )}

        {error && <p className="err">{error}</p>}
        <a className="quiet back" href="/">
          ← Back to the site
        </a>
      </div>
    </div>
  );
}

function Balances({ st, party }: { st: DeskState; party: string }) {
  const mine = st.holdings.filter((h) => h.payload.owner === party);
  const byInstrument = new Map<string, number>();
  for (const h of mine) {
    byInstrument.set(
      h.payload.instrument,
      (byInstrument.get(h.payload.instrument) ?? 0) + num(h.payload.amount),
    );
  }
  return (
    <div className="balances">
      {[...byInstrument.entries()].map(([sym, amt]) => (
        <div className="bal" key={sym}>
          <span className="bal-sym">{sym}</span>
          <span className="bal-amt">{fmtAmount(amt, 4)}</span>
        </div>
      ))}
      {byInstrument.size === 0 && <p className="muted">No holdings.</p>}
    </div>
  );
}

function HealthBar({ pos, st }: { pos: RepoPosition; st: DeskState }) {
  const h = health(pos, st.feeds);
  const pct = Math.max(0, Math.min(1.6, h.ratio)) / 1.6;
  const tone = !h.priceKnown ? "unknown" : h.healthy ? "ok" : "bad";
  return (
    <div className="health">
      <div className="health-track">
        <div className={`health-fill ${tone}`} style={{ width: `${pct * 100}%` }} />
        <div className="health-mark" style={{ left: `${(1 / 1.6) * 100}%` }} />
      </div>
      <div className="health-row">
        <span>
          {h.priceKnown ? `${(h.ratio * 100).toFixed(0)}% of required` : "no mark"}
        </span>
        <span className="muted">
          {fmtAmount(h.collateralValue)} / {fmtAmount(h.requiredValue)}{" "}
          {pos.cashInstrument}
        </span>
      </div>
    </div>
  );
}

function BorrowPanel({
  s,
  st,
  refresh,
}: {
  s: Session;
  st: DeskState;
  refresh: () => Promise<void>;
}) {
  const { busy, note, run } = useRunner(refresh);
  const instruments = useMemo(
    () => [...new Set(st.feeds.map((f) => f.payload.instrument))],
    [st.feeds],
  );
  const dealers = useMemo(
    () => (st.feeds[0]?.payload.readers ?? []).filter((p) => p !== s.party),
    [st.feeds, s.party],
  );
  const oracle = st.feeds[0]?.payload.oracle ?? "";

  const [collateral, setCollateral] = useState("CETH");
  const [collAmt, setCollAmt] = useState("15");
  const [cashAmt, setCashAmt] = useState("1000");
  const [term, setTerm] = useState("30");
  const [threshold, setThreshold] = useState("1.05");
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (picked.length === 0 && dealers.length) setPicked(dealers);
  }, [dealers, picked.length]);

  const myRequests = st.requests.filter((r) => r.payload.borrower === s.party);
  const myQuotes = st.quotes.filter((q) => q.payload.borrower === s.party);

  return (
    <>
      <section className="panel">
        <h2>Your balances</h2>
        <Balances st={st} party={s.party} />
      </section>

      <section className="panel">
        <h2>Ask for a rate</h2>
        <p className="panel-lede">
          Each lender receives a separate, private request. They cannot see who
          else you asked, or what anyone else quoted.
        </p>
        <div className="form-grid">
          <label>
            Collateral
            <select
              value={collateral}
              onChange={(e) => setCollateral(e.target.value)}
            >
              {instruments.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </label>
          <label>
            Amount
            <input value={collAmt} onChange={(e) => setCollAmt(e.target.value)} />
          </label>
          <label>
            Borrow (CUSD)
            <input value={cashAmt} onChange={(e) => setCashAmt(e.target.value)} />
          </label>
          <label>
            Days
            <input value={term} onChange={(e) => setTerm(e.target.value)} />
          </label>
          <label>
            Margin threshold
            <input
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </label>
        </div>

        <div className="dealer-picks">
          {dealers.map((d) => (
            <label key={d} className="chk">
              <input
                type="checkbox"
                checked={picked.includes(d)}
                onChange={(e) =>
                  setPicked((p) =>
                    e.target.checked ? [...p, d] : p.filter((x) => x !== d),
                  )
                }
              />
              {partyLabel(d)}
            </label>
          ))}
        </div>

        <button
          className="seal"
          disabled={busy || picked.length === 0}
          onClick={() =>
            run(`Sent to ${picked.length} lender(s)`, () =>
              act.requestQuotes(s, {
                dealers: picked,
                oracle,
                collateralInstrument: collateral,
                collateralAmount: Number(collAmt),
                cashInstrument: "CUSD",
                cashAmount: Number(cashAmt),
                termDays: Number(term),
                marginThresholdPct: Number(threshold),
                cureSeconds: 3600,
              }),
            )
          }
        >
          {busy ? "Sending…" : "Request rates"}
        </button>
        {note && <p className={note.ok ? "ok" : "err"}>{note.text}</p>}
      </section>

      <section className="panel">
        <h2>Quotes received</h2>
        {myQuotes.length === 0 && (
          <p className="muted">
            {myRequests.length
              ? `${myRequests.length} request(s) out, no replies yet.`
              : "Nothing outstanding."}
          </p>
        )}
        <div className="rows">
          {myQuotes
            .slice()
            .sort((a, b) => num(a.payload.rate) - num(b.payload.rate))
            .map((q, i) => {
              const coll = pickHolding(
                st.holdings,
                s.party,
                q.payload.collateralInstrument,
                num(q.payload.collateralAmount),
              );
              const expired = new Date(q.payload.validUntil) < new Date();
              return (
                <div
                  className={`row quote${i === 0 ? " best" : ""}`}
                  key={q.contractId}
                >
                  <div>
                    <strong>{partyLabel(q.payload.dealer)}</strong>
                    {i === 0 && <span className="tag">best</span>}
                    <div className="muted sm">
                      {fmtAmount(q.payload.collateralAmount, 4)}{" "}
                      {q.payload.collateralInstrument} for{" "}
                      {fmtAmount(q.payload.cashAmount)} CUSD ·{" "}
                      {q.payload.termDays}d
                    </div>
                  </div>
                  <div className="rate">
                    {(num(q.payload.rate) * 100).toFixed(2)}%
                  </div>
                  <div className="acts">
                    <button
                      className="seal sm"
                      disabled={busy || expired || !coll}
                      title={
                        expired
                          ? "This quote has expired"
                          : !coll
                            ? "Not enough collateral"
                            : ""
                      }
                      onClick={() =>
                        run("Struck", () =>
                          act.acceptQuote(s, q.contractId, coll!.contractId),
                        )
                      }
                    >
                      {expired ? "Expired" : "Accept"}
                    </button>
                    <button
                      className="ghost sm"
                      disabled={busy}
                      onClick={() =>
                        run("Declined", () => act.rejectQuote(s, q.contractId))
                      }
                    >
                      Pass
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </section>
    </>
  );
}

function LendPanel({
  s,
  st,
  refresh,
}: {
  s: Session;
  st: DeskState;
  refresh: () => Promise<void>;
}) {
  const { busy, note, run } = useRunner(refresh);
  const [rates, setRates] = useState<Record<string, string>>({});
  const incoming = st.requests.filter((r) => r.payload.dealer === s.party);
  const sent = st.quotes.filter((q) => q.payload.dealer === s.party);

  return (
    <>
      <section className="panel">
        <h2>Your balances</h2>
        <Balances st={st} party={s.party} />
      </section>

      <section className="panel">
        <h2>Requests for a rate</h2>
        {incoming.length === 0 && <p className="muted">Nothing in the book.</p>}
        <div className="rows">
          {incoming.map((r) => {
            const px = priceOf(st.feeds, r.payload.collateralInstrument);
            const cover = px
              ? (px * num(r.payload.collateralAmount)) /
                num(r.payload.cashAmount)
              : undefined;
            return (
              <div className="row" key={r.contractId}>
                <div>
                  <strong>{partyLabel(r.payload.borrower)}</strong>
                  <div className="muted sm">
                    wants {fmtAmount(r.payload.cashAmount)} CUSD against{" "}
                    {fmtAmount(r.payload.collateralAmount, 4)}{" "}
                    {r.payload.collateralInstrument} · {r.payload.termDays}d ·
                    margin{" "}
                    {(num(r.payload.marginThresholdPct) * 100).toFixed(0)}%
                    {cover !== undefined && (
                      <> · cover {(cover * 100).toFixed(0)}%</>
                    )}
                  </div>
                </div>
                <div className="quote-form">
                  <input
                    placeholder="rate %"
                    value={rates[r.contractId] ?? ""}
                    onChange={(e) =>
                      setRates((m) => ({ ...m, [r.contractId]: e.target.value }))
                    }
                  />
                  <button
                    className="seal sm"
                    disabled={busy || !rates[r.contractId]}
                    onClick={() =>
                      run("Quote sent", () =>
                        act.sendQuote(
                          s,
                          r.contractId,
                          r.payload.borrower,
                          r.payload.cashInstrument,
                          num(r.payload.cashAmount),
                          Number(rates[r.contractId]) / 100,
                          3600,
                        ),
                      )
                    }
                  >
                    Quote
                  </button>
                  <button
                    className="ghost sm"
                    disabled={busy}
                    onClick={() =>
                      run("Passed", () => act.passRequest(s, r.contractId))
                    }
                  >
                    Pass
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {note && <p className={note.ok ? "ok" : "err"}>{note.text}</p>}
      </section>

      {sent.length > 0 && (
        <section className="panel">
          <h2>Quotes you sent</h2>
          <div className="rows">
            {sent.map((q) => (
              <div className="row" key={q.contractId}>
                <div>
                  <strong>{partyLabel(q.payload.borrower)}</strong>
                  <div className="muted sm">
                    {fmtAmount(q.payload.cashAmount)} CUSD · funded and escrowed
                  </div>
                </div>
                <div className="rate">
                  {(num(q.payload.rate) * 100).toFixed(2)}%
                </div>
                <div className="acts muted sm">awaiting reply</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function PositionsPanel({
  s,
  st,
  refresh,
}: {
  s: Session;
  st: DeskState;
  refresh: () => Promise<void>;
}) {
  const { busy, note, run } = useRunner(refresh);
  const [topUps, setTopUps] = useState<Record<string, string>>({});
  const mine = st.positions.filter(
    (p) => p.payload.borrower === s.party || p.payload.dealer === s.party,
  );
  const proposals = st.proposals.filter((p) => p.payload.dealer === s.party);
  // The borrower's own outstanding swaps, so the position can say it is waiting
  // on the dealer instead of silently accepting a second identical proposal.
  const pendingSwap = new Map(
    st.proposals
      .filter((p) => p.payload.borrower === s.party)
      .map((p) => [p.payload.posCid, p.payload]),
  );

  return (
    <>
      {proposals.length > 0 && (
        <section className="panel">
          <h2>Substitution requests</h2>
          <div className="rows">
            {proposals.map((p) => (
              <div className="row" key={p.contractId}>
                <div>
                  <strong>{partyLabel(p.payload.borrower)}</strong>
                  <div className="muted sm">
                    wants to swap in {fmtAmount(p.payload.newQty, 2)}{" "}
                    {p.payload.newInstrument}
                  </div>
                </div>
                <div className="acts">
                  <button
                    className="seal sm"
                    disabled={busy}
                    onClick={() =>
                      run("Swapped", () => act.acceptSubstitution(s, p.contractId))
                    }
                  >
                    Accept
                  </button>
                  <button
                    className="ghost sm"
                    disabled={busy}
                    onClick={() =>
                      run("Declined", () =>
                        act.rejectSubstitution(s, p.contractId),
                      )
                    }
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <h2>Open positions</h2>
        {mine.length === 0 && <p className="muted">Nothing open.</p>}
        {note && <p className={note.ok ? "ok" : "err"}>{note.text}</p>}

        {mine.map((p) => {
          const pos = p.payload;
          const asBorrower = pos.borrower === s.party;
          const h = health(pos, st.feeds);
          const feed = feedFor(st.feeds, pos.collateralInstrument);
          const cash = pickHolding(
            st.holdings,
            s.party,
            pos.cashInstrument,
            num(pos.repurchasePrice),
          );
          const wanted = Number(topUps[p.contractId] ?? 0);
          const extra =
            wanted > 0
              ? pickHolding(
                  st.holdings,
                  s.party,
                  pos.collateralInstrument,
                  wanted,
                )
              : undefined;
          const deadline = cureDeadline(pos);
          const cureLapsed = deadline ? new Date(deadline) < new Date() : false;
          const swap = pendingSwap.get(p.contractId);

          return (
            <article className="position" key={p.contractId}>
              <header>
                <div>
                  <strong>
                    {fmtAmount(pos.collateralAmount, 4)}{" "}
                    {pos.collateralInstrument}
                  </strong>
                  <span className="muted"> pledged for </span>
                  <strong>{fmtAmount(pos.cashAmount)} CUSD</strong>
                </div>
                <div className="pos-meta">
                  <span className="rate">{(num(pos.rate) * 100).toFixed(2)}%</span>
                  <span className="muted sm">
                    {asBorrower
                      ? `to ${partyLabel(pos.dealer)}`
                      : `from ${partyLabel(pos.borrower)}`}
                  </span>
                </div>
              </header>

              <HealthBar pos={pos} st={st} />

              <dl className="terms">
                <div>
                  <dt>Repurchase price</dt>
                  <dd>{fmtAmount(pos.repurchasePrice)} CUSD</dd>
                </div>
                <div>
                  <dt>Matures</dt>
                  <dd>{daysUntil(pos.maturity)}d</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd className={isUnderCall(pos) ? "warn" : ""}>
                    {isUnderCall(pos)
                      ? cureLapsed
                        ? "cure window lapsed"
                        : `margin call — ${cureLeft(deadline!)} to cure`
                      : "active"}
                  </dd>
                </div>
              </dl>

              <div className="acts wrap">
                {asBorrower ? (
                  <>
                    <input
                      className="qty"
                      placeholder={`top up ${pos.collateralInstrument}`}
                      value={topUps[p.contractId] ?? ""}
                      onChange={(e) =>
                        setTopUps((m) => ({
                          ...m,
                          [p.contractId]: e.target.value,
                        }))
                      }
                    />
                    <button
                      className="ghost sm"
                      disabled={busy || !feed || !extra}
                      onClick={() =>
                        run("Topped up", () =>
                          act.topUp(
                            s,
                            p.contractId,
                            extra!.contractId,
                            wanted,
                            feed!.contractId,
                          ),
                        )
                      }
                    >
                      Top up
                    </button>
                    <button
                      className="ghost sm"
                      disabled={busy || swap !== undefined}
                      title={
                        swap
                          ? `Waiting on ${partyLabel(pos.dealer)} to accept ${fmtAmount(swap.newQty)} ${swap.newInstrument}`
                          : ""
                      }
                      onClick={() => {
                        const other = st.feeds.find(
                          (f) =>
                            f.payload.instrument !== pos.collateralInstrument &&
                            f.payload.instrument !== pos.cashInstrument,
                        );
                        if (!other) return;
                        const px = num(other.payload.price);
                        const qty = (h.requiredValue / px) * 1.02;
                        void run("Substitution proposed", () =>
                          act.proposeSubstitution(
                            s,
                            p.contractId,
                            pos.dealer,
                            other.payload.instrument,
                            Number(qty.toFixed(4)),
                            other.contractId,
                          ),
                        );
                      }}
                    >
                      {swap ? "Swap pending" : "Substitute"}
                    </button>
                    <button
                      className="seal sm"
                      disabled={busy || !cash}
                      title={cash ? "" : "Not enough CUSD to repurchase"}
                      onClick={() =>
                        run("Repaid", () =>
                          act.repay(s, p.contractId, cash!.contractId),
                        )
                      }
                    >
                      Repay {fmtAmount(pos.repurchasePrice)}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="ghost sm"
                      disabled={busy || !feed || h.healthy || isUnderCall(pos)}
                      title={
                        isUnderCall(pos)
                          ? "Already called — the cure window is running"
                          : h.healthy
                            ? "The ledger refuses a call on a healthy position"
                            : ""
                      }
                      onClick={() =>
                        run("Margin call issued", () =>
                          act.issueMarginCall(s, p.contractId, feed!.contractId),
                        )
                      }
                    >
                      Margin call
                    </button>
                    <button
                      className="ghost sm danger"
                      disabled={busy || !cureLapsed}
                      title={
                        cureLapsed ? "" : "Only after the cure window or maturity"
                      }
                      onClick={() =>
                        run("Defaulted", () => act.declareDefault(s, p.contractId))
                      }
                    >
                      Declare default
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {st.closed.length > 0 && (
        <section className="panel">
          <h2>Closed</h2>
          <div className="rows">
            {st.closed.map((c) => (
              <div className="row" key={c.contractId}>
                <div>
                  <strong>
                    {fmtAmount(c.payload.collateralAmount, 4)}{" "}
                    {c.payload.collateralInstrument}
                  </strong>
                  <div className="muted sm">
                    {partyLabel(c.payload.borrower)} ↔{" "}
                    {partyLabel(c.payload.dealer)}
                  </div>
                </div>
                <div
                  className={
                    c.payload.outcome.tag === "Repurchased" ? "ok" : "warn"
                  }
                >
                  {c.payload.outcome.tag}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function OraclePanel({
  s,
  st,
  refresh,
}: {
  s: Session;
  st: DeskState;
  refresh: () => Promise<void>;
}) {
  const { busy, note, run } = useRunner(refresh);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const mine = st.feeds.filter((f) => f.payload.oracle === s.party);

  return (
    <section className="panel">
      <h2>Marks</h2>
      <p className="panel-lede">
        Every margin check prices against these marks. Move one and the
        positions react — that is the whole risk engine, in public.
      </p>
      {mine.length === 0 && <p className="muted">This party publishes no feeds.</p>}
      <div className="rows">
        {mine.map((f: Contract<PriceFeed>) => (
          <div className="row" key={f.contractId}>
            <div>
              <strong>{f.payload.instrument}</strong>
              <div className="muted sm">
                now {fmtAmount(f.payload.price, 2)} CUSD
              </div>
            </div>
            <div className="quote-form">
              <input
                placeholder="new price"
                value={drafts[f.contractId] ?? ""}
                onChange={(e) =>
                  setDrafts((m) => ({ ...m, [f.contractId]: e.target.value }))
                }
              />
              <button
                className="seal sm"
                disabled={busy || !drafts[f.contractId]}
                onClick={() =>
                  run(`${f.payload.instrument} re-marked`, () =>
                    act.setPrice(s, f, Number(drafts[f.contractId])),
                  )
                }
              >
                Set
              </button>
            </div>
          </div>
        ))}
      </div>
      {note && <p className={note.ok ? "ok" : "err"}>{note.text}</p>}
    </section>
  );
}

type Tab = "borrow" | "lend" | "positions" | "oracle";

export default function DeskApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<Tab>("borrow");
  const { state, error, refresh } = useDesk(session);

  if (!session) return <ConnectScreen onSession={setSession} />;

  const isOracle = !!state?.feeds.some((f) => f.payload.oracle === session.party);
  const tabs: Tab[] = isOracle
    ? ["oracle", "positions"]
    : ["borrow", "lend", "positions"];
  const active = tabs.includes(tab) ? tab : tabs[0];

  return (
    <div className="desk">
      <header className="desk-head">
        <a className="brand" href="/">
          <img src="/brand/logo-mark.png" alt="" />
          <span>SYMBOLON</span>
        </a>
        <nav className="desk-tabs">
          {tabs.map((t) => (
            <button
              key={t}
              className={t === active ? "on" : ""}
              onClick={() => setTab(t)}
            >
              {t === "borrow"
                ? "Borrow"
                : t === "lend"
                  ? "Lend"
                  : t === "oracle"
                    ? "Marks"
                    : "Positions"}
            </button>
          ))}
        </nav>
        <div className="who">
          <span className="who-label">{session.label}</span>
          <span className="muted sm">
            {session.kind === "wallet" ? session.wallet : "sandbox"}
          </span>
          <button
            className="ghost sm"
            onClick={() => void session.disconnect().then(() => setSession(null))}
          >
            Disconnect
          </button>
        </div>
      </header>

      <main className="desk-body">
        {error && <p className="err">{error}</p>}
        {!state && <p className="muted">Reading the ledger…</p>}
        {state && active === "borrow" && (
          <BorrowPanel s={session} st={state} refresh={refresh} />
        )}
        {state && active === "lend" && (
          <LendPanel s={session} st={state} refresh={refresh} />
        )}
        {state && active === "positions" && (
          <PositionsPanel s={session} st={state} refresh={refresh} />
        )}
        {state && active === "oracle" && (
          <OraclePanel s={session} st={state} refresh={refresh} />
        )}
      </main>
    </div>
  );
}
