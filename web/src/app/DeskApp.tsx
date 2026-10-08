import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Contract } from "../ledger/api";
import {
  browseSession, canTrade, connectWallet, listWalletOptions, publicReadParty,
  walletNetwork, sandboxModeEnabled, listSandboxParties, connectSandbox,
  restoreSession, connectAccount, cancelWalletConnection, type Session, type WalletOption,
} from "../ledger/session";
import {
  balanceOf, cureDeadline, cureElapsed, cureLeft, deadlineElapsed, deskState, feedFor,
  fmtAmount, fmtDuration, fmtPct, fmtTime, health, isFresh, isUnderCall,
  num, partyLabel, repurchaseAmount, DEFAULT_PRICE_AGE_SECONDS,
  type DeskState, type PriceFeed, type RepoPosition, type RepoQuote,
  type QuoteRequest,
} from "../ledger/symbolon";
import * as act from "./actions";
import MarketOverview, { latestPairs, marketIdentity } from "./MarketOverview";
import { TerminalPanels, TerminalTabs } from "./TerminalTabs";
import { marketDesk, type ContentTab, type TradeSide } from "./terminal-state";
import { deploymentFailure, tradingBlocker } from "../ledger/deployment";
import { deployment, networkLabel } from "../ledger/deployment";
import { startAccountConnection } from "../ledger/account";
import { SubmissionUncertain, type CommittedReceipt } from "../ledger/canton-v2";
import { completePublicRequests, requestPublicQuote } from "../ledger/public-desk";
import { PublicAccess, PublicDeskSetup } from "./PublicAccess";
import { Faucet } from "./Faucet";
import { NotificationRegion, TransactionToast, type Receipt } from "./TransactionToast";

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
      setReadAt(session.kind !== "browse" || session.ledgerRead ? new Date() : null);
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

type WorkspaceView = "markets" | "detail" | "portfolio" | "faucet";
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

function partyDisplayName(party: string, name?: string) {
  const publicDesk = deployment().publicDesk;
  const label = party === publicDesk?.operator ? publicDesk.label.replace(/\bdealer\b/gi, "lender")
    : (name || partyLabel(party)).replace(/^dealer/i, "lender");
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-/i.test(label)) return `Account ${label.slice(0, 6)}…${label.slice(-4)}`;
  const proofAlias = /^[a-f0-9]{8}-symbolon-proof-([a-f0-9]+)-(.+)$/i.exec(label);
  if (proofAlias) return `${proofAlias[2].replace(/^dealer/i, "lender")} · ${proofAlias[1].slice(0, 4)}`;
  return label.length > 24 ? `${label.slice(0, 12)}…${label.slice(-8)}` : label;
}

function Party({ party }: { party: string }) {
  return <span className="party-name">{partyDisplayName(party)}</span>;
}

function downloadReceipt(receipt: CommittedReceipt) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(receipt,null,2)],{type:"application/json"}));
  const link=document.createElement("a");link.href=url;link.download=`symbolon-receipt-${receipt.offset}.json`;
  link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function ReceiptDetails({ receipt }: { receipt: Receipt }) {
  return <><p><strong>{receipt.phase === "succeeded" ? "Confirmed" : receipt.phase === "unconfirmed" ? "Unconfirmed" : receipt.phase === "pending" ? "Pending" : "Failed"} · {receipt.label}</strong></p>
    {receipt.detail && <p className="decision-note">{receipt.detail}</p>}
    {receipt.updateId && <dl className="terms"><div><dt>Update ID</dt><dd><code>{receipt.updateId}</code></dd></div>
      {receipt.ledger && <><div><dt>Command ID</dt><dd><code>{receipt.ledger.commandId}</code></dd></div><div><dt>Ledger offset</dt><dd>{receipt.ledger.offset}</dd></div><div><dt>Recorded</dt><dd>{receipt.ledger.recordTime}</dd></div><div><dt>Synchronizer</dt><dd><code>{receipt.ledger.synchronizerId}</code></dd></div></>}
    </dl>}
    {receipt.ledger && <button className="ghost" onClick={() => downloadReceipt(receipt.ledger!)}>Download receipt</button>}
  </>;
}

function Dialog({ title, children, close, busy = false, className = "" }: { title: string; children: ReactNode; close(): void; busy?: boolean; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => { trigger?.focus(); };
  }, []);
  return <dialog ref={ref} className={`desk-dialog terminal-dialog ${className}`} aria-labelledby={titleId}
    onCancel={(e) => { e.preventDefault(); if (!busy) close(); }}>
    <div className="dialog-heading"><h2 id={titleId}>{title}</h2>
      <button className="ghost sm" onClick={close} disabled={busy} aria-label={`Close ${title}`}>Close</button>
    </div>{children}
  </dialog>;
}

function ConnectionMark({ icon, account = false }: { icon?: string; account?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (icon && !failed) return <img className="wallet-mark wallet-logo" src={icon} alt="" width="40" height="40" onError={() => setFailed(true)} />;
  return <span className="wallet-mark wallet-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {account ? <><circle cx="12" cy="8" r="3"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></>
      : <><path d="M20 8V6a2 2 0 0 0-2-2H6a3 3 0 0 0 0 6h14v10H6a3 3 0 0 1-3-3V7"/><path d="M20 12h-5v4h5"/></>}
  </svg></span>;
}

function ConnectDialog({ connected, close }: { connected(s: Session): void; close(): void }) {
  const [wallets, setWallets] = useState<WalletOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const connectionAttempt = useRef(0);
  const pendingConnection = useRef(false);
  useEffect(() => () => {
    connectionAttempt.current++;
    if (pendingConnection.current) cancelWalletConnection();
  }, []);
  useEffect(() => {
    let active = true;
    setWallets(null); setError(null);
    void listWalletOptions().then((w) => { if (active) setWallets(w); })
      .catch((e) => { if (active) { setWallets([]); setError(e.message); } });
    return () => { active = false; };
  }, [attempt]);
  const connect = async (id: string) => {
    const revision = ++connectionAttempt.current;
    pendingConnection.current = true;
    setBusy(id); setError(null);
    try {
      const session = await connectWallet(id, id === "grofty" ? "mainnet" : walletNetwork());
      if (revision !== connectionAttempt.current) { session.dispose?.(); return; }
      pendingConnection.current = false;
      connected(session);
    }
    catch (e) { if (revision === connectionAttempt.current) setError((e as Error).message); }
    finally { if (revision === connectionAttempt.current) { pendingConnection.current = false; setBusy(null); } }
  };
  const cancel = () => {
    connectionAttempt.current++; pendingConnection.current = false;
    cancelWalletConnection(); setBusy(null); setError(null);
  };
  const dismiss = () => { if (pendingConnection.current) cancel(); close(); };
  if (deployment().network === "localnet") return <Dialog title="Connect to Symbolon LocalNet" close={dismiss}>
    <p className="panel-lede">Open Account, then Advanced account controls to choose a seeded LocalNet party.</p>
    <p className="connection-network">LocalNet · Demo assets and simulated oracle marks · No real funds</p>
  </Dialog>;
  return <Dialog title="Connect to Symbolon" close={dismiss} busy={busy === "account"}>
    <p className="panel-lede">Connect on Canton {networkLabel()} to access your private quotes and positions.</p>
    {deployment().network === "devnet" && <button className="wallet-row account-connect" disabled={busy !== null} onClick={()=>{
      setBusy("account");void startAccountConnection().catch(e=>{setError(e.message);setBusy(null);});
    }}><ConnectionMark account/><span className="wallet-name">HackCanton account<small>Sign in to your hosted DevNet party</small></span><span className="wallet-note">{busy==="account"?"Redirecting…":"Sign in"}</span></button>}
    <p className="connection-section">Browser wallets</p>
    {wallets === null && <p className="empty-state" role="status">Discovering wallets…</p>}
    <ul className="wallet-list">{wallets?.map((w) => <li key={w.id}>
      <button className="wallet-row" disabled={busy !== null || !w.installed || !!w.unavailableReason} onClick={() => void connect(w.id)}>
        <ConnectionMark icon={w.icon}/>
        <span className="wallet-name">{w.name}<small>{w.unavailableReason ?? (w.id === "grofty" ? `Canton MainNet · v${w.minimumVersion}+ required` : w.installed ? "Open your wallet to approve the connection" : "Wallet extension not detected")}</small></span>
        <span className="wallet-note">{busy === w.id ? "Connecting…" : w.unavailableReason ? "Unavailable" : w.installed ? "Connect" : "Not detected"}</span>
      </button></li>)}</ul>
    {wallets?.length === 0 && <p className="empty-state">No supported wallet was discovered. Open your Canton wallet on the configured network, then retry.</p>}
    {error && <p className="err" role="alert">{error}</p>}
    {pendingConnection.current && <p className="connection-help" role="status">Check the wallet window and approve the connection. You can cancel if it does not open.</p>}
    <div className="acts"><button className="ghost sm" disabled={busy !== null} onClick={() => setAttempt((a) => a + 1)}>Refresh wallets</button>
      {pendingConnection.current && <button className="ghost sm" onClick={cancel}>Cancel connection</button>}</div>
    <p className="connection-network">Canton {networkLabel()} · Test assets only. MainNet transactions are not enabled.</p>
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

function QuoteReview({ quote, st, s, close, onSettled }: { quote: Contract<RepoQuote>; st: DeskState; s: Session; close(): void; onSettled?(): void }) {
  const { busy, run } = useContext(Transactions);
  const q = quote.payload;
  const feed = feedFor(st.feeds, q);
  const expired = Date.now() >= Date.parse(q.validUntil);
  const fresh = !!feed && isFresh(feed.payload, num(q.maxPriceAgeSeconds));
  const available = balanceOf(st.holdings, s.party, q.collateralInstrument, q.collateralIssuer);
  const covered = fresh && num(feed!.payload.price) * num(q.collateralAmount) >= num(q.cashAmount) * num(q.marginThresholdPct);
  const exists = st.quotes.some((x) => x.contractId === quote.contractId);
  const reason = !exists ? "This quote is no longer active. Refresh your book." : expired ? "This quote has expired. Ask the lender for a new offer."
    : !fresh ? "A fresh mark from the agreed oracle is required." : !covered ? "The current mark does not meet the agreed margin threshold."
    : available < num(q.collateralAmount) ? "You do not have enough available collateral from the agreed issuer." : null;
  const accept = async () => {
    if (reason || !feed) return;
    if (await run("Repo settled", () => act.acceptQuote(s, quote, feed.contractId))) { close(); onSettled?.(); }
  };
  return <Dialog title="Review repo settlement" close={close} busy={busy}>
    <p className="panel-lede">Acceptance transfers collateral title to the lender and pays the purchase price to you in one ledger transaction.</p>
    <div className="review-terms">
      <Term label="Lender"><Party party={q.dealer} /></Term>
      <Term label="Collateral">{fmtAmount(q.collateralAmount, 10)} {q.collateralInstrument}</Term>
      <Term label="Collateral issuer"><Party party={q.collateralIssuer} /></Term>
      <Term label="Purchase price">{fmtAmount(q.cashAmount)} {q.cashInstrument}</Term>
      <Term label="Cash issuer"><Party party={q.cashIssuer} /></Term>
      <Term label="Annualized rate">{fmtPct(num(q.rate))} · ACT/360</Term>
      <Term label="Tenor">{q.termDays} days from settlement</Term>
      <Term label="Repurchase price">{fmtAmount(repurchaseAmount(q), 10)} {q.cashInstrument}</Term>
      <Term label="Margin threshold">{fmtPct(num(q.marginThresholdPct), 2)}</Term>
      <Term label="Cure window">{fmtDuration(num(q.cureSeconds))}</Term>
      <Term label="Agreed oracle"><Party party={q.oracle} /></Term>
      <Term label="Maximum mark age">{fmtDuration(num(q.maxPriceAgeSeconds))}</Term>
      <Term label="Quote expires">{fmtTime(q.validUntil)}</Term>
    </div>
    <details className="party-detail"><summary>Verify full party IDs</summary>
      <p>Lender<code>{q.dealer}</code></p><p>Collateral issuer<code>{q.collateralIssuer}</code></p>
      <p>Cash issuer<code>{q.cashIssuer}</code></p><p>Oracle<code>{q.oracle}</code></p>
    </details>
    <p className="decision-note">Early repurchase costs the full agreed repurchase price. There is no interest rebate. Demo assets and simulated marks apply.</p>
    {reason && <p className="err" role="status">{reason}</p>}
    <button className="seal" disabled={busy || !!reason} onClick={() => void accept()}>
      {busy ? "Awaiting ledger…" : "Accept and settle"}
    </button>
  </Dialog>;
}

function ReceivedQuotes({ s, st, onSettled }: { s: Session; st: DeskState; onSettled?(): void }) {
  const { busy, run } = useContext(Transactions);
  const [review, setReview] = useState<Contract<RepoQuote> | null>(null);
  const quotes = st.quotes.filter((q) => q.payload.borrower === s.party).sort((a, b) => num(a.payload.rate) - num(b.payload.rate));
  const requests = st.requests.filter((r) => r.payload.borrower === s.party);
  return <Panel id="private-quotes" title="Received offers" description="Review the full terms before settlement.">
    {!quotes.length && <p className="empty-state">{requests.length ? "Waiting for a lender to quote your request." : "No offers yet. Request a private quote to begin."}</p>}
    {quotes.map((q) => <article className="rfq" key={q.contractId}>
      <div className="rfq-head"><strong><Party party={q.payload.dealer} /></strong><span className="rate">{fmtPct(num(q.payload.rate))}</span></div>
      <p className="sm muted">Annualized ACT/360 · {q.payload.termDays} days</p>
      <p>{fmtAmount(q.payload.cashAmount)} {q.payload.cashInstrument} against {fmtAmount(q.payload.collateralAmount, 4)} {q.payload.collateralInstrument}</p>
      <p className="sm muted">Expires {fmtTime(q.payload.validUntil)}</p>
      <div className="acts"><button className="seal sm" disabled={busy || Date.now() >= Date.parse(q.payload.validUntil)} onClick={() => setReview(q)}>
        {Date.now() >= Date.parse(q.payload.validUntil) ? "Expired" : "Review quote"}</button>
        <button className="ghost sm" disabled={busy} onClick={() => void run("Quote declined; lender cash released", () => act.rejectQuote(s, q.contractId))}>Decline</button></div>
    </article>)}
    {!!requests.length && <div className="pending-requests"><h3>Awaiting a quote</h3>{requests.map((r) => <div className="row" key={r.contractId}>
      <span><Party party={r.payload.dealer} /> · {fmtAmount(r.payload.cashAmount)} {r.payload.cashInstrument}</span>
      <button className="ghost sm" disabled={busy} onClick={() => void run("Request withdrawn", () => act.withdrawRequest(s, r.contractId))}>Withdraw</button>
      {r.payload.dealer===deployment().publicDesk?.operator&&<button className="seal sm" disabled={busy} onClick={()=>void run("Funded quote received",()=>requestPublicQuote(s,r.contractId))}>Get funded quote</button>}
    </div>)}</div>}
    {review && <QuoteReview quote={review} st={st} s={s} close={() => setReview(null)} onSettled={onSettled} />}
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

function BorrowRequest({ s, st, demoParties, initialPair, onSubmitted, onPairChange }: { s: Session; st: DeskState; demoParties: string[]; initialPair: string; onSubmitted(): void; onPairChange(pairId: string): void }) {
  const { busy, run } = useContext(Transactions);
  const feeds = latestFeeds(st.feeds);
  const chosen = initialPair;
  const [amount, setAmount] = useState(() => deployment().publicDesk ? "1000" : "");
  const [cushion, setCushion] = useState("150");
  const [term, setTerm] = useState("30");
  const [threshold, setThreshold] = useState("105");
  const [cure, setCure] = useState("60");
  const [maxAge, setMaxAge] = useState("60");
  const [dealersText, setDealersText] = useState(() => deployment().publicDesk?.operator ?? demoParties.find(p => p.startsWith("dealer") && p !== s.party) ?? "");
  const [review, setReview] = useState(false);
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
    const party = pieces.at(-1)!;
    return { name: partyDisplayName(party, pieces.length > 1 ? pieces[0] : undefined), party };
  });
  const dealers = [...new Set(entries.map((d) => d.party))];
  const selectedDealers = new Set(dealers);
  const validParties = dealers.length > 0 && dealers.every((p) => p.includes("::") && p !== s.party);
  const validNumbers = purchase > 0 && Number.isFinite(purchase) && Number.isInteger(Number(term)) && Number(term) >= 1 && Number(term) <= 365 &&
    cover >= margin && margin >= 1 && margin <= 2 && Number(cure) >= 1 / 60 && Number(cure) <= 10080 && ageSeconds >= 1 && ageSeconds <= 86400;
  const ready = fresh && validNumbers && pledge <= available && validParties;
  const submit = async () => {
    if (!ready || !feed) return;
    const succeeded = await run("Private quote requests submitted", async () => {
        const updateId=await act.requestQuotes(s, {
        dealers, oracle: feed.oracle, collateralIssuer: feed.instrumentIssuer,
        collateralInstrument: feed.instrument, collateralAmount: pledge,
        cashIssuer: feed.cashIssuer, cashInstrument: feed.cashInstrument, cashAmount: purchase,
        termDays: Number(term), marginThresholdPct: margin, cureSeconds: Math.round(Number(cure) * 60), maxPriceAgeSeconds: ageSeconds,
        });
        if(deployment().publicDesk&&dealers.includes(deployment().publicDesk!.operator)) {
          await completePublicRequests(s);
          return s.lastReceipt?.()?.updateId??updateId;
        }
        return updateId;
      });
    if (succeeded) { setReview(false); onSubmitted(); }
  };
  return <Panel id="request-repo" title="Borrow against collateral">
    <form className="desk-form" onSubmit={(e) => { e.preventDefault(); if (ready) setReview(true); }}>
      <Field label="Borrow amount" hint={feed?.cashInstrument}><input type="number" required min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
      <Field label="Duration (days)" hint="1–365 days from settlement"><input type="number" min="1" max="365" step="1" required value={term} onChange={(e) => setTerm(e.target.value)} /></Field>
      <div className="terminal-collateral-summary"><Term label="Collateral required">{fmtAmount(pledge, 4)} {feed?.instrument ?? "—"}</Term>
        <Term label="Available">{fmtAmount(available, 4)} {feed?.instrument ?? "—"}</Term>
        <Term label="Lender">{dealers.length === 1 ? partyDisplayName(dealers[0]) : `${dealers.length} selected`}</Term></div>
      <details className="terms-disclosure"><summary>Advanced terms</summary><div className="desk-form">
        <Field label="Collateral and oracle"><select required value={chosen} onChange={(e) => onPairChange(e.target.value)}>
          <option value="">Select an agreed price feed</option>{feeds.map(({ payload: f }) => <option key={feedIdentity(f)} value={feedIdentity(f)}>
            {f.instrument} / {f.cashInstrument} · {partyDisplayName(f.instrumentIssuer)} · {partyDisplayName(f.oracle)}
          </option>)}</select></Field>
        {feed && <p className="sm muted">Simulated mark {fmtAmount(feed.price)} {feed.cashInstrument} · {fmtTime(feed.asOf)}</p>}
        <Field label="Initial cover (%)"><input type="number" min={threshold} step="0.01" required value={cushion} onChange={(e) => setCushion(e.target.value)} /></Field>
        <Field label="Margin threshold (%)"><input type="number" min="100" max="200" step="0.01" required value={threshold} onChange={(e) => setThreshold(e.target.value)} /></Field>
        <Field label="Cure window (minutes)"><input type="number" min="1" max="10080" step="1" required value={cure} onChange={(e) => setCure(e.target.value)} /></Field>
        <Field label="Maximum mark age (minutes)"><input type="number" min="1" max="1440" step="1" required value={maxAge} onChange={(e) => setMaxAge(e.target.value)} /></Field>
      <Field label="Lender party IDs" hint="One per line. Optional: Lender name | full party ID.">
        <textarea aria-label="Lender party IDs" rows={3} required spellCheck={false} placeholder="Lender A | lender-a::…" value={dealersText} onChange={(e) => setDealersText(e.target.value)} />
      </Field>
      {demoParties.some((p) => p.startsWith("dealer")) && <div className="chip-row" aria-label="Add a seeded test lender">{demoParties.filter((p) => p.startsWith("dealer") && p !== s.party).map((p) =>
        <button className="chip" type="button" key={p} disabled={selectedDealers.has(p)} onClick={() => setDealersText((text) => `${text}${text ? "\n" : ""}${partyLabel(p)} | ${p}`)}>Add {partyDisplayName(p)}</button>)}</div>}
      </div></details>
      {!feeds.length && <p className="empty-state">No authorized price feed is available yet.</p>}
      {selected && !fresh && <p className="err">The selected mark is stale or future-dated. Ask the oracle to publish a current mark.</p>}
      {pledge > available && <p className="err">The request needs more available collateral than this party holds.</p>}
      {!!dealersText && !validParties && <p className="err">Use full Canton party IDs containing “::”, and do not address a request to yourself.</p>}
      <p className="terminal-trade-note">The lender’s offer sets your fixed rate and exact repayment. Review it before settlement.</p>
      <button type="submit" className="seal" disabled={busy || !ready}>{busy ? "Awaiting ledger…" : "Review request"}</button>
    </form>
    {review && feed && <Dialog title="Review financing request" close={() => setReview(false)} busy={busy}>
      <div className="review-terms"><Term label="Requested amount">{fmtAmount(purchase)} {feed.cashInstrument}</Term>
        <Term label="Collateral">{fmtAmount(pledge, 10)} {feed.instrument}</Term><Term label="Duration">{term} days from settlement</Term>
        <Term label="Lenders">{entries.map(entry => entry.name).join(", ")}</Term><Term label="Initial cover">{cushion}%</Term>
        <Term label="Maintenance margin">{threshold}%</Term><Term label="Cure window">{fmtDuration(Number(cure) * 60)}</Term>
        <Term label="Maximum mark age">{fmtDuration(ageSeconds)}</Term><Term label="Rate and repayment">Set in the lender’s offer</Term></div>
      <details className="party-detail"><summary>Full contract identities</summary><p>Collateral issuer<code>{feed.instrumentIssuer}</code></p>
        <p>Cash issuer<code>{feed.cashIssuer}</code></p><p>Oracle<code>{feed.oracle}</code></p>{dealers.map(party => <p key={party}>Lender<code>{party}</code></p>)}</details>
      <p className="decision-note">This sends a private request. Accepting a funded offer later transfers collateral title to the lender. The agreed repayment is due in full even when repurchasing early; an uncured margin call or maturity default may release the pledged collateral to the lender.</p>
      <button className="seal" disabled={busy || !ready} onClick={() => void submit()}>{busy ? "Awaiting ledger…" : "Send private request"}</button>
    </Dialog>}
  </Panel>;
}

function LenderRequest({ request, s, st, onSubmitted }: { request: Contract<QuoteRequest>; s: Session; st: DeskState; onSubmitted(): void }) {
  const { busy, run } = useContext(Transactions);
  const [rate, setRate] = useState("");
  const [validity, setValidity] = useState("60");
  const [review, setReview] = useState(false);
  const r = request.payload;
  const funded = balanceOf(st.holdings, s.party, r.cashInstrument, r.cashIssuer) >= num(r.cashAmount);
  const valid = rate !== "" && Number.isFinite(Number(rate)) && Number(rate) >= 0 && Number(rate) <= 100 && Number(validity) >= 1 && Number(validity) <= 1440;
  const submit = async () => {
    if (!valid || !funded || !st.requests.some(item => item.contractId === request.contractId)) return;
    const succeeded = await run("Funded quote submitted", () => act.sendQuote(s, request, Number(rate) / 100, Math.round(Number(validity) * 60)));
    if (succeeded) { setReview(false); onSubmitted(); }
  };
  return <article className="rfq"><div className="rfq-head"><strong><Party party={r.borrower} /></strong><span className="sm">{r.termDays} days</span></div>
    <dl className="rfq-terms"><div><dt>Cash to reserve</dt><dd>{fmtAmount(r.cashAmount)} {r.cashInstrument}</dd></div><div><dt>Collateral</dt><dd>{fmtAmount(r.collateralAmount, 4)} {r.collateralInstrument}</dd></div></dl>
    <details className="terms-disclosure"><summary>Request terms and identities</summary><div className="review-terms">
      <Term label="Maintenance margin">{fmtPct(num(r.marginThresholdPct), 2)}</Term><Term label="Cure window">{fmtDuration(num(r.cureSeconds))}</Term>
      <Term label="Maximum mark age">{fmtDuration(num(r.maxPriceAgeSeconds))}</Term><Term label="Borrower"><Party party={r.borrower}/></Term>
      <Term label="Collateral issuer"><Party party={r.collateralIssuer}/></Term><Term label="Cash issuer"><Party party={r.cashIssuer}/></Term>
      <Term label="Oracle"><Party party={r.oracle}/></Term></div></details>
    <form className="desk-form" onSubmit={(e) => { e.preventDefault(); if (valid && funded) setReview(true); }}>
      <div className="field-pair"><Field label="Annualized rate (%)" hint="Simple interest · ACT/360"><input type="number" min="0" max="100" step="0.01" required value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
        <Field label="Quote valid (minutes)"><input type="number" min="1" max="1440" step="1" required value={validity} onChange={(e) => setValidity(e.target.value)} /></Field></div>
      {valid && <p className="sm">Repurchase price: <strong>{fmtAmount(num(r.cashAmount) * (1 + Number(rate) / 100 * num(r.termDays) / 360), 6)} {r.cashInstrument}</strong></p>}
      {!funded && <p className="err">Not enough available {r.cashInstrument} from the agreed cash issuer.</p>}
      <div className="acts"><button type="submit" className="seal sm" disabled={busy || !valid || !funded}>Review funded offer</button>
        <button className="ghost sm" type="button" disabled={busy} onClick={() => void run("Request passed", () => act.passRequest(s, request.contractId))}>Pass</button></div>
    </form>
    {review && <Dialog title="Review funded offer" close={() => setReview(false)} busy={busy}>
      <div className="review-terms"><Term label="Borrower"><Party party={r.borrower}/></Term><Term label="Cash reserved">{fmtAmount(r.cashAmount)} {r.cashInstrument}</Term>
        <Term label="Collateral">{fmtAmount(r.collateralAmount, 10)} {r.collateralInstrument}</Term><Term label="Annualized rate">{rate}% · ACT/360</Term>
        <Term label="Duration">{r.termDays} days from settlement</Term><Term label="Repurchase price">{fmtAmount(num(r.cashAmount) * (1 + Number(rate) / 100 * num(r.termDays) / 360), 10)} {r.cashInstrument}</Term>
        <Term label="Offer validity">{validity} minutes from submission</Term><Term label="Maintenance margin">{fmtPct(num(r.marginThresholdPct), 2)}</Term>
        <Term label="Cure window">{fmtDuration(num(r.cureSeconds))}</Term><Term label="Maximum mark age">{fmtDuration(num(r.maxPriceAgeSeconds))}</Term></div>
      <details className="party-detail"><summary>Full contract identities</summary><p>Borrower<code>{r.borrower}</code></p><p>Collateral issuer<code>{r.collateralIssuer}</code></p><p>Cash issuer<code>{r.cashIssuer}</code></p><p>Oracle<code>{r.oracle}</code></p></details>
      <p className="decision-note">Your cash is reserved until the borrower accepts, declines, or you revoke the offer. Expiry does not release it automatically. Acceptance transfers collateral title and pays the borrower in one ledger transaction.</p>
      <button className="seal" disabled={busy || !valid || !funded || !st.requests.some(item => item.contractId === request.contractId)} onClick={() => void submit()}>{busy ? "Awaiting ledger…" : "Reserve cash and send offer"}</button>
    </Dialog>}
  </article>;
}

function LendRequest({ s, st, onSubmitted }: { s: Session; st: DeskState; onSubmitted(): void }) {
  const requests = st.requests.filter((r) => r.payload.dealer === s.party);
  const [selectedId, setSelectedId] = useState("");
  const selected = requests.find(request => request.contractId === selectedId) ?? requests[0];
  return <Panel id="lender-requests" title="Price a private request">
    {!requests.length ? <p className="empty-state">No request is addressed to this account for this pair. Share your party ID from Account details with a borrower.</p>
      : <><Field label="Borrow request"><select value={selected?.contractId ?? ""} onChange={event => setSelectedId(event.target.value)}>
        {requests.map(request => <option key={request.contractId} value={request.contractId}>{partyDisplayName(request.payload.borrower)} · {fmtAmount(request.payload.cashAmount)} {request.payload.cashInstrument} · {request.payload.termDays} days</option>)}
      </select></Field>{selected && <LenderRequest key={selected.contractId} request={selected} st={st} s={s} onSubmitted={onSubmitted}/>}</>}
    <p className="terminal-trade-note">Each offer reserves your cash for one borrower. Expiry requires revocation to release it.</p>
  </Panel>;
}

function SentOffers({ s, st }: { s: Session; st: DeskState }) {
  const { busy, run } = useContext(Transactions);
  const quotes = st.quotes.filter((q) => q.payload.dealer === s.party);
  return <Panel title="Sent offers" description="Cash stays reserved until acceptance, rejection, or revocation.">
    {!quotes.length && <p className="empty-state">No active quotes. Price an incoming request to reserve cash and send one.</p>}
    {quotes.map((q) => <article className="rfq" key={q.contractId}><div className="rfq-head"><Party party={q.payload.borrower} /><strong className="rate">{fmtPct(num(q.payload.rate))}</strong></div>
      <p>{fmtAmount(q.payload.cashAmount)} {q.payload.cashInstrument} reserved</p><p className="sm muted">{Date.now() >= Date.parse(q.payload.validUntil) ? "Expired" : "Valid until"} · {fmtTime(q.payload.validUntil)}</p>
      <button className="ghost sm" disabled={busy} onClick={() => void run("Quote revoked; cash released", () => act.revokeQuote(s, q.contractId))}>Revoke and release cash</button>
    </article>)}
  </Panel>;
}

function PositionCard({ position, s, st, onRepurchased }: { position: Contract<RepoPosition>; s: Session; st: DeskState; onRepurchased?(): void }) {
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
  const positionStatus = matured ? "Matured · lender default available"
    : cureExpired ? canLiquidate ? "Liquidation eligible · health factor below 1.00"
      : canClearCall ? "Mark recovered · clear the margin call" : "Cure elapsed · post-cure oracle mark required"
    : isUnderCall(p) ? `Margin call · ${cureLeft(deadline!)} to cure`
      : h.priceKnown && !h.healthy ? "Below margin · lender may call" : "Active";
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
    if (await run("Repo repurchased and closed", () => act.repay(s, position))) { setRepayReview(false); onRepurchased?.(); }
  };
  const liquidate = async () => {
    if (await run("Repo liquidated; pledged collateral released to lender", () => act.liquidate(s, position.contractId, feed!.contractId))) setLiquidationReview(false);
  };
  return <article className="position"><header><div><strong>{fmtAmount(p.cashAmount)} {p.cashInstrument}</strong><span className="muted"> against </span><strong>{fmtAmount(p.collateralAmount, 4)} {p.collateralInstrument}</strong></div>
    <div className="pos-meta"><span className="rate">{fmtPct(num(p.rate))}</span><span className="sm muted">{borrower ? "Lender" : "Borrower"} <Party party={borrower ? p.dealer : p.borrower} /></span></div></header>
    <div className="health" role="group" aria-label="Collateral health"><p className="health-row"><strong>Health factor {h.priceKnown ? fmtAmount(h.factor) : "unavailable"}</strong><span>Margin threshold 1.00</span></p>
      <div className="health-track" role={h.priceKnown ? "meter" : undefined} aria-label={h.priceKnown ? "Health factor" : undefined} aria-valuemin={h.priceKnown ? 0 : undefined} aria-valuemax={h.priceKnown ? Math.max(1.6, h.factor) : undefined} aria-valuenow={h.priceKnown ? h.factor : undefined} aria-valuetext={h.priceKnown ? `${fmtAmount(h.factor)}; ${h.healthy ? "margin covered" : "below required margin"}` : undefined}><div className={`health-fill ${h.priceKnown ? h.healthy ? "ok" : "bad" : "unknown"}`} style={{ transform: `scaleX(${Math.min(1.6, Math.max(0, h.factor)) / 1.6})` }} /><div className="health-mark" style={{ left: "62.5%" }} /></div>
      <p className="health-row">{h.priceKnown ? `${fmtAmount(h.collateralValue)} / ${fmtAmount(h.requiredValue)} ${p.cashInstrument} required${h.shortfallValue > 0 ? ` · ${fmtAmount(h.shortfallValue)} shortfall` : ""}` : h.stale ? "Agreed oracle mark is stale or future-dated" : "No mark from the agreed oracle"}</p></div>
    <dl className="terms"><div><dt>Repurchase price</dt><dd>{fmtAmount(p.repurchasePrice, 6)} {p.cashInstrument}</dd></div><div><dt>Maturity</dt><dd>{fmtTime(p.maturity)}</dd></div>
      <div><dt>Rate convention</dt><dd>Annualized ACT/360</dd></div><div><dt>Status</dt><dd className={elapsed || isUnderCall(p) || !h.healthy ? "warn" : ""}>{positionStatus}</dd></div></dl>
    <p className="sm muted">Oracle <Party party={p.oracle} /> · {feed ? `simulated mark ${fmtTime(feed.payload.asOf)}` : "mark unavailable"} · maximum age {fmtDuration(num(p.maxPriceAgeSeconds))}</p>
    {elapsed && <p className="decision-note">Repurchase, top-up and substitution are closed. At maturity the lender may declare default. After an uncured margin call, liquidation needs an agreed mark published after the cure deadline with health factor below 1.00.</p>}
    {borrower ? <div className="position-controls">
      <form className="desk-form" onSubmit={(e) => { e.preventDefault(); if (validTopUp && !elapsed) void run("Collateral topped up", () => act.topUp(s, position, extraQty, feed!.contractId)); }}>
        <Field label={`Top-up quantity (${p.collateralInstrument})`} hint={`Available ${fmtAmount(extraAvailable, 4)}. The top-up must restore the required margin.`}><input type="number" min="0.0000000001" step="any" value={extra} onChange={(e) => setExtra(e.target.value)} disabled={elapsed} /></Field>
        <button type="submit" className="ghost sm" disabled={busy || elapsed || !validTopUp}>Top up collateral</button>
      </form>
      <details className="terms-disclosure"><summary>Substitute collateral</summary><form className="desk-form" onSubmit={(e) => { e.preventDefault(); if (validSwap && !elapsed && !pending) void run("Substitution proposed; replacement reserved", () => act.proposeSubstitution(s, position.contractId, substitute!, qty)); }}>
        <Field label="Replacement asset"><select value={replacement} onChange={(e) => setReplacement(e.target.value)} disabled={elapsed || pending}><option value="">Select replacement collateral</option>{alternatives.map(({ payload: f }) => <option value={feedIdentity(f)} key={feedIdentity(f)}>{f.instrument} · {partyDisplayName(f.instrumentIssuer)}</option>)}</select></Field>
        <Field label="Replacement quantity"><input type="number" min="0.0000000001" step="any" value={replacementQty} onChange={(e) => setReplacementQty(e.target.value)} disabled={elapsed || pending} /></Field>
        {substitute && <p className="sm muted">Available {fmtAmount(balanceOf(st.holdings, s.party, substitute.payload.instrument, substitute.payload.instrumentIssuer), 4)}. Required value {fmtAmount(h.requiredValue)} {p.cashInstrument}; current proposed value {fmtAmount(qty * num(substitute.payload.price))}.</p>}
        {pending && <p className="sm muted">A proposal is waiting for the lender. Withdraw it below before proposing a replacement.</p>}
        <button type="submit" className="ghost sm" disabled={busy || elapsed || pending || !validSwap}>Propose substitution</button>
      </form></details>
      <div><p className="sm muted">Repurchase before the deadline for the full agreed amount; interest is not reduced.</p><button className="seal sm" disabled={busy || elapsed || cash < num(p.repurchasePrice)} onClick={() => setRepayReview(true)}>Review repurchase</button>
        {!elapsed && cash < num(p.repurchasePrice) && <p className="sm muted">Available {fmtAmount(cash)} {p.cashInstrument}; full repurchase price required.</p>}</div>
      {canClearCall && <button className="ghost sm" disabled={busy} onClick={() => void run("Margin call cleared at the agreed oracle mark", () => act.resolveMarginCall(s, position.contractId, feed!.contractId))}>Clear recovered margin call</button>}
    </div> : <div className="acts wrap"><button className="ghost sm" disabled={busy || elapsed || !h.priceKnown || h.healthy || isUnderCall(p)} onClick={() => void run("Margin call issued", () => act.issueMarginCall(s, position.contractId, feed!.contractId))}>Issue margin call</button>
      <button className="ghost sm danger" disabled={busy || !canLiquidate} onClick={() => setLiquidationReview(true)}>Review liquidation</button>
      <button className="ghost sm danger" disabled={busy || !matured} onClick={() => void run("Maturity default declared; collateral released to lender", () => act.declareDefault(s, position.contractId))}>Declare maturity default</button>
      {!matured && !cureExpired && <span className="sm muted">Liquidation requires an expired margin call, a post-cure mark, and health factor below 1.00. Maturity default is separate.</span>}</div>}
    {repayReview && <Dialog title="Review repurchase" close={() => setRepayReview(false)} busy={busy}>
      <Term label="You pay">{fmtAmount(p.repurchasePrice, 10)} {p.cashInstrument}</Term><Term label="You receive">{fmtAmount(p.collateralAmount, 10)} {p.collateralInstrument}</Term>
      <p className="decision-note">The full repurchase price is due, including when closing early. Payment and return of collateral settle together.</p>
      <button className="seal" disabled={busy || elapsed || cash < num(p.repurchasePrice)} onClick={() => void repurchase()}>Pay and repurchase</button>
    </Dialog>}
    {liquidationReview && <Dialog title="Review collateral liquidation" close={() => setLiquidationReview(false)} busy={busy}>
      <Term label="Health factor">{h.priceKnown ? fmtAmount(h.factor) : "Unavailable"}</Term>
      <Term label="Agreed oracle mark">{feed ? `${fmtAmount(feed.payload.price)} ${p.cashInstrument} per ${p.collateralInstrument}` : "Unavailable"}</Term>
      <Term label="Lender receives">{fmtAmount(p.collateralAmount, 10)} pledged {p.collateralInstrument}</Term>
      <p className="decision-note">This demo closeout transfers all pledged collateral to the lender. It does not sell the collateral or calculate realized proceeds, surplus, or shortfall. The ledger checks the fresh mark and health factor again when submitted.</p>
      <button className="seal" disabled={busy || !canLiquidate} onClick={() => void liquidate()}>Liquidate pledged collateral</button>
    </Dialog>}
  </article>;
}

function Positions({ s, st, onRepurchased }: { s: Session; st: DeskState; onRepurchased?(): void }) {
  const { busy, run } = useContext(Transactions);
  const mine = st.positions.filter((p) => p.payload.borrower === s.party || p.payload.dealer === s.party);
  const proposals = st.proposals.filter((p) => p.payload.borrower === s.party || p.payload.dealer === s.party);
  return <><Panel id="open-positions" title="Open repo positions" description="Title has transferred at settlement. Collateral stays locked while the repo is open.">
    {!mine.length && <p className="empty-state">No open positions for this party. An accepted quote creates a position here.</p>}
    {mine.map((p) => <PositionCard key={p.contractId} position={p} s={s} st={st} onRepurchased={onRepurchased} />)}
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
  })}</Panel>}</>;
}

function Activity({ s, st }: { s: Session; st: DeskState }) {
  const closed = st.closed.filter((p) => p.payload.borrower === s.party || p.payload.dealer === s.party)
    .sort((a, b) => Date.parse(b.payload.closedAt) - Date.parse(a.payload.closedAt));
  return <Panel id="closed-repos" title="Closed repos" description="Ledger closeouts visible to this account.">
    {!closed.length && <p className="empty-state">No closed repos yet. Your latest transaction receipt is available in Account.</p>}
    {closed.map(({ contractId, payload: p }) => <div className="row" key={contractId}>
    <div><strong>{fmtAmount(p.collateralAmount, 4)} {p.collateralInstrument}</strong><p className="sm muted"><Party party={p.borrower} /> ↔ <Party party={p.dealer} /> · {fmtTime(p.closedAt)}{p.outcome === "Liquidated" && p.closeoutHealthFactor != null ? ` · HF ${fmtAmount(p.closeoutHealthFactor)}` : ""}</p></div>
    <span className={p.outcome === "Repurchased" ? "ok" : "warn"}>{p.outcome}</span>
  </div>)}</Panel>;
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

function Workspace({ session: s, connect, demoParties, switchParty, disconnect, viewChoice, setView, sessionError, clearSessionError }: {
  session: Session; connect(): void; demoParties: string[]; switchParty(p: string): void; disconnect(): void;
  viewChoice: WorkspaceView | null; setView(view: WorkspaceView): void; sessionError: string | null; clearSessionError(): void;
}) {
  const { state: st, error, refresh, readAt } = useDesk(s);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [dismissedReceipt, setDismissedReceipt] = useState<Receipt | null>(null);
  const [receiptViewing, setReceiptViewing] = useState<Receipt | null>(null);
  const lock = useRef(false);
  const publicDesk = deployment().publicDesk;
  const publicPair: PriceFeed | undefined = publicDesk ? {
    oracle: publicDesk.operator, instrumentIssuer: publicDesk.operator, instrument: "cBTC-demo",
    cashIssuer: publicDesk.operator, cashInstrument: "USDCx-demo", price: "", asOf: "", readers: [],
  } : undefined;
  const [side, setSide] = useState<TradeSide>("borrow");
  const [content, setContent] = useState<ContentTab>("overview");
  const [portfolio, setPortfolio] = useState<"positions" | "holdings" | "activity">("positions");
  const [chosenPair, setSelectedId] = useState(() => publicPair ? marketIdentity(publicPair) : "");
  const [accountOpen, setAccountOpen] = useState(false);
  const pairs = useMemo(() => latestPairs(st?.feeds ?? []), [st?.feeds]);
  const selectedId = chosenPair || (pairs[0] ? marketIdentity(pairs[0].payload) : "");
  const view = viewChoice ?? (pairs.length === 1 ? "detail" : "markets");
  const selected = pairs.find(pair => marketIdentity(pair.payload) === selectedId);
  const feed = selected?.payload ?? (publicPair && marketIdentity(publicPair) === selectedId ? publicPair : undefined);
  const scoped = st && feed ? marketDesk(st, feed) : null;
  const busy = receipt?.phase === "pending";
  const connected = s.kind !== "browse";
  const trading = canTrade(s);
  const run = useCallback(async (label: string, action: () => Promise<string>) => {
    if (!trading) {
      if (!connected) connect();
      else setReceipt({phase:"failed",label,detail:"Your account is connected in read-only mode. Trading is not enabled for this deployment."});
      return false;
    }
    if (lock.current || error || s.pendingCommand?.()) return false;
    lock.current = true;
    setReceipt({ phase: "pending", label, detail: s.kind === "account" ? "Waiting for the participant to confirm your action." : s.kind === "sandbox" ? "Waiting for the local Canton ledger to confirm the action." : "Awaiting wallet authorization and ledger confirmation." });
    try {
      const updateId = await action();
      const ledger = s.lastReceipt?.();
      setReceipt({ phase: "succeeded", label, updateId, ...(ledger?.updateId === updateId ? {ledger} : {}) });
      await refresh();
      return true;
    } catch (e) {
      setReceipt({ phase: e instanceof SubmissionUncertain ? "unconfirmed" : "failed", label, detail: (e as Error).message });
      await refresh();
      return false;
    } finally { lock.current = false; }
  }, [connected, trading, error, connect, refresh, s]);
  const transactions = useMemo(() => ({ busy: busy || !!error || !!s.pendingCommand?.() || !trading, run }), [busy, error, run, s, trading]);
  const ownFeeds = connected ? latestFeeds(st?.feeds.filter(item => item.payload.oracle === s.party) ?? []) : [];
  const ownQuotes = connected ? scoped?.quotes.filter(({payload}) => payload.borrower === s.party || payload.dealer === s.party) ?? [] : [];
  const liveQuotes = ownQuotes.filter(({payload}) => Date.parse(payload.validUntil) > Date.now());
  const bestRate = liveQuotes.length ? Math.min(...liveQuotes.map(({payload}) => num(payload.rate))) : null;
  const positions = connected ? scoped?.positions.filter(({payload}) => payload.borrower === s.party || payload.dealer === s.party) ?? [] : [];
  const ownRequests = connected ? scoped?.requests.filter(({payload}) => payload.borrower === s.party || payload.dealer === s.party) ?? [] : [];
  const openPair = (id: string) => { setSelectedId(id); setView("detail"); setContent("overview"); };
  const contentOptions = [
    {value: "overview" as const, label: "Overview"}, {value: "offers" as const, label: "Offers", count: ownQuotes.length},
    {value: "positions" as const, label: "Positions", count: positions.length}, {value: "activity" as const, label: "Activity"},
  ];
  const accountLabel = connected ? partyDisplayName(s.party) : "Account";
  const connectionAction = () => deployment().network === "localnet" || sandboxModeEnabled() && !publicDesk ? setAccountOpen(true) : connect();
  const unavailable = error ? "Trading paused until the ledger read recovers." : !trading ? "Connected in read-only mode." : null;

  return <Transactions.Provider value={transactions}><div className="desk terminal">
    <a className="skip-link" href="#desk-content">Skip to desk</a>
    <header className="terminal-head"><a className="brand" href="/" aria-label="Symbolon home"><img src="/brand/logo-mark.png" alt="" width="24" height="24"/><span>SYMBOLON</span></a>
      <nav className="terminal-nav" aria-label="Main navigation"><button type="button" className={view === "markets" || view === "detail" ? "on" : ""} aria-current={view === "markets" || view === "detail" ? "page" : undefined} onClick={() => setView("markets")}>Markets</button>
        <button type="button" className={view === "portfolio" ? "on" : ""} aria-current={view === "portfolio" ? "page" : undefined} onClick={() => setView("portfolio")}>Portfolio</button>
        <button type="button" className={view === "faucet" ? "on" : ""} aria-current={view === "faucet" ? "page" : undefined} onClick={() => setView("faucet")}>Faucet</button></nav>
      <button type="button" className="terminal-account-button" onClick={() => setAccountOpen(true)} aria-haspopup="dialog"><span>{accountLabel}</span><small>{networkLabel()}{connected && !trading ? " · Read-only" : ""}</small></button>
    </header>
    <main className="terminal-workspace" id="desk-content">
      <div className="terminal-notices" role="region" aria-label="Notifications">
        {sessionError && <div className="session-error" role="alert"><div className="toast-heading"><strong>Session</strong><button className="toast-close" onClick={clearSessionError} aria-label="Dismiss session notification">×</button></div><p>{sessionError}</p></div>}
        {deploymentFailure() && <p className="session-error" role="alert">Deployment configuration unavailable. Remote signing is paused. {deploymentFailure()}</p>}
        {["wallet", "account"].includes(s.kind) && !trading && <p className="session-error" role="status">{tradingBlocker(s.networkId)}</p>}
        {error && <div className="ledger-error" role="alert"><strong>Ledger unavailable</strong><p>{error}</p><p className="sm">{st ? "Showing the last successful read." : "No ledger data is available yet."} Trading is paused until refresh succeeds.</p><button className="ghost sm" disabled={busy} onClick={() => void refresh()}>Retry ledger read</button></div>}
        <NotificationRegion>{receipt && receipt !== dismissedReceipt && <TransactionToast receipt={receipt} onDismiss={setDismissedReceipt} onView={() => setReceiptViewing(receipt)} paused={receiptViewing === receipt}/>}</NotificationRegion>
        {s.pendingCommand?.() && <div className="ledger-error" role="status"><strong>Check the original transaction</strong><p>New submissions are paused until this command is confirmed or rejected.</p><details><summary>Pending command</summary><code>{s.pendingCommand!()!.commandId}</code></details><button className="ghost sm" disabled={busy} onClick={() => {
          void s.reconcilePending?.().then(async result => {
            const ledger = s.lastReceipt?.();
            setReceipt({phase: result.status === "committed" ? "succeeded" : result.status === "failed" ? "failed" : "unconfirmed",
              label: "Original transaction status", updateId: result.updateId,
              ...(result.status === "committed" && ledger && ledger.updateId === result.updateId ? {ledger} : {}),
              detail: result.status === "pending" ? "No completion was found yet. Keep checking the original command." : undefined});
            await refresh();
          }).catch(e => setReceipt({phase:"unconfirmed",label:"Original transaction status",detail:e.message}));
        }}>Check ledger status</button></div>}
      </div>
      {view === "faucet" && <Faucet session={s} state={st} connected={connected} trading={trading} busy={transactions.busy} readError={error} onConnect={connectionAction} run={run}/>}
      {view === "markets" && <MarketOverview state={st} party={s.party} connected={connected} tradingEnabled={trading && !error}
        pauseReason={error ? "Trading paused until the ledger connection recovers." : undefined} mode={side} onConnect={connectionAction} onRequestPair={openPair} selectedPairId={selectedId} onSelectPair={openPair}/>}
      {view === "portfolio" && <section className="terminal-portfolio"><div className="terminal-market-header"><div><h1>Portfolio</h1><p>Your private positions and issuer-separated holdings.</p></div></div>
        {!connected ? <div className="terminal-empty"><h2>Connect to view your portfolio</h2><p>Your holdings and repo positions stay scoped to your account.</p><button className="seal" onClick={connectionAction}>Connect</button></div>
          : !st ? <p className="empty-state" role="status">{error ? "The ledger view is unavailable." : "Loading your authorized ledger view…"}</p>
          : <><TerminalTabs<"positions" | "holdings" | "activity"> id="portfolio" label="Portfolio content" value={portfolio} onChange={setPortfolio} options={[{value:"positions",label:"Positions"},{value:"holdings",label:"Holdings"},{value:"activity",label:"Activity"}]}/>
            <TerminalPanels id="portfolio" value={portfolio} values={["positions","holdings","activity"]}>
              {portfolio === "positions" ? <Positions s={s} st={st} onRepurchased={() => setPortfolio("activity")}/> : portfolio === "holdings" ? <Balances st={st} party={s.party}/> : <Activity s={s} st={st}/>}</TerminalPanels></>}
      </section>}
      {view === "detail" && <div className="terminal-layout"><section className="terminal-main" aria-label="Selected market">
        <div className="terminal-market-header"><div><button type="button" className="terminal-pair-back" onClick={() => setView("markets")}>All markets</button>
          <h1>{feed ? `${feed.instrument} / ${feed.cashInstrument}` : "Select a market"}</h1><p className="terminal-pair-meta">Canton {networkLabel()} · Test assets · Private bilateral repo</p></div></div>
        <div className="terminal-stats"><div className="terminal-metric"><span>Your quoted rate</span><strong>{bestRate === null ? "On request" : fmtPct(bestRate)}</strong></div>
          <div className="terminal-metric"><span>Simulated collateral mark</span><strong>{selected ? fmtAmount(selected.payload.price) : "—"}</strong><small>{selected ? selected.payload.cashInstrument : connected ? "Awaiting authorized feed" : "Connect to view"}</small></div>
          <div className="terminal-metric"><span>Mark status</span><strong>{selected ? isFresh(selected.payload, DEFAULT_PRICE_AGE_SECONDS) ? "Current" : "Stale" : "Unavailable"}</strong></div>
          <div className="terminal-metric"><span>Your open repos</span><strong>{connected ? positions.length : "—"}</strong></div></div>
        <TerminalTabs<ContentTab> id="market" label="Market content" value={content} options={contentOptions} onChange={setContent}/>
        <TerminalPanels id="market" value={content} values={["overview","offers","positions","activity"]}>
          {content === "overview" ? <div className="terminal-overview"><Panel title="Market overview"><p>Borrow cash against this collateral, or price a request addressed to your account. Each lender agrees a fixed rate and reserves cash for the deal.</p>
            <div className="terminal-overview-summary"><Term label="Repayment">Fixed in each accepted offer</Term><Term label="Rate convention">Simple interest · ACT/360</Term><Term label="Early repurchase">Full agreed repayment</Term>
              {publicDesk && feed?.oracle === publicDesk.operator && <Term label="Lender">{publicDesk.label.replace(/\bdealer\b/gi,"lender")}</Term>}</div>
            <details className="terms-disclosure"><summary>Collateral and closeout terms</summary><p>Settlement transfers collateral title to the lender, with collateral locked while the repo is open. The borrower can top up, propose substitution, or repurchase before the deadline. An uncured margin call needs a fresh post-cure mark below required cover for liquidation. Maturity default is a separate closeout.</p></details>
            {feed && <details className="party-detail"><summary>Market identities</summary><p>Collateral issuer<code>{feed.instrumentIssuer}</code></p><p>Cash issuer<code>{feed.cashIssuer}</code></p><p>Agreed oracle<code>{feed.oracle}</code></p>{selected && <p>Last simulated mark<code>{fmtTime(selected.payload.asOf)}</code></p>}</details>}
          </Panel>{connected && ownRequests.length > 0 && <p className="terminal-trade-note">{ownRequests.length} private request{ownRequests.length === 1 ? "" : "s"} awaiting a quote. Manage your requests in Offers.</p>}</div>
            : !connected ? <div className="terminal-empty"><h2>Your private {content}</h2><p>Connect to see the ledger records authorized for your account.</p><button className="seal" onClick={connectionAction}>Connect</button></div>
            : !scoped ? <p className="empty-state" role="status">{st && !feed ? "Selected market no longer available. Open All markets to choose a visible pair." : error ? "The ledger view is unavailable." : "Loading your authorized ledger view…"}</p>
            : content === "offers" ? <><ReceivedQuotes s={s} st={scoped} onSettled={() => setContent("positions")}/><SentOffers s={s} st={scoped}/></>
            : content === "positions" ? <Positions s={s} st={scoped} onRepurchased={() => setContent("activity")}/> : <Activity s={s} st={scoped}/>}
        </TerminalPanels>
      </section><aside className="terminal-trade" aria-label="Financing action">
        <TerminalTabs<TradeSide> id="trade" label="Financing side" value={side} onChange={setSide} className="terminal-trade-tabs" options={[{value:"borrow",label:"Borrow"},{value:"lend",label:"Lend"}]}/>
        <div className="terminal-trade-panel" role="tabpanel" id="trade-panel-borrow" aria-labelledby="trade-tab-borrow" hidden={side !== "borrow"}>
          {!connected ? <Panel title="Borrow against collateral"><p>Connect to request a private funded offer.</p><button className="seal" onClick={connectionAction}>Connect</button></Panel>
            : !st ? <p className="empty-state" role="status">{error ? "The ledger view is unavailable." : "Loading your account…"}</p>
            : !feed ? <p className="empty-state" role="status">Selected market no longer available. Open All markets to choose a visible pair.</p>
            : <>{trading && <PublicAccess session={s} state={st} busy={transactions.busy} borrowerMode compact run={run}/>}<BorrowRequest s={s} st={st} demoParties={s.kind === "sandbox" ? demoParties : []} initialPair={selectedId} onSubmitted={() => setContent("offers")} onPairChange={setSelectedId}/>{unavailable && <p className="terminal-trade-note" role="status">{unavailable}</p>}</>}
        </div>
        <div className="terminal-trade-panel" role="tabpanel" id="trade-panel-lend" aria-labelledby="trade-tab-lend" hidden={side !== "lend"}>
          {!connected ? <Panel title="Quote a private request"><p>Connect to view requests addressed to your account.</p><button className="seal" onClick={connectionAction}>Connect</button></Panel>
            : !scoped ? <p className="empty-state" role="status">{st && !feed ? "Selected market no longer available. Open All markets to choose a visible pair." : error ? "The ledger view is unavailable." : "Loading your account…"}</p>
            : <><LendRequest s={s} st={scoped} onSubmitted={() => setContent("offers")}/>{unavailable && <p className="terminal-trade-note" role="status">{unavailable}</p>}</>}
        </div>
      </aside></div>}
    </main>
    {receiptViewing && <Dialog title="Transaction receipt" close={() => setReceiptViewing(null)}><ReceiptDetails receipt={receiptViewing}/></Dialog>}
    {accountOpen && <Dialog title="Account" close={() => setAccountOpen(false)} className="terminal-account-dialog">
      <div className="review-terms"><Term label="Account">{connected ? accountLabel : "Not connected"}</Term><Term label="Network">Canton {networkLabel()}</Term><Term label="Access">{connected ? trading ? "Trading enabled" : "Read-only" : "Public market information"}</Term></div>
      {connected && <details className="party-detail"><summary>Full account identity</summary><code>{s.party}</code><p>{s.wallet ?? (s.kind === "account" ? "Hosted HackCanton account" : "LocalNet test account")}</p></details>}
      <div className="ledger-status"><span className="sm muted">{readAt ? `Last ledger read ${readAt.toLocaleTimeString()} · ${Intl.DateTimeFormat().resolvedOptions().timeZone}` : s.kind === "browse" && !s.ledgerRead ? "Connect to read your private ledger view" : error ? "Ledger read failed" : "Reading ledger…"}</span><button className="ghost sm" disabled={busy || s.kind === "browse" && !s.ledgerRead} onClick={() => void refresh()}>Refresh</button></div>
      {receipt && <details className="terms-disclosure"><summary>Latest transaction</summary><ReceiptDetails receipt={receipt}/></details>}
      {!connected && deployment().network !== "localnet" && <button className="seal" onClick={() => { setAccountOpen(false); connect(); }}>Connect account</button>}
      <details className="terms-disclosure"><summary>Advanced account controls</summary><div className="desk-form">
        {s.kind === "account" && s.ownedParties && s.ownedParties.length > 1 && <Field label="Authorized account party" hint="Switching changes the signing identity. Borrow/Lend uses the current account."><select value={s.party} disabled={busy || !!s.pendingCommand?.()} onChange={event => switchParty(event.target.value)}>{s.ownedParties.map(party => <option key={party} value={party}>{partyDisplayName(party)}</option>)}</select></Field>}
        {sandboxModeEnabled() && !publicDesk && (s.kind === "browse" || s.kind === "sandbox") && <Field label="LocalNet test party" hint="Each party reads and signs its own ledger view."><select value={s.kind === "sandbox" ? s.party : ""} disabled={busy || !!s.pendingCommand?.()} onChange={event => { if (event.target.value) switchParty(event.target.value); }}><option value="">Choose a seeded party</option>{demoParties.map(party => <option key={party} value={party}>{partyDisplayName(party)}</option>)}</select>{!demoParties.length && <small>No seeded parties found. Start and seed LocalNet, then reload.</small>}</Field>}
        {connected && <p className="sm muted">The current account remains the signer when you change financing side.</p>}
        {trading && <PublicDeskSetup session={s} onRefresh={refresh}/>}
        {!!ownFeeds.length && <details className="terms-disclosure"><summary>Oracle administration</summary><p className="sm muted">This party owns these feeds and may publish simulated marks.</p>{ownFeeds.map(item => <OracleMark key={feedIdentity(item.payload)} feed={item} s={s}/>)}</details>}
      </div></details>
      {deployment().network === "devnet" && publicDesk && <button className="ghost" onClick={() => { setAccountOpen(false); setView("faucet"); }}>Open faucet</button>}
      {connected && <button className="ghost sm" disabled={busy || !!s.pendingCommand?.()} onClick={disconnect}>Disconnect account</button>}
    </Dialog>}
  </div></Transactions.Provider>;
}
export default function DeskApp() {
  const [viewChoice, setView] = useState<WorkspaceView | null>(() => {
    try {
      const saved = sessionStorage.getItem("symbolon:workspace-view");
      if (saved && ["markets","detail","portfolio","faucet"].includes(saved)) return saved as WorkspaceView;
    } catch { /* Browsing still works when preference storage is unavailable. */ }
    return deployment().publicDesk ? "detail" : null;
  });
  useEffect(() => {
    if (!viewChoice) return;
    try { sessionStorage.setItem("symbolon:workspace-view",viewChoice); } catch { /* Optional UI preference only. */ }
  }, [viewChoice]);
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
        if (active && restored) setSession((current) => current.kind !== "browse" ? current : restored);
        else { const party = await publicReadParty(); if (active && party) setSession((current) => current.kind !== "browse" ? current : browseSession(party)); }
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
    if(session.kind==="account"){
      void connectAccount(party).then(next=>{if(next){setSession(next);setSessionError(null);}}).catch(e=>setSessionError(e.message));return;
    }
    if (!sandboxModeEnabled() || !demoParties.includes(party)) return;
    setSession(connectSandbox(party)); setSessionError(null);
  };
  return <>
    <Workspace key={`${session.kind}:${session.party}`} session={session} connect={() => setConnecting(true)} demoParties={demoParties} switchParty={switchParty} disconnect={() => void disconnect()}
      viewChoice={viewChoice} setView={setView} sessionError={sessionError} clearSessionError={() => setSessionError(null)} />
    {connecting && <ConnectDialog close={() => setConnecting(false)} connected={(s) => { setSession(s); setConnecting(false); setSessionError(null); }} />}
  </>;
}
