import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Contract } from "../ledger/api";
import {
  browseSession,
  canTrade,
  connectWallet,
  listWalletOptions,
  publicReadParty,
  walletNetwork,
  type Session,
  type WalletOption,
} from "../ledger/session";
import {
  balanceOf,
  cureDeadline,
  cureLeft,
  fmtDuration,
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

/**
 * Asks the shell to open the wallet picker. Every panel needs it and none of
 * them owns it, which is what context is for.
 */
const AskConnect = createContext<() => void>(() => {});

/** Runs an action, surfaces whatever the ledger says, then refreshes. */
function useRunner(refresh: () => Promise<void>, s: Session) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const askConnect = useContext(AskConnect);

  const run = async (what: string, fn: () => Promise<unknown>) => {
    // Browsing has no keys, so stop before the action reads anything and
    // fails somewhere less obvious. Every write in the app comes through
    // here, which is why this one check is enough to hold the whole line.
    if (!canTrade(s)) {
      setNote({ ok: false, text: "Connect a wallet to trade." });
      askConnect();
      return;
    }
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

/**
 * The wallet picker. No preamble: someone opening a Canton dApp already knows
 * what connecting a wallet is for, and a paragraph explaining it reads as
 * doubt about who is here. Wallets load on open so the list IS the screen.
 */
function ConnectScreen({
  onSession,
  onCancel,
}: {
  onSession: (s: Session) => void;
  onCancel?: () => void;
}) {
  const [wallets, setWallets] = useState<WalletOption[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setWallets(await listWalletOptions());
      } catch (e) {
        setWallets([]);
        setError((e as Error).message);
      }
    })();
  }, []);

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
    <div className="connect" role="dialog" aria-label="Connect wallet">
      <div className="connect-card">
        <div className="connect-top">
          <h1>Connect wallet</h1>
          {onCancel && (
            <button className="x" onClick={onCancel} aria-label="Close">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path
                  d="M3 3l10 10M13 3L3 13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>
            </button>
          )}
        </div>

        <ul className="wallet-list">
          {wallets === null &&
            [0, 1, 2].map((i) => (
              <li key={i} className="wallet-row skeleton">
                <span className="wallet-mark" />
                <span className="sk-line" />
              </li>
            ))}
          {wallets?.map((w) => (
            <li key={w.id}>
              <button
                className="wallet-row"
                onClick={() => pickWallet(w.id)}
                disabled={busy !== null}
              >
                <WalletMark wallet={w} />
                <span className="wallet-name">{w.name}</span>
                {busy === w.id ? (
                  <span className="wallet-note">connecting</span>
                ) : (
                  <svg
                    className="wallet-go"
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                    aria-hidden="true"
                  >
                    <path
                      d="M6 3l5 5-5 5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                  </svg>
                )}
              </button>
            </li>
          ))}
          {wallets?.length === 0 && (
            <li className="muted pad">No Canton wallet in this browser.</li>
          )}
        </ul>

        {error && <p className="err">{error}</p>}
        <p className="net-note">
          network <code>{walletNetwork()}</code>
        </p>
      </div>
    </div>
  );
}

/**
 * A wallet's own mark when it ships one, and a monogram in our own hand when
 * it does not - so the list never has a ragged hole where a logo should be.
 */
function WalletMark({ wallet }: { wallet: WalletOption }) {
  const [broken, setBroken] = useState(false);
  if (wallet.icon && !broken) {
    return (
      <img
        className="wallet-mark"
        src={wallet.icon}
        alt=""
        width={28}
        height={28}
        onError={() => setBroken(true)}
      />
    );
  }
  return <span className="wallet-mark mono">{wallet.name.slice(0, 2)}</span>;
}

/** The cash leg. One instrument today, named once so it reads as a decision. */
const CASH = "CUSD";

/** Section label inside a panel. Not a heading — it names one control group. */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="field-label">{children}</div>;
}

/**
 * A choice between a few named options. Presets instead of a number field:
 * the desk has house terms, and typing 1.05 is not a decision anyone enjoys
 * making from scratch.
 */
function ChipRow<T extends number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; note?: string }[];
}) {
  return (
    <div className="chip-row">
      {options.map((o) => (
        <button
          key={o.value}
          className={`chip${o.value === value ? " on" : ""}`}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.note && <span className="chip-note">{o.note}</span>}
        </button>
      ))}
    </div>
  );
}

/** One line of a term sheet: what it is called, and what it comes to. */
function TicketRow({
  label,
  gold,
  children,
}: {
  label: string;
  gold?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="ticket-row">
      <span>{label}</span>
      <span className={gold ? "tr-val gold" : "tr-val"}>{children}</span>
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
        <div
          className={`health-fill ${tone}`}
          style={{ transform: `scaleX(${pct})` }}
        />
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
  const { busy, note, run } = useRunner(refresh, s);
  const instruments = useMemo(
    () => [...new Set(st.feeds.map((f) => f.payload.instrument))],
    [st.feeds],
  );
  const dealers = useMemo(
    () => (st.feeds[0]?.payload.readers ?? []).filter((p) => p !== s.party),
    [st.feeds, s.party],
  );
  const oracle = st.feeds[0]?.payload.oracle ?? "";

  const [collateral, setCollateral] = useState("");
  const [borrow, setBorrow] = useState(0);
  // Cushion, tenor and the rest are chosen from named presets rather than
  // typed. The borrower is deciding how much risk to carry, not filling in a
  // form, and a number field asks them to know the answer before they start.
  const [cushion, setCushion] = useState(1.5);
  const [term, setTerm] = useState(30);
  const [advanced, setAdvanced] = useState(false);
  const [threshold, setThreshold] = useState(1.05);
  // How long the borrower gets to cure a call before the lender may seize.
  // A real negotiated term, not a constant - an hour is only the usual answer.
  const [cure, setCure] = useState(60);
  const [picked, setPicked] = useState<string[]>([]);

  // Only assets they actually hold, and only ones the oracle marks - you
  // cannot pledge what has no agreed price.
  const pledgeable = useMemo(
    () =>
      instruments
        .filter((i) => i !== CASH)
        .map((i) => ({
          instrument: i,
          balance: balanceOf(st.holdings, s.party, i),
          price: priceOf(st.feeds, i),
        }))
        .filter((a) => a.price !== undefined),
    [instruments, st.holdings, st.feeds, s.party],
  );

  const chosen = pledgeable.find((a) => a.instrument === collateral);
  const price = chosen?.price ?? 0;
  const maxBorrow = chosen ? (chosen.balance * price) / cushion : 0;
  const pledge = price ? (borrow * cushion) / price : 0;
  const calledAt = borrow * threshold;

  useEffect(() => {
    if (!collateral && pledgeable.length) {
      const best = [...pledgeable].sort(
        (a, b) => b.balance * (b.price ?? 0) - a.balance * (a.price ?? 0),
      )[0];
      setCollateral(best.instrument);
    }
  }, [collateral, pledgeable]);

  // Changing asset or cushion moves the ceiling; an amount above it would be
  // a request no dealer could fund.
  useEffect(() => {
    setBorrow((b) => Math.min(b, Math.floor(maxBorrow * 100) / 100));
  }, [maxBorrow]);

  useEffect(() => {
    if (picked.length === 0 && dealers.length) setPicked(dealers);
  }, [dealers, picked.length]);

  const myRequests = st.requests.filter((r) => r.payload.borrower === s.party);
  const myQuotes = st.quotes.filter((q) => q.payload.borrower === s.party);
  const ready = borrow > 0 && pledge > 0 && picked.length > 0;

  return (
    <>
      <section className="panel">
        <h2>Your balances</h2>
        <Balances st={st} party={s.party} />
      </section>

      <section className="panel">
        <h2>Ask for a rate</h2>

        <FieldLabel>Pledge</FieldLabel>
        {pledgeable.length === 0 ? (
          <p className="muted">Nothing here the oracle marks a price for.</p>
        ) : (
          <div className="asset-tiles">
            {pledgeable.map((a) => (
              <button
                key={a.instrument}
                className={`asset-tile${a.instrument === collateral ? " on" : ""}`}
                onClick={() => setCollateral(a.instrument)}
                aria-pressed={a.instrument === collateral}
              >
                <span className="asset-sym">{a.instrument}</span>
                <span className="asset-bal">{fmtAmount(a.balance, 4)}</span>
                <span className="asset-mark">
                  {fmtAmount(a.price ?? 0)} {CASH}
                </span>
              </button>
            ))}
          </div>
        )}

        <FieldLabel>Borrow</FieldLabel>
        <div className="dial">
          <div className="dial-head">
            <input
              className="dial-amt"
              inputMode="decimal"
              value={borrow ? String(borrow) : ""}
              placeholder="0"
              onChange={(e) => {
                const v = Number(e.target.value.replace(/[^0-9.]/g, ""));
                setBorrow(Number.isFinite(v) ? Math.min(v, maxBorrow) : 0);
              }}
            />
            <span className="dial-unit">{CASH}</span>
            <div className="dial-chips">
              {[0.25, 0.5, 1].map((f) => (
                <button
                  key={f}
                  className="chip sm"
                  onClick={() => setBorrow(Math.floor(maxBorrow * f * 100) / 100)}
                >
                  {f === 1 ? "Max" : `${f * 100}%`}
                </button>
              ))}
            </div>
          </div>
          <input
            className="dial-range"
            type="range"
            min={0}
            max={Math.max(1, Math.floor(maxBorrow * 100) / 100)}
            step={Math.max(0.01, Math.round(maxBorrow / 200))}
            value={borrow}
            onChange={(e) => setBorrow(Number(e.target.value))}
            aria-label={`Amount to borrow in ${CASH}`}
          />
          <div className="dial-foot">
            <span>0</span>
            <span>
              {fmtAmount(maxBorrow)} max at {(cushion * 100).toFixed(0)}% cover
            </span>
          </div>
        </div>

        <FieldLabel>Cushion</FieldLabel>
        <ChipRow
          value={cushion}
          onChange={setCushion}
          options={[
            { value: 2, label: "Safe", note: "200%" },
            { value: 1.5, label: "Balanced", note: "150%" },
            { value: 1.2, label: "Tight", note: "120%" },
          ]}
        />

        <FieldLabel>Tenor</FieldLabel>
        <ChipRow
          value={term}
          onChange={setTerm}
          options={[
            { value: 7, label: "7 days" },
            { value: 30, label: "30 days" },
            { value: 90, label: "90 days" },
          ]}
        />

        <div className="ticket-preview">
          <TicketRow label="You pledge">
            {fmtAmount(pledge, 4)} {collateral}
          </TicketRow>
          <TicketRow label="You receive" gold>
            {fmtAmount(borrow)} {CASH}
          </TicketRow>
          <TicketRow label="Called below">
            {(threshold * 100).toFixed(0)}% - {fmtAmount(calledAt)} {CASH}
          </TicketRow>
          <TicketRow label="Cure window">{fmtDuration(cure * 60)}</TicketRow>
        </div>

        <button
          className="disclose"
          onClick={() => setAdvanced((a) => !a)}
          aria-expanded={advanced}
        >
          {advanced ? "Hide" : "Show"} advanced terms
        </button>
        {advanced && (
          <div className="advanced">
            <FieldLabel>Margin threshold</FieldLabel>
            <ChipRow
              value={threshold}
              onChange={setThreshold}
              options={[
                { value: 1.05, label: "105%" },
                { value: 1.1, label: "110%" },
                { value: 1.2, label: "120%" },
              ]}
            />
            <FieldLabel>Cure window</FieldLabel>
            <ChipRow
              value={cure}
              onChange={setCure}
              options={[
                { value: 1, label: "1 min" },
                { value: 60, label: "1 hour" },
                { value: 1440, label: "24 hours" },
              ]}
            />
          </div>
        )}

        <FieldLabel>Send to</FieldLabel>
        <div className="chip-row">
          {dealers.map((d) => (
            <button
              key={d}
              className={`chip${picked.includes(d) ? " on" : ""}`}
              aria-pressed={picked.includes(d)}
              onClick={() =>
                setPicked((p) =>
                  p.includes(d) ? p.filter((x) => x !== d) : [...p, d],
                )
              }
            >
              {partyLabel(d)}
            </button>
          ))}
        </div>

        <button
          className="seal"
          disabled={busy || !ready}
          onClick={() =>
            run(`Sent to ${picked.length} lender(s)`, () =>
              act.requestQuotes(s, {
                dealers: picked,
                oracle,
                collateralInstrument: collateral,
                collateralAmount: Number(pledge.toFixed(4)),
                cashInstrument: CASH,
                cashAmount: Number(borrow.toFixed(2)),
                termDays: term,
                marginThresholdPct: threshold,
                cureSeconds: Math.max(1, Math.round(cure * 60)),
              }),
            )
          }
        >
          {busy
            ? "Sending..."
            : picked.length
              ? `Ask ${picked.length} dealer${picked.length > 1 ? "s" : ""} for a rate`
              : "Pick a dealer"}
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
              const need = num(q.payload.collateralAmount);
              const coll =
                balanceOf(
                  st.holdings,
                  s.party,
                  q.payload.collateralInstrument,
                ) >= need;
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
                          act.acceptQuote(
                            s,
                            q.contractId,
                            q.payload.collateralInstrument,
                            need,
                          ),
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
  const { busy, note, run } = useRunner(refresh, s);
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
                    {(num(r.payload.marginThresholdPct) * 100).toFixed(0)}% ·
                    cure {fmtDuration(num(r.payload.cureSeconds))}
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
  const { busy, note, run } = useRunner(refresh, s);
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
          const owed = num(pos.repurchasePrice);
          const cash =
            balanceOf(st.holdings, s.party, pos.cashInstrument) >= owed;
          const wanted = Number(topUps[p.contractId] ?? 0);
          const extra =
            wanted > 0 &&
            balanceOf(st.holdings, s.party, pos.collateralInstrument) >= wanted;
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
                  <dt>Cure window</dt>
                  <dd>{fmtDuration(num(pos.cureSeconds))}</dd>
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
                            pos.collateralInstrument,
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
                          act.repay(s, p.contractId, pos.cashInstrument, owed),
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
  const { busy, note, run } = useRunner(refresh, s);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const mine = st.feeds.filter((f) => f.payload.oracle === s.party);

  return (
    <section className="panel">
      <h2>Marks</h2>
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
  // Browsing is the default. Nobody should have to hand over a wallet to find
  // out what this is — the app opens, the marks load, and the connect step
  // arrives when there is finally something to sign.
  const [session, setSession] = useState<Session>(() => browseSession());
  const [connecting, setConnecting] = useState(false);
  const [tab, setTab] = useState<Tab>("borrow");
  const { state, error, refresh } = useDesk(session);
  const browsing = !canTrade(session);

  // The public tape needs a party to read as, and finding one is a round trip.
  // Until it lands the app is already up and simply has no marks yet.
  useEffect(() => {
    let live = true;
    void (async () => {
      const p = await publicReadParty();
      if (live && p) {
        setSession((cur) => (canTrade(cur) ? cur : browseSession(p)));
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const askConnect = useCallback(() => setConnecting(true), []);

  const onSession = (s: Session) => {
    setSession(s);
    setConnecting(false);
  };

  const disconnect = () => {
    void session.disconnect().then(async () => {
      setSession(browseSession(await publicReadParty()));
    });
  };

  const isOracle =
    !browsing && !!state?.feeds.some((f) => f.payload.oracle === session.party);
  const tabs: Tab[] = isOracle
    ? ["oracle", "positions"]
    : ["borrow", "lend", "positions"];
  const active = tabs.includes(tab) ? tab : tabs[0];

  return (
    <AskConnect.Provider value={askConnect}>
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
          {browsing ? (
            <div className="who">
              <span className="muted sm">Read-only</span>
              <button className="seal sm" onClick={askConnect}>
                Connect wallet
              </button>
            </div>
          ) : (
            <div className="who">
              <span className="who-label">{session.label}</span>
              <span className="muted sm">
                {session.kind === "wallet" ? session.wallet : "sandbox"}
              </span>
              <button className="ghost sm" onClick={disconnect}>
                Disconnect
              </button>
            </div>
          )}
        </header>

        <main className="desk-body">
          {browsing && <BrowseNotice st={state} />}
          {error && <p className="err">{error}</p>}
          {!state && !browsing && <p className="muted">Reading the ledger…</p>}
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

      {connecting && (
        <ConnectScreen
          onSession={onSession}
          onCancel={() => setConnecting(false)}
        />
      )}
    </AskConnect.Provider>
  );
}

/**
 * What a visitor is entitled to see, and why the rest is blank. The marks are
 * public because every margin check prices against them; the books are not,
 * and that is the ledger refusing, not the page hiding.
 */
function BrowseNotice({ st }: { st: DeskState | null }) {
  if (!st || st.feeds.length === 0) return null;
  return (
    <section className="marks-strip">
      <span className="marks-tag">Marks</span>
      {st.feeds.map((f) => (
        <span className="mark" key={f.contractId}>
          <span className="mark-sym">{f.payload.instrument}</span>
          <span className="mark-px">{fmtAmount(f.payload.price)}</span>
        </span>
      ))}
    </section>
  );
}
