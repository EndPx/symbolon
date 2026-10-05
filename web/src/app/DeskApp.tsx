import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Contract } from "../ledger/api";
import {
  browseSession, canTrade, connectWallet, listWalletOptions, publicReadParty,
  walletNetwork, sandboxModeEnabled, listSandboxParties, connectSandbox,
  restoreSession, type Session, type WalletOption,
} from "../ledger/session";
import {
  balanceOf, cureDeadline, cureElapsed, cureLeft, deadlineElapsed, deskState, feedFor,
  fmtAmount, fmtDuration, fmtPct, fmtTime, health, isFresh, isUnderCall,
  num, partyLabel, repurchaseAmount, DEFAULT_PRICE_AGE_SECONDS,
  type DeskState, type PriceFeed, type RepoPosition, type RepoQuote,
  type QuoteRequest,
} from "../ledger/symbolon";
import * as act from "./actions";
import MarketOverview from "./MarketOverview";
import { deploymentFailure, tradingBlocker } from "../ledger/deployment";

function useDesk(session: Session) {
  const [state, setState] = useState<DeskState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [readAt, setReadAt] = useState<Date | null>(null);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const contracts = await session.read();
      if (sequence.current !== request) return;
      setState(deskState(contracts));
      setReadAt(new Date());
      setError(null);
    } catch (e) {
      if (sequence.current === request) setError((e as Error).message);
    }
  }, [session]);
  useEffect(() => {
    let running = false;
    const poll = async () => {
      if (running) return;
      running = true;
      try { await refresh(); }
      finally { running = false; }
    };
    void poll();
    const timer = window.setInterval(() => { void poll(); }, 4000);
    return () => { window.clearInterval(timer); sequence.current++; };
  }, [refresh]);
  return { state, error, refresh, readAt };
}

type Receipt = { phase: "pending" | "succeeded" | "failed"; label: string; detail?: string; updateId?: string };
type Transaction = { busy: boolean; run(label: string, action: () => Promise<string>): Promise<boolean> };
const Transactions = createContext<Transaction>({ busy: false, run: async () => false });

function Panel({ title, children, description, id }: { title: string; children: ReactNode; description?: string; id?: string }) {
  return <section className="panel" id={id}><h2>{title}</h2>{description && <p className="panel-lede">{description}</p>}{children}</section>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="desk-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function Term({ label, children }: { label: string; children: ReactNode }) {
  return <div className="ticket-row"><span>{label}</span><span className="tr-val">{children}</span></div>;
}

function Party({ party }: { party: string }) {
  return <span title={party} className="party-name">{partyLabel(party)}</span>;
}

function Dialog({ title, children, close, busy = false }: { title: string; children: ReactNode; close(): void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => { trigger?.focus(); };
  }, []);
  return <dialog ref={ref} className="desk-dialog" aria-labelledby={titleId}
    onCancel={(e) => { e.preventDefault(); if (!busy) close(); }}>
    <div className="dialog-heading"><h2 id={titleId}>{title}</h2>
      <button className="ghost sm" onClick={close} disabled={busy} aria-label={`Close ${title}`}>Close</button>
    </div>{children}
  </dialog>;
}

function ConnectDialog({ connected, close }: { connected(s: Session): void; close(): void }) {
  const [wallets, setWallets] = useState<WalletOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setWallets(null); setError(null);
    void listWalletOptions().then((w) => { if (active) setWallets(w); })
      .catch((e) => { if (active) { setWallets([]); setError(e.message); } });
    return () => { active = false; };
  }, [attempt]);
  const connect = async (id: string) => {
    setBusy(id); setError(null);
    try { connected(await connectWallet(id, id === "grofty" ? "mainnet" : walletNetwork())); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  };
  return <Dialog title="Connect a Canton wallet" close={close} busy={busy !== null}>
    <p className="panel-lede">Your wallet identifies your Canton Party ID and approves ledger actions on the configured development network. For a first look, <a href="/demo">try the guided walkthrough</a>.</p>
    {wallets === null && <p className="empty-state" role="status">Discovering wallets…</p>}
    <ul className="wallet-list">{wallets?.map((w) => <li key={w.id}>
      <button className="wallet-row" disabled={busy !== null || !w.installed || !!w.unavailableReason} onClick={() => void connect(w.id)}>
        <span className="wallet-mark mono">{w.name.slice(0, 2)}</span>
        <span className="wallet-name">{w.name}<small>{w.id === "grofty" ? `Canton MainNet · v${w.minimumVersion}+ required` : w.network ?? walletNetwork()}</small></span>
        <span className="wallet-note">{busy === w.id ? "Connecting…" : w.unavailableReason ? "Unavailable" : w.installed ? "Connect" : "Not found"}</span>
      </button></li>)}</ul>
    {wallets?.filter(w => w.unavailableReason).map(w => <p className="net-note" key={`${w.id}-reason`}>{w.name}: {w.unavailableReason}</p>)}
    {wallets?.length === 0 && <p className="empty-state">No supported wallet was discovered. Open your Canton wallet on the configured network, then retry.</p>}
    {error && <p className="err" role="alert">{error}</p>}
    <div className="acts"><button className="ghost sm" disabled={busy !== null} onClick={() => setAttempt((a) => a + 1)}>Retry discovery</button></div>
    <p className="net-note">Configured network: <code>{walletNetwork()}</code>. MainNet trading is disabled until the cBTC / USDCx token adapters and operator release checks are verified.</p>
  </Dialog>;
}

function Balances({ st, party }: { st: DeskState; party: string }) {
  const amounts = new Map<string, { instrument: string; issuer: string; available: number; locked: number }>();
  for (const { payload: h } of st.holdings.filter((h) => h.payload.owner === party)) {
    const key = `${h.issuer}/${h.instrument}`;
    const row = amounts.get(key) ?? { instrument: h.instrument, issuer: h.issuer, available: 0, locked: 0 };
    if (h.lockParties?.length === 0) row.available += num(h.amount);
    else row.locked += num(h.amount);
    amounts.set(key, row);
  }
  return <Panel title="Your holdings" description="Demo assets. Available amounts exclude reserved cash and locked collateral.">
    {amounts.size === 0 && <p className="empty-state">No holdings for this party. An issuer must provision demo assets before this party can trade.</p>}
    <div className="balance-list">{[...amounts].map(([key, row]) => <div className="balance-row" key={key}>
      <div><strong>{row.instrument}</strong><small>Issuer <Party party={row.issuer} /></small></div>
      <div><span className="bal-amt">{fmtAmount(row.available, 4)}</span><small>Available</small></div>
      <div><span className="bal-amt">{fmtAmount(row.locked, 4)}</span><small>Locked</small></div>
    </div>)}</div>
  </Panel>;
}

function QuoteReview({ quote, st, s, close }: { quote: Contract<RepoQuote>; st: DeskState; s: Session; close(): void }) {
  const { busy, run } = useContext(Transactions);
  const q = quote.payload;
  const feed = feedFor(st.feeds, q);
  const expired = Date.now() >= Date.parse(q.validUntil);
  const fresh = !!feed && isFresh(feed.payload, num(q.maxPriceAgeSeconds));
  const available = balanceOf(st.holdings, s.party, q.collateralInstrument, q.collateralIssuer);
  const covered = fresh && num(feed!.payload.price) * num(q.collateralAmount) >= num(q.cashAmount) * num(q.marginThresholdPct);
  const exists = st.quotes.some((x) => x.contractId === quote.contractId);
  const reason = !exists ? "This quote is no longer active. Refresh your book." : expired ? "This quote has expired. Ask the dealer for a new quote."
    : !fresh ? "A fresh mark from the agreed oracle is required." : !covered ? "The current mark does not meet the agreed margin threshold."
    : available < num(q.collateralAmount) ? "You do not have enough available collateral from the agreed issuer." : null;
  const accept = async () => {
    if (reason || !feed) return;
    if (await run("Repo settled", () => act.acceptQuote(s, quote, feed.contractId))) close();
  };
  return <Dialog title="Review repo settlement" close={close} busy={busy}>
    <p className="panel-lede">Acceptance transfers collateral title to the dealer and pays the purchase price to you in one ledger transaction.</p>
    <div className="review-terms">
      <Term label="Dealer"><Party party={q.dealer} /></Term>
      <Term label="Collateral">{fmtAmount(q.collateralAmount, 4)} {q.collateralInstrument}</Term>
      <Term label="Collateral issuer"><Party party={q.collateralIssuer} /></Term>
      <Term label="Purchase price">{fmtAmount(q.cashAmount)} {q.cashInstrument}</Term>
      <Term label="Cash issuer"><Party party={q.cashIssuer} /></Term>
      <Term label="Annualized rate">{fmtPct(num(q.rate))} · ACT/360</Term>
      <Term label="Tenor">{q.termDays} days from settlement</Term>
      <Term label="Repurchase price">{fmtAmount(repurchaseAmount(q), 10)} {q.cashInstrument}</Term>
      <Term label="Margin threshold">{fmtPct(num(q.marginThresholdPct), 0)}</Term>
      <Term label="Cure window">{fmtDuration(num(q.cureSeconds))}</Term>
      <Term label="Agreed oracle"><Party party={q.oracle} /></Term>
      <Term label="Maximum mark age">{fmtDuration(num(q.maxPriceAgeSeconds))}</Term>
      <Term label="Quote expires">{fmtTime(q.validUntil)}</Term>
    </div>
    <details className="party-detail"><summary>Verify full party IDs</summary>
      <p>Dealer<code>{q.dealer}</code></p><p>Collateral issuer<code>{q.collateralIssuer}</code></p>
      <p>Cash issuer<code>{q.cashIssuer}</code></p><p>Oracle<code>{q.oracle}</code></p>
    </details>
    <p className="decision-note">Early repurchase costs the full agreed repurchase price. There is no interest rebate. Demo assets and simulated marks apply.</p>
    {reason && <p className="err" role="status">{reason}</p>}
    <button className="seal" disabled={busy || !!reason} onClick={() => void accept()}>
      {busy ? "Awaiting ledger…" : "Accept and settle"}
    </button>
  </Dialog>;
}

function ReceivedQuotes({ s, st }: { s: Session; st: DeskState }) {
  const { busy, run } = useContext(Transactions);
  const [review, setReview] = useState<Contract<RepoQuote> | null>(null);
  const quotes = st.quotes.filter((q) => q.payload.borrower === s.party).sort((a, b) => num(a.payload.rate) - num(b.payload.rate));
  const requests = st.requests.filter((r) => r.payload.borrower === s.party);
  return <Panel id="private-quotes" title="Your private quotes" description="Each dealer prices your request separately. Review the full terms before settlement.">
    {!quotes.length && <p className="empty-state">{requests.length ? "Requests sent. Waiting for a dealer to quote." : "No outstanding quotes. Send a request to a dealer to begin."}</p>}
    {quotes.map((q) => <article className="rfq" key={q.contractId}>
      <div className="rfq-head"><strong><Party party={q.payload.dealer} /></strong><span className="rate">{fmtPct(num(q.payload.rate))}</span></div>
      <p className="sm muted">Annualized ACT/360 · {q.payload.termDays} days</p>
      <p>{fmtAmount(q.payload.cashAmount)} {q.payload.cashInstrument} against {fmtAmount(q.payload.collateralAmount, 4)} {q.payload.collateralInstrument}</p>
      <p className="sm muted">Expires {fmtTime(q.payload.validUntil)}</p>
      <div className="acts"><button className="seal sm" disabled={busy || Date.now() >= Date.parse(q.payload.validUntil)} onClick={() => setReview(q)}>
        {Date.now() >= Date.parse(q.payload.validUntil) ? "Expired" : "Review quote"}</button>
        <button className="ghost sm" disabled={busy} onClick={() => void run("Quote declined; dealer cash released", () => act.rejectQuote(s, q.contractId))}>Decline</button></div>
    </article>)}
    {!!requests.length && <div className="pending-requests"><h3>Awaiting a quote</h3>{requests.map((r) => <div className="row" key={r.contractId}>
      <span><Party party={r.payload.dealer} /> · {fmtAmount(r.payload.cashAmount)} {r.payload.cashInstrument}</span>
      <button className="ghost sm" disabled={busy} onClick={() => void run("Request withdrawn", () => act.withdrawRequest(s, r.contractId))}>Withdraw</button>
    </div>)}</div>}
    {review && <QuoteReview quote={review} st={st} s={s} close={() => setReview(null)} />}
  </Panel>;
}

const feedIdentity = (f: PriceFeed) => [f.oracle, f.instrumentIssuer, f.instrument, f.cashIssuer, f.cashInstrument].join("|");
function latestFeeds(feeds: Contract<PriceFeed>[]) {
  const unique = new Map<string, Contract<PriceFeed>>();
  for (const f of [...feeds].sort((a, b) => Date.parse(b.payload.asOf) - Date.parse(a.payload.asOf))) {
    if (!unique.has(feedIdentity(f.payload))) unique.set(feedIdentity(f.payload), f);
  }
  return [...unique.values()];
}

function BorrowRequest({ s, st, demoParties, initialPair }: { s: Session; st: DeskState; demoParties: string[]; initialPair: string }) {
  const { busy, run } = useContext(Transactions);
  const feeds = latestFeeds(st.feeds);
  const [chosen, setChosen] = useState("");
  useEffect(() => { if (initialPair) setChosen(initialPair); }, [initialPair]);
  const [amount, setAmount] = useState("");
  const [cushion, setCushion] = useState("150");
  const [term, setTerm] = useState("30");
  const [threshold, setThreshold] = useState("105");
  const [cure, setCure] = useState("60");
  const [maxAge, setMaxAge] = useState("60");
  const [dealersText, setDealersText] = useState("");
  const selected = feeds.find((f) => feedIdentity(f.payload) === chosen);
  const feed = selected?.payload;
  const purchase = Number(amount);
  const cover = Number(cushion) / 100;
  const margin = Number(threshold) / 100;
  const ageSeconds = Math.round(Number(maxAge) * 60);
  const fresh = !!feed && isFresh(feed, ageSeconds);
  // Round up to the contract's Numeric 10 scale so rounding cannot underfund cover.
  const pledge = feed && purchase > 0 ? Math.ceil(purchase * cover / num(feed.price) * 1e10) / 1e10 : 0;
  const available = feed ? balanceOf(st.holdings, s.party, feed.instrument, feed.instrumentIssuer) : 0;
  const entries = dealersText.split(/\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const pieces = line.split("|").map((x) => x.trim());
    return { name: pieces.length > 1 ? pieces[0] : partyLabel(line), party: pieces.at(-1)! };
  });
  const dealers = [...new Set(entries.map((d) => d.party))];
  const selectedDealers = new Set(dealers);
  const validParties = dealers.length > 0 && dealers.every((p) => p.includes("::") && p !== s.party);
  const validNumbers = purchase > 0 && Number.isFinite(purchase) && Number.isInteger(Number(term)) && Number(term) >= 1 && Number(term) <= 365 &&
    cover >= margin && margin >= 1 && margin <= 2 && Number(cure) >= 1 / 60 && Number(cure) <= 10080 && ageSeconds >= 1 && ageSeconds <= 86400;
  const ready = fresh && validNumbers && pledge <= available && validParties;
  return <Panel id="request-repo" title="Request repo quotes" description="Choose collateral, agree the risk terms, and address each dealer by party ID.">
    <form className="desk-form" onSubmit={(e) => {
      e.preventDefault();
      if (!ready || !feed) return;
      void run("Private quote requests submitted", () => act.requestQuotes(s, {
        dealers, oracle: feed.oracle, collateralIssuer: feed.instrumentIssuer,
        collateralInstrument: feed.instrument, collateralAmount: pledge,
        cashIssuer: feed.cashIssuer, cashInstrument: feed.cashInstrument, cashAmount: purchase,
        termDays: Number(term), marginThresholdPct: margin, cureSeconds: Math.round(Number(cure) * 60), maxPriceAgeSeconds: ageSeconds,
      }));
    }}>
      <Field label="Collateral and oracle"><select required value={chosen} onChange={(e) => setChosen(e.target.value)}>
        <option value="">Select an agreed price feed</option>{feeds.map(({ payload: f }) => <option key={feedIdentity(f)} value={feedIdentity(f)}>
          {f.instrument} / {f.cashInstrument} · {partyLabel(f.instrumentIssuer)} · {partyLabel(f.oracle)}
        </option>)}</select></Field>
      {!feeds.length && <p className="empty-state">No price feeds are visible to this party. The oracle must publish a feed that includes your party.</p>}
      {feed && <p className="sm muted">Available: {fmtAmount(available, 4)} {feed.instrument}. Simulated mark: {fmtAmount(feed.price)} {feed.cashInstrument}, published {fmtTime(feed.asOf)}.</p>}
      <Field label={`Purchase price${feed ? ` (${feed.cashInstrument})` : ""}`}><input type="number" required min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
      <div className="field-pair"><Field label="Initial cover (%)"><input type="number" min={threshold} step="1" required value={cushion} onChange={(e) => setCushion(e.target.value)} /></Field>
        <Field label="Tenor (days)" hint="1–365 days, from settlement"><input type="number" min="1" max="365" step="1" required value={term} onChange={(e) => setTerm(e.target.value)} /></Field></div>
      <details className="terms-disclosure"><summary>Margin and oracle terms</summary><div className="desk-form">
        <Field label="Margin threshold (%)"><input type="number" min="100" max="200" step="0.01" required value={threshold} onChange={(e) => setThreshold(e.target.value)} /></Field>
        <Field label="Cure window (minutes)"><input type="number" min="1" max="10080" step="1" required value={cure} onChange={(e) => setCure(e.target.value)} /></Field>
        <Field label="Maximum mark age (minutes)"><input type="number" min="1" max="1440" step="1" required value={maxAge} onChange={(e) => setMaxAge(e.target.value)} /></Field>
      </div></details>
      <Field label="Dealer party IDs" hint="One per line. Optional format: Dealer name | full party ID. This is your counterparty list, not a public directory.">
        <textarea aria-label="Dealer party IDs" rows={3} required spellCheck={false} placeholder="Dealer A | dealer-a::…" value={dealersText} onChange={(e) => setDealersText(e.target.value)} />
      </Field>
      {demoParties.some((p) => p.startsWith("dealer")) && <div className="chip-row" aria-label="Add a seeded demo dealer">{demoParties.filter((p) => p.startsWith("dealer") && p !== s.party).map((p) =>
        <button className="chip" type="button" key={p} disabled={selectedDealers.has(p)} onClick={() => setDealersText((text) => `${text}${text ? "\n" : ""}${partyLabel(p)} | ${p}`)}>Add {partyLabel(p)}</button>)}</div>}
      <div className="ticket-preview"><Term label="Collateral to transfer">{fmtAmount(pledge, 4)} {feed?.instrument ?? "—"}</Term>
        <Term label="Purchase price">{fmtAmount(purchase || 0)} {feed?.cashInstrument ?? "—"}</Term>
        <Term label="Cure window">{fmtDuration(Number(cure) * 60)}</Term></div>
      {selected && !fresh && <p className="err">The selected mark is stale or future-dated. Ask the oracle to publish a current mark.</p>}
      {pledge > available && <p className="err">The request needs more available collateral than this party holds.</p>}
      {!!dealersText && !validParties && <p className="err">Use full Canton party IDs containing “::”, and do not address a request to yourself.</p>}
      <button type="submit" className="seal" disabled={busy || !ready}>{busy ? "Awaiting ledger…" : `Request ${dealers.length || ""} private quote${dealers.length === 1 ? "" : "s"}`}</button>
    </form>
  </Panel>;
}

function DealerRequest({ request, s, st }: { request: Contract<QuoteRequest>; s: Session; st: DeskState }) {
  const { busy, run } = useContext(Transactions);
  const [rate, setRate] = useState("");
  const [validity, setValidity] = useState("60");
  const r = request.payload;
  const funded = balanceOf(st.holdings, s.party, r.cashInstrument, r.cashIssuer) >= num(r.cashAmount);
  const valid = rate !== "" && Number.isFinite(Number(rate)) && Number(rate) >= 0 && Number(rate) <= 100 && Number(validity) >= 1 && Number(validity) <= 1440;
  return <article className="rfq"><div className="rfq-head"><strong><Party party={r.borrower} /></strong><span className="sm">{r.termDays} days</span></div>
    <dl className="rfq-terms"><div><dt>Purchase price</dt><dd>{fmtAmount(r.cashAmount)} {r.cashInstrument}</dd></div><div><dt>Collateral</dt><dd>{fmtAmount(r.collateralAmount, 4)} {r.collateralInstrument}</dd></div>
      <div><dt>Margin</dt><dd>{fmtPct(num(r.marginThresholdPct), 0)}</dd></div><div><dt>Cure</dt><dd>{fmtDuration(num(r.cureSeconds))}</dd></div></dl>
    <p className="sm muted">Issuer <Party party={r.collateralIssuer} /> · Oracle <Party party={r.oracle} /></p>
    <form className="desk-form" onSubmit={(e) => { e.preventDefault(); if (valid && funded) void run("Funded quote submitted", () => act.sendQuote(s, request, Number(rate) / 100, Math.round(Number(validity) * 60))); }}>
      <div className="field-pair"><Field label="Annualized rate (%)" hint="Simple interest · ACT/360"><input type="number" min="0" max="100" step="0.01" required value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
        <Field label="Quote valid (minutes)"><input type="number" min="1" max="1440" step="1" required value={validity} onChange={(e) => setValidity(e.target.value)} /></Field></div>
      {valid && <p className="sm">Repurchase price: <strong>{fmtAmount(num(r.cashAmount) * (1 + Number(rate) / 100 * num(r.termDays) / 360), 6)} {r.cashInstrument}</strong></p>}
      {!funded && <p className="err">Not enough available {r.cashInstrument} from the agreed cash issuer.</p>}
      <div className="acts"><button type="submit" className="seal sm" disabled={busy || !valid || !funded}>Reserve cash and quote</button>
        <button className="ghost sm" type="button" disabled={busy} onClick={() => void run("Request passed", () => act.passRequest(s, request.contractId))}>Pass</button></div>
    </form>
  </article>;
}

function LendPanel({ s, st }: { s: Session; st: DeskState }) {
  const { busy, run } = useContext(Transactions);
  const requests = st.requests.filter((r) => r.payload.dealer === s.party);
  const quotes = st.quotes.filter((q) => q.payload.dealer === s.party);
  return <><Panel id="dealer-requests" title="Incoming requests" description="Only requests addressed to your party appear here.">
    {!requests.length && <p className="empty-state">No incoming RFQs. Share your full party ID with a borrower to receive a private request.</p>}
    {requests.map((r) => <DealerRequest key={r.contractId} request={r} st={st} s={s} />)}
  </Panel><Panel title="Quotes you sent" description="Cash is reserved until acceptance, rejection, or revocation. Expiry does not release it automatically.">
    {!quotes.length && <p className="empty-state">No active quotes. Price an incoming request to reserve cash and send one.</p>}
    {quotes.map((q) => <article className="rfq" key={q.contractId}><div className="rfq-head"><Party party={q.payload.borrower} /><strong className="rate">{fmtPct(num(q.payload.rate))}</strong></div>
      <p>{fmtAmount(q.payload.cashAmount)} {q.payload.cashInstrument} reserved</p><p className="sm muted">{Date.now() >= Date.parse(q.payload.validUntil) ? "Expired" : "Valid until"} · {fmtTime(q.payload.validUntil)}</p>
      <button className="ghost sm" disabled={busy} onClick={() => void run("Quote revoked; cash released", () => act.revokeQuote(s, q.contractId))}>Revoke and release cash</button>
    </article>)}
  </Panel><Balances st={st} party={s.party} /></>;
}

function PositionCard({ position, s, st }: { position: Contract<RepoPosition>; s: Session; st: DeskState }) {
  const { busy, run } = useContext(Transactions);
  const [extra, setExtra] = useState("");
  const [replacement, setReplacement] = useState("");
  const [replacementQty, setReplacementQty] = useState("");
  const [repayReview, setRepayReview] = useState(false);
  const [liquidationReview, setLiquidationReview] = useState(false);
  const p = position.payload;
  const borrower = p.borrower === s.party;
  const h = health(p, st.feeds);
  const feed = feedFor(st.feeds, p);
  const now = Date.now();
  const elapsed = deadlineElapsed(p, now);
  const matured = now >= Date.parse(p.maturity);
  const cureExpired = cureElapsed(p, now);
  const deadline = cureDeadline(p);
  const postCureMark = !!feed && !!deadline && Date.parse(feed.payload.asOf) >= Date.parse(deadline);
  const canLiquidate = cureExpired && postCureMark && h.priceKnown && !h.healthy;
  const canClearCall = isUnderCall(p) && !matured && h.priceKnown && h.healthy;
  const positionStatus = matured ? "Matured · dealer default available"
    : cureExpired ? canLiquidate ? "Liquidation eligible · health factor below 1.00"
      : canClearCall ? "Mark recovered · clear the margin call" : "Cure elapsed · post-cure oracle mark required"
    : isUnderCall(p) ? `Margin call · ${cureLeft(deadline!)} to cure`
      : h.priceKnown && !h.healthy ? "Below margin · dealer may call" : "Active";
  const cash = balanceOf(st.holdings, s.party, p.cashInstrument, p.cashIssuer);
  const extraAvailable = balanceOf(st.holdings, s.party, p.collateralInstrument, p.collateralIssuer);
  const extraQty = Number(extra);
  const validTopUp = h.priceKnown && extraQty > 0 && Number.isFinite(extraQty) && extraQty <= extraAvailable &&
    num(feed!.payload.price) * (num(p.collateralAmount) + extraQty) >= h.requiredValue;
  const alternatives = latestFeeds(st.feeds).filter(({ payload: f }) => f.oracle === p.oracle &&
    f.cashIssuer === p.cashIssuer && f.cashInstrument === p.cashInstrument &&
    (f.instrument !== p.collateralInstrument || f.instrumentIssuer !== p.collateralIssuer));
  const substitute = alternatives.find((f) => feedIdentity(f.payload) === replacement);
  const qty = Number(replacementQty);
  const validSwap = substitute && isFresh(substitute.payload, num(p.maxPriceAgeSeconds)) && qty > 0 && Number.isFinite(qty) &&
    qty <= balanceOf(st.holdings, s.party, substitute.payload.instrument, substitute.payload.instrumentIssuer) &&
    qty * num(substitute.payload.price) >= h.requiredValue;
  const pending = st.proposals.some((proposal) => proposal.payload.posCid === position.contractId);
  const repurchase = async () => {
    if (await run("Repo repurchased and closed", () => act.repay(s, position))) setRepayReview(false);
  };
  const liquidate = async () => {
    if (await run("Repo liquidated; pledged collateral released to dealer", () => act.liquidate(s, position.contractId, feed!.contractId))) setLiquidationReview(false);
  };
  return <article className="position"><header><div><strong>{fmtAmount(p.cashAmount)} {p.cashInstrument}</strong><span className="muted"> against </span><strong>{fmtAmount(p.collateralAmount, 4)} {p.collateralInstrument}</strong></div>
    <div className="pos-meta"><span className="rate">{fmtPct(num(p.rate))}</span><span className="sm muted">{borrower ? "Dealer" : "Borrower"} <Party party={borrower ? p.dealer : p.borrower} /></span></div></header>
    <div className="health" role="group" aria-label="Collateral health"><p className="health-row"><strong>Health factor {h.priceKnown ? fmtAmount(h.factor) : "unavailable"}</strong><span>Margin threshold 1.00</span></p>
      <div className="health-track" role={h.priceKnown ? "meter" : undefined} aria-label={h.priceKnown ? "Health factor" : undefined} aria-valuemin={h.priceKnown ? 0 : undefined} aria-valuemax={h.priceKnown ? Math.max(1.6, h.factor) : undefined} aria-valuenow={h.priceKnown ? h.factor : undefined} aria-valuetext={h.priceKnown ? `${fmtAmount(h.factor)}; ${h.healthy ? "margin covered" : "below required margin"}` : undefined}><div className={`health-fill ${h.priceKnown ? h.healthy ? "ok" : "bad" : "unknown"}`} style={{ transform: `scaleX(${Math.min(1.6, Math.max(0, h.factor)) / 1.6})` }} /><div className="health-mark" style={{ left: "62.5%" }} /></div>
      <p className="health-row">{h.priceKnown ? `${fmtAmount(h.collateralValue)} / ${fmtAmount(h.requiredValue)} ${p.cashInstrument} required${h.shortfallValue > 0 ? ` · ${fmtAmount(h.shortfallValue)} shortfall` : ""}` : h.stale ? "Agreed oracle mark is stale or future-dated" : "No mark from the agreed oracle"}</p></div>
    <dl className="terms"><div><dt>Repurchase price</dt><dd>{fmtAmount(p.repurchasePrice, 6)} {p.cashInstrument}</dd></div><div><dt>Maturity</dt><dd>{fmtTime(p.maturity)}</dd></div>
      <div><dt>Rate convention</dt><dd>Annualized ACT/360</dd></div><div><dt>Status</dt><dd className={elapsed || isUnderCall(p) || !h.healthy ? "warn" : ""}>{positionStatus}</dd></div></dl>
    <p className="sm muted">Oracle <Party party={p.oracle} /> · {feed ? `simulated mark ${fmtTime(feed.payload.asOf)}` : "mark unavailable"} · maximum age {fmtDuration(num(p.maxPriceAgeSeconds))}</p>
    {elapsed && <p className="decision-note">Repurchase, top-up and substitution are closed. At maturity the dealer may declare default. After an uncured margin call, liquidation needs an agreed mark published after the cure deadline with health factor below 1.00.</p>}
    {borrower ? <div className="position-controls">
      <form className="desk-form" onSubmit={(e) => { e.preventDefault(); if (validTopUp && !elapsed) void run("Collateral topped up", () => act.topUp(s, position, extraQty, feed!.contractId)); }}>
        <Field label={`Top-up quantity (${p.collateralInstrument})`} hint={`Available ${fmtAmount(extraAvailable, 4)}. The top-up must restore the required margin.`}><input type="number" min="0.0000000001" step="any" value={extra} onChange={(e) => setExtra(e.target.value)} disabled={elapsed} /></Field>
        <button type="submit" className="ghost sm" disabled={busy || elapsed || !validTopUp}>Top up collateral</button>
      </form>
      <details className="terms-disclosure"><summary>Substitute collateral</summary><form className="desk-form" onSubmit={(e) => { e.preventDefault(); if (validSwap && !elapsed && !pending) void run("Substitution proposed; replacement reserved", () => act.proposeSubstitution(s, position.contractId, substitute!, qty)); }}>
        <Field label="Replacement asset"><select value={replacement} onChange={(e) => setReplacement(e.target.value)} disabled={elapsed || pending}><option value="">Select replacement collateral</option>{alternatives.map(({ payload: f }) => <option value={feedIdentity(f)} key={feedIdentity(f)}>{f.instrument} · {partyLabel(f.instrumentIssuer)}</option>)}</select></Field>
        <Field label="Replacement quantity"><input type="number" min="0.0000000001" step="any" value={replacementQty} onChange={(e) => setReplacementQty(e.target.value)} disabled={elapsed || pending} /></Field>
        {substitute && <p className="sm muted">Available {fmtAmount(balanceOf(st.holdings, s.party, substitute.payload.instrument, substitute.payload.instrumentIssuer), 4)}. Required value {fmtAmount(h.requiredValue)} {p.cashInstrument}; current proposed value {fmtAmount(qty * num(substitute.payload.price))}.</p>}
        {pending && <p className="sm muted">A proposal is waiting for the dealer. Withdraw it below before proposing a replacement.</p>}
        <button type="submit" className="ghost sm" disabled={busy || elapsed || pending || !validSwap}>Propose substitution</button>
      </form></details>
      <div><p className="sm muted">Repurchase before the deadline for the full agreed amount; interest is not reduced.</p><button className="seal sm" disabled={busy || elapsed || cash < num(p.repurchasePrice)} onClick={() => setRepayReview(true)}>Review repurchase</button>
        {!elapsed && cash < num(p.repurchasePrice) && <p className="sm muted">Available {fmtAmount(cash)} {p.cashInstrument}; full repurchase price required.</p>}</div>
      {canClearCall && <button className="ghost sm" disabled={busy} onClick={() => void run("Margin call cleared at the agreed oracle mark", () => act.resolveMarginCall(s, position.contractId, feed!.contractId))}>Clear recovered margin call</button>}
    </div> : <div className="acts wrap"><button className="ghost sm" disabled={busy || elapsed || !h.priceKnown || h.healthy || isUnderCall(p)} onClick={() => void run("Margin call issued", () => act.issueMarginCall(s, position.contractId, feed!.contractId))}>Issue margin call</button>
      <button className="ghost sm danger" disabled={busy || !canLiquidate} onClick={() => setLiquidationReview(true)}>Review liquidation</button>
      <button className="ghost sm danger" disabled={busy || !matured} onClick={() => void run("Maturity default declared; collateral released to dealer", () => act.declareDefault(s, position.contractId))}>Declare maturity default</button>
      {!matured && !cureExpired && <span className="sm muted">Liquidation requires an expired margin call, a post-cure mark, and health factor below 1.00. Maturity default is separate.</span>}</div>}
    {repayReview && <Dialog title="Review repurchase" close={() => setRepayReview(false)} busy={busy}>
      <Term label="You pay">{fmtAmount(p.repurchasePrice, 10)} {p.cashInstrument}</Term><Term label="You receive">{fmtAmount(p.collateralAmount, 4)} {p.collateralInstrument}</Term>
      <p className="decision-note">The full repurchase price is due, including when closing early. Payment and return of collateral settle together.</p>
      <button className="seal" disabled={busy || elapsed || cash < num(p.repurchasePrice)} onClick={() => void repurchase()}>Pay and repurchase</button>
    </Dialog>}
    {liquidationReview && <Dialog title="Review collateral liquidation" close={() => setLiquidationReview(false)} busy={busy}>
      <Term label="Health factor">{h.priceKnown ? fmtAmount(h.factor) : "Unavailable"}</Term>
      <Term label="Agreed oracle mark">{feed ? `${fmtAmount(feed.payload.price)} ${p.cashInstrument} per ${p.collateralInstrument}` : "Unavailable"}</Term>
      <Term label="Dealer receives">{fmtAmount(p.collateralAmount, 4)} pledged {p.collateralInstrument}</Term>
      <p className="decision-note">This demo closeout transfers all pledged collateral to the dealer. It does not sell the collateral or calculate realized proceeds, surplus, or shortfall. The ledger checks the fresh mark and health factor again when submitted.</p>
      <button className="seal" disabled={busy || !canLiquidate} onClick={() => void liquidate()}>Liquidate pledged collateral</button>
    </Dialog>}
  </article>;
}

function Positions({ s, st }: { s: Session; st: DeskState }) {
  const { busy, run } = useContext(Transactions);
  const mine = st.positions.filter((p) => p.payload.borrower === s.party || p.payload.dealer === s.party);
  const proposals = st.proposals.filter((p) => p.payload.borrower === s.party || p.payload.dealer === s.party);
  const closed = st.closed.filter((p) => p.payload.borrower === s.party || p.payload.dealer === s.party);
  return <><Panel id="open-positions" title="Open repo positions" description="Title has transferred at settlement. Collateral stays locked while the repo is open.">
    {!mine.length && <p className="empty-state">No open positions for this party. An accepted quote creates a position here.</p>}
    {mine.map((p) => <PositionCard key={p.contractId} position={p} s={s} st={st} />)}
  </Panel>{!!proposals.length && <Panel title="Pending substitutions">{proposals.map((proposal) => {
    const p = proposal.payload;
    const position = st.positions.find((x) => x.contractId === p.posCid);
    const feed = st.feeds.find((f) => f.contractId === p.newFeedCid);
    const current = !!position && !deadlineElapsed(position.payload) && !!feed && isFresh(feed.payload, num(position.payload.maxPriceAgeSeconds));
    return <article className="rfq" key={proposal.contractId}><strong>{fmtAmount(p.newQty, 4)} {p.newInstrument}</strong><p className="sm muted">Issuer <Party party={p.newIssuer} /> · Borrower <Party party={p.borrower} /></p>
      {!current && <p className="err">This proposal can no longer be accepted. Release its reserved replacement collateral.</p>}
      <div className="acts">{p.borrower === s.party ? <button className="ghost sm" disabled={busy} onClick={() => void run("Substitution withdrawn; replacement released", () => act.withdrawSubstitution(s, proposal.contractId))}>Withdraw proposal</button>
        : <><button className="seal sm" disabled={busy || !current} onClick={() => void run("Collateral substituted", () => act.acceptSubstitution(s, proposal.contractId))}>Accept substitution</button>
          <button className="ghost sm" disabled={busy} onClick={() => void run("Substitution declined; replacement released", () => act.rejectSubstitution(s, proposal.contractId))}>Decline</button></>}</div>
    </article>;
  })}</Panel>}{!!closed.length && <Panel id="closed-repos" title="Closed repos">{closed.map(({ contractId, payload: p }) => <div className="row" key={contractId}>
    <div><strong>{fmtAmount(p.collateralAmount, 4)} {p.collateralInstrument}</strong><p className="sm muted"><Party party={p.borrower} /> ↔ <Party party={p.dealer} /> · {fmtTime(p.closedAt)}{p.outcome === "Liquidated" && p.closeoutHealthFactor != null ? ` · HF ${fmtAmount(p.closeoutHealthFactor)}` : ""}</p></div>
    <span className={p.outcome === "Repurchased" ? "ok" : "warn"}>{p.outcome}</span>
  </div>)}</Panel>}</>;
}

function OracleMark({ feed, s }: { feed: Contract<PriceFeed>; s: Session }) {
  const { busy, run } = useContext(Transactions);
  const [price, setPrice] = useState("");
  const f = feed.payload;
  return <article className="rfq"><div className="rfq-head"><strong>{f.instrument} / {f.cashInstrument}</strong><span className="rate">{fmtAmount(f.price)}</span></div>
    <p className="sm muted">Issuer <Party party={f.instrumentIssuer} /> · {fmtTime(f.asOf)}</p>
    <form className="desk-form" onSubmit={(e) => { e.preventDefault(); if (Number(price) > 0 && Number.isFinite(Number(price))) void run("Simulated mark published", () => act.setPrice(s, feed, Number(price))); }}>
      <Field label={`New simulated price (${f.cashInstrument})`}><input type="number" required min="0.0000000001" step="any" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
      <div className="acts"><button type="submit" className="seal sm" disabled={busy || Number(price) <= 0 || !Number.isFinite(Number(price))}>Publish mark</button>
        <button className="ghost sm" type="button" disabled={busy} onClick={() => void run("Simulated mark timestamp refreshed", () => act.setPrice(s, feed, num(f.price)))}>Refresh timestamp</button></div>
    </form>
  </article>;
}

function Workspace({ session: s, connect, demoParties, switchParty, disconnect }: { session: Session; connect(): void; demoParties: string[]; switchParty(p: string): void; disconnect(): void }) {
  const { state: st, error, refresh, readAt } = useDesk(s);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const lock = useRef(false);
  const [tab, setTab] = useState<"borrow" | "lend">(() => s.kind === "sandbox" && s.party.startsWith("dealer") ? "lend" : "borrow");
  const [requestedPair, setRequestedPair] = useState("");
  const [activeSection, setActiveSection] = useState("markets");
  const [sessionOpen, setSessionOpen] = useState(() => !window.matchMedia("(max-width: 520px)").matches);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 520px)");
    const sync = () => setSessionOpen(!media.matches);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  const busy = receipt?.phase === "pending";
  const trading = canTrade(s);
  const run = useCallback(async (label: string, action: () => Promise<string>) => {
    if (!trading) { connect(); return false; }
    if (lock.current || error) return false;
    lock.current = true;
    setReceipt({ phase: "pending", label, detail: "Awaiting wallet authorization and ledger confirmation. Asset preparation may require more than one transaction." });
    try {
      const updateId = await action();
      setReceipt({ phase: "succeeded", label, updateId });
      await refresh();
      return true;
    } catch (e) {
      setReceipt({ phase: "failed", label, detail: (e as Error).message });
      await refresh();
      return false;
    } finally { lock.current = false; }
  }, [trading, error, connect, refresh]);
  const transactions = useMemo(() => ({ busy: busy || !!error, run }), [busy, error, run]);
  const oracle = trading && st?.feeds.some((f) => f.payload.oracle === s.party);
  useEffect(() => {
    const ids = oracle ? ["markets", "oracle-marks", "open-positions"] : tab === "borrow" ? ["markets", "private-quotes", "request-repo", "open-positions"] : ["markets", "dealer-requests", "open-positions"];
    let frame = 0;
    const sync = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        let current = ids[0];
        for (const id of ids) {
          if ((document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= 150) current = id;
        }
        if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 6 && document.getElementById(ids[ids.length - 1])) current = ids[ids.length - 1];
        setActiveSection(current);
        frame = 0;
      });
    };
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => { window.removeEventListener("scroll", sync); if (frame) window.cancelAnimationFrame(frame); };
  }, [oracle, tab, st]);
  return <Transactions.Provider value={transactions}><div className="desk">
    <a className="skip-link" href="#desk-content">Skip to desk</a>
    <header className="desk-head"><a className="brand" href="/" aria-label="Symbolon home"><img src="/brand/logo-mark.png" alt="" width="24" height="24" /><span>SYMBOLON</span></a>
      {trading && !oracle && <nav className="desk-tabs" aria-label="Desk role">{(["borrow", "lend"] as const).map((t) => <button key={t} className={t === tab ? "on" : ""} aria-pressed={t === tab} onClick={() => setTab(t)}>{t === "borrow" ? "Borrower" : "Dealer"}</button>)}</nav>}
      <div className="who">{s.kind !== "browse" ? <><span className="who-label"><Party party={s.party} /></span><span className="muted sm">{s.kind === "sandbox" ? "Local demo" : `${s.wallet ?? "Wallet"} · ${s.networkId ?? walletNetwork()}${trading ? "" : " · Read-only"}`}</span><button className="ghost sm" disabled={busy} onClick={disconnect}>Disconnect</button></>
        : <><span className="sm muted">Read-only</span><button className="seal sm" onClick={connect}>Connect wallet</button></>}</div>
    </header>
    <div className="desk-shell">
    <aside className="desk-sidebar" aria-label="Desk navigation and session">
      <div className="desk-side-intro"><span className="desk-side-kicker">PRIVATE DEALING DESK</span><strong>{oracle ? "Oracle" : tab === "borrow" ? "Borrow" : "Lend"}</strong><p>Fixed-rate repo on Canton</p></div>
      <nav className="desk-side-nav" aria-label="Workspace sections">
        <a className={activeSection === "markets" ? "active" : ""} aria-current={activeSection === "markets" ? "location" : undefined} href="#markets"><span>01</span> Markets</a>
        {trading && st && (oracle ? <a className={activeSection === "oracle-marks" ? "active" : ""} aria-current={activeSection === "oracle-marks" ? "location" : undefined} href="#oracle-marks"><span>02</span> Publish marks</a> : tab === "borrow" ? <><a className={activeSection === "private-quotes" ? "active" : ""} aria-current={activeSection === "private-quotes" ? "location" : undefined} href="#private-quotes"><span>02</span> Private quotes</a><a className={activeSection === "request-repo" ? "active" : ""} aria-current={activeSection === "request-repo" ? "location" : undefined} href="#request-repo"><span>03</span> New request</a></> : <a className={activeSection === "dealer-requests" ? "active" : ""} aria-current={activeSection === "dealer-requests" ? "location" : undefined} href="#dealer-requests"><span>02</span> Incoming RFQs</a>)}
        {trading && st && <a className={activeSection === "open-positions" ? "active" : ""} aria-current={activeSection === "open-positions" ? "location" : undefined} href="#open-positions"><span>{oracle ? "03" : tab === "borrow" ? "04" : "03"}</span> Positions</a>}
      </nav>
      <div className="environment-note"><strong>{s.kind === "sandbox" ? "Local Canton demo" : "Symbolon prototype"}</strong><span>{s.kind === "sandbox" ? "Demo assets · Simulated oracle marks · No real funds" : s.wallet === "grofty" ? "Prototype assets · Simulated oracle marks · MainNet actions can incur real fees" : "Demo assets · Simulated oracle marks · Verify your network and participant"}</span></div>
      <details className="desk-session-disclosure" open={sessionOpen} onToggle={(e) => setSessionOpen(e.currentTarget.open)}><summary>Session controls and simulated marks</summary>
      <div className="desk-tools">
      {sandboxModeEnabled() && <div className="demo-controls"><Field label="Local demo party" hint="Development only. Each party reads its own ledger view."><select value={s.kind === "sandbox" ? s.party : ""} disabled={busy} onChange={(e) => { if (e.target.value) switchParty(e.target.value); }}>
        <option value="">Choose a seeded demo party</option>{demoParties.map((p) => <option key={p} value={p}>{partyLabel(p)}</option>)}
      </select></Field>{!demoParties.length && <p className="sm muted">No seeded parties found. Start and seed the local Canton sandbox, then reload.</p>}</div>}
      <div className="session-tools">
      {trading && <details className="party-detail"><summary>Your full party ID</summary><code>{s.party}</code></details>}
      <div className="ledger-status"><span className="sm muted">{readAt ? `Last ledger read ${readAt.toLocaleTimeString()} · Times shown in ${Intl.DateTimeFormat().resolvedOptions().timeZone}` : "Reading ledger…"}</span><button className="ghost sm" disabled={busy} onClick={() => void refresh()}>Refresh</button></div>
      </div></div>
      {st && !!st.feeds.length && <div className="marks-strip"><span className="marks-tag">Simulated marks</span>{latestFeeds(st.feeds).map(({ contractId, payload: f }) => <span className="mark" key={contractId} title={`Oracle ${f.oracle}; issuer ${f.instrumentIssuer}; ${fmtTime(f.asOf)}`}>
        <span className="mark-sym">{f.instrument}</span><span className="mark-px">{fmtAmount(f.price)} {f.cashInstrument}</span><span className="sm muted">{isFresh(f, DEFAULT_PRICE_AGE_SECONDS) ? "current" : "stale"}</span>
      </span>)}</div>}
      </details>
    </aside>
    <main className="desk-body" id="desk-content">
      {deploymentFailure() && <p className="session-error" role="alert">Deployment configuration unavailable. Remote signing is paused. {deploymentFailure()}</p>}
      {s.kind === "wallet" && !trading && <p className="session-error" role="status">{tradingBlocker(s.networkId)}</p>}
      {error && <div className="ledger-error" role="alert"><strong>Ledger unavailable</strong><p>{error}</p><p className="sm">Showing the last successful read. Trading is paused until refresh succeeds. Check the participant connection and wallet permissions.</p></div>}
      <div className="receipt-region" aria-live="polite" aria-atomic="true">{receipt && <div className={`transaction-receipt ${receipt.phase}`}>
        <strong>{receipt.phase === "pending" ? "Pending" : receipt.phase === "succeeded" ? "Confirmed" : "Failed"} · {receipt.label}</strong>
        {receipt.detail && <p>{receipt.detail}</p>}{receipt.updateId && <details><summary>Ledger update receipt</summary><code>{receipt.updateId}</code></details>}
      </div>}</div>
      <MarketOverview state={st} party={s.party} connected={trading} mode={oracle ? "oracle" : tab} onConnect={connect} onRequestPair={setRequestedPair} />
      {!trading && <section className="open-desk"><img src="/brand/logo-mark.png" alt="" width="54" height="54" /><h2>A private repo desk</h2><p>Learn the flow with simulated cBTC / USDCx, or connect a development wallet to submit Canton commands.</p><div className="acts wrap"><a className="seal" href="/demo">Try the guided walkthrough</a><button className="ghost" onClick={connect}>Connect development wallet</button></div><p className="sm muted">Private books require an authorized party session. MainNet trading is not enabled for this prototype.</p></section>}
      {trading && !st && !error && <p role="status" className="empty-state">Loading your party’s ledger view…</p>}
      {trading && st && <><div className="work-heading"><div><span>Deal workspace</span><h2>{oracle ? "Keep collateral marks current" : tab === "borrow" ? "From private quote to settlement" : "Price and manage your requests"}</h2></div><p>{oracle ? "Only the agreed oracle can publish marks for these pairs." : "Every action below is scoped to your connected party and confirmed on the ledger."}</p></div>
        <div className={`board ${oracle ? "board-oracle" : tab === "borrow" ? "board-borrow" : "board-lend"}`}>{oracle ? <Panel id="oracle-marks" title="Publish simulated marks" description="You are the oracle party. Prices are entered manually; each update receives a current timestamp.">{st.feeds.filter((f) => f.payload.oracle === s.party).map((f) => <OracleMark key={feedIdentity(f.payload)} feed={f} s={s} />)}</Panel>
        : tab === "borrow" ? <><ReceivedQuotes s={s} st={st} /><BorrowRequest s={s} st={st} demoParties={s.kind === "sandbox" ? demoParties : []} initialPair={requestedPair} /><Balances st={st} party={s.party} /></>
          : <LendPanel s={s} st={st} />}</div><div className="board-foot"><Positions s={s} st={st} /></div></>}
    </main></div>
  </div></Transactions.Provider>;
}

export default function DeskApp() {
  const [session, setSession] = useState<Session>(() => browseSession());
  const sessionRef = useRef(session);
  useLayoutEffect(() => { sessionRef.current = session; }, [session]);
  const [connecting, setConnecting] = useState(false);
  const [demoParties, setDemoParties] = useState<string[]>([]);
  const [sessionError, setSessionError] = useState<string | null>(null);
  useEffect(() => {
    const unsubscribe = session.onInvalidated?.((reason) => {
      if (sessionRef.current !== session) return;
      setSession(browseSession());
      setSessionError(reason);
    });
    return () => { unsubscribe?.(); };
  }, [session]);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const restored = await restoreSession();
        if (active && restored) setSession((current) => canTrade(current) ? current : restored);
        else { const party = await publicReadParty(); if (active && party) setSession((current) => canTrade(current) ? current : browseSession(party)); }
      } catch (e) { if (active) setSessionError((e as Error).message); }
    })();
    if (sandboxModeEnabled()) void listSandboxParties().then((p) => { if (active) setDemoParties(p); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const disconnect = async () => {
    try { await session.disconnect(); setSession(browseSession(await publicReadParty())); setSessionError(null); }
    catch (e) { setSessionError((e as Error).message); }
  };
  const switchParty = (party: string) => {
    if (!sandboxModeEnabled() || !demoParties.includes(party)) return;
    setSession(connectSandbox(party)); setSessionError(null);
  };
  return <>{sessionError && <p className="session-error" role="alert">Session: {sessionError}</p>}
    <Workspace key={`${session.kind}:${session.party}`} session={session} connect={() => setConnecting(true)} demoParties={demoParties} switchParty={switchParty} disconnect={() => void disconnect()} />
    {connecting && <ConnectDialog close={() => setConnecting(false)} connected={(s) => { setSession(s); setConnecting(false); setSessionError(null); }} />}
  </>;
}
