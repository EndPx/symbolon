import { useEffect, useRef } from "react";

const GITHUB = "https://github.com/EndPx/symbolon";

// Adds .lit when the element scrolls into view — drives the page's one
// authored motion (the visibility record assembling).
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("lit");
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

const MECHANISM = [
  {
    term: "Request",
    desc: "One private note per dealer — there is no order book to post to, and no one can read your shortlist.",
  },
  {
    term: "Quote",
    desc: "Each dealer prices you alone. A quote arrives funded: the cash that will settle it is already escrowed into your view.",
  },
  {
    term: "Strike",
    desc: "Acceptance is settlement. Collateral title and cash move in one atomic transaction; the repurchase price is fixed then and forever.",
  },
  {
    term: "Terms",
    desc: "Fixed rate, ACT/360, any date you both sign. No bucket tenors, no curve — the price is the agreement.",
  },
];

const LIFECYCLE = [
  {
    term: "Margin call",
    desc: "The dealer cannot call at will: the contract re-marks the position against the oracle feed both sides agreed to, and a healthy position refuses the call.",
  },
  {
    term: "Cure",
    desc: "Top up within the window. A cure that does not restore the margin at the current mark is rejected by the ledger, not by a UI.",
  },
  {
    term: "Substitution",
    desc: "Swap collateral mid-term without breaking the trade — the old collateral goes home, the position survives. Order books don't have a word for this.",
  },
  {
    term: "Default",
    desc: "There is nothing to liquidate. Title transferred at settlement; the dealer already owns the collateral, and the position simply closes.",
  },
];

const TICKET: Array<{ label: string; value: string; rate?: boolean }> = [
  { label: "Purchase price", value: "1,000.00 CUSD" },
  { label: "Repurchase price", value: "1,004.33 CUSD" },
  { label: "Rate — fixed at strike", value: "5.20% p.a.", rate: true },
  { label: "Tenor", value: "30 days" },
  { label: "Collateral", value: "15.00 CETH · title transfers" },
  { label: "Margin threshold", value: "105%" },
];

const VIZ_ROWS: Array<{
  fact: string;
  you: string;
  a: string;
  b: string;
  print?: boolean;
}> = [
  { fact: "Your request", you: "sent to A and B", a: "received", b: "received" },
  { fact: "Dealer A's quote", you: "5.20% p.a.", a: "5.20% p.a.", b: "—" },
  { fact: "Dealer B's quote", you: "5.55% p.a.", a: "—", b: "5.55% p.a." },
  { fact: "The strike", you: "settled · T+0", a: "settled · T+0", b: "—" },
  { fact: "The printed rate", you: "5.20%", a: "5.20%", b: "—", print: true },
];

function Cell({ v }: { v: string }) {
  if (v === "—") return <td className="na">—</td>;
  const numeric = /\d/.test(v);
  return <td>{numeric ? <span className="fig">{v}</span> : v}</td>;
}

export default function App() {
  const vizRef = useReveal<HTMLDivElement>();

  // On narrow screens the table scrolls horizontally and Dealer B's empty
  // column — the punchline — starts off-screen. Once the record has
  // assembled, glide the view to rest on the emptiness.
  useEffect(() => {
    const wrap = vizRef.current;
    if (!wrap) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        if (wrap.scrollWidth <= wrap.clientWidth + 8) return;
        const reduced = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        window.setTimeout(
          () =>
            wrap.scrollTo({
              left: wrap.scrollWidth,
              behavior: reduced ? "auto" : "smooth",
            }),
          reduced ? 0 : 1600,
        );
      },
      { threshold: 0.3 },
    );
    io.observe(wrap);
    return () => io.disconnect();
  }, [vizRef]);

  return (
    <>
      <nav className="nav" aria-label="Main">
        <div className="shell">
          <a className="brand" href="/">
            <img src="/brand/logo-mark.png" alt="" />
            <span>SYMBOLON</span>
          </a>
          <a className="link" href="#mechanism">
            Mechanism
          </a>
          <a className="link" href="#visibility">
            Visibility
          </a>
          <a className="link" href="#lifecycle">
            Lifecycle
          </a>
          <a className="link" href="#proof">
            Proof
          </a>
          <a className="link keep" href={GITHUB} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        </div>
      </nav>

      <header className="hero">
        <img
          className="hero-art"
          src="/brand/hero.png"
          alt="Two merchants on a marble quay at dusk sealing a deal over a split gold coin, beneath a cracked gold sun above an Aegean harbor city."
        />
        <div className="hero-scrim" aria-hidden="true" />
        <div className="hero-content">
          <div className="shell">
            <div className="hero-inner">
              <h1>The rate is nobody's business.</h1>
              <p>
                Symbolon is a bilateral repo desk on Canton Network. Ask each
                dealer for a price in private; the rate is fixed the moment you
                strike — and a losing dealer never learns a trade happened at
                all.
              </p>
              <div className="cta-row">
                <a className="seal" href="#proof">
                  See it proven on-ledger
                </a>
                <a className="quiet" href={GITHUB} target="_blank" rel="noreferrer">
                  Read the source ↗
                </a>
              </div>
              <p className="hero-receipts">
                contracts live · dpm test 3/3 · canton 3.5.6 sandbox: SUCCESS
              </p>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="band" id="mechanism">
          <div className="shell">
            <h2>
              <span className="sk">Schedule I · </span>The mechanism
            </h2>
            <div className="mech-grid">
              <dl className="rows">
                {MECHANISM.map((r) => (
                  <div key={r.term}>
                    <dt>{r.term}</dt>
                    <dd>{r.desc}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <aside className="ticket" aria-label="Indicative term sheet">
                  <header>Indicative term sheet</header>
                  <dl>
                    {TICKET.map((t) => (
                      <div key={t.label} className={t.rate ? "rate" : undefined}>
                        <dt>{t.label}</dt>
                        <dd>{t.value}</dd>
                      </div>
                    ))}
                  </dl>
                </aside>
                <p className="ticket-note">Illustration — simulated figures.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="band band-ink" id="visibility">
          <div className="shell">
            <h2>
              <span className="sk">Schedule II · </span>The losing dealer learns
              nothing
            </h2>
            <p className="lede">
              Three parties, one trade. This is the entire record each of them
              can see — not by policy, but because Canton never delivers the
              data to the other node.
            </p>
            <div className="viz-wrap" ref={vizRef}>
              <table className="viz">
                <thead>
                  <tr>
                    <th scope="col" aria-label="Fact"></th>
                    <th scope="col">You — borrower</th>
                    <th scope="col">Dealer A — won</th>
                    <th scope="col">Dealer B — lost</th>
                  </tr>
                </thead>
                <tbody>
                  {VIZ_ROWS.map((r) => (
                    <tr key={r.fact} className={r.print ? "print" : undefined}>
                      <td>{r.fact}</td>
                      <Cell v={r.you} />
                      <Cell v={r.a} />
                      <Cell v={r.b} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="viz-note">
              Simulated illustration. The blanks are the product — asserted
              per-party in{" "}
              <a
                href={`${GITHUB}/blob/main/daml-test/Symbolon/Test/EndToEnd.daml`}
                target="_blank"
                rel="noreferrer"
              >
                repoLifecycle ↗
              </a>
            </p>
          </div>
        </section>

        <section className="band" id="lifecycle">
          <div className="shell">
            <h2>
              <span className="sk">Schedule III · </span>After the trade
            </h2>
            <p className="lede">Order books stop at the trade. A desk begins there.</p>
            <dl className="rows" style={{ marginTop: 54 }}>
              {LIFECYCLE.map((r) => (
                <div key={r.term}>
                  <dt>{r.term}</dt>
                  <dd>{r.desc}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="band band-ink" id="proof">
          <div className="shell">
            <h2>
              <span className="sk">Schedule IV · </span>Proven, not promised
            </h2>
            <div className="receipts">
              <div className="receipt">
                <span>repoLifecycle — 29 transactions · privacy asserted per party</span>
                <span className="ok">ok</span>
              </div>
              <div className="receipt">
                <span>repoHappyPath — 9 transactions · every balance checked</span>
                <span className="ok">ok</span>
              </div>
              <div className="receipt">
                <span>canton 3.5.6 sandbox · both flows, wall-clock time</span>
                <span className="ok">offset 10 → 187</span>
              </div>
            </div>
            <div className="cmd">
              <span className="dim"># the whole lifecycle, on a fresh ledger</span>
              {"\n"}cd daml-test && dpm test
            </div>
            <p className="proof-close">
              Every mechanism on this page runs today, in the open — the margin
              call that refuses, the substitution that survives, the empty
              column above. Each is an assertion in{" "}
              <a href={GITHUB} target="_blank" rel="noreferrer">
                the repository ↗
              </a>
              , reproducible with one command.
            </p>
          </div>
        </section>

        <section className="band">
          <div className="shell">
            <div className="name-block">
              <img src="/brand/logo-mark.png" alt="The Symbolon mark: a gold coin broken in two." />
              <p>
                A <strong>symbolon</strong> was a contract token broken in two —
                each party kept a half, and only the matching halves proved the
                deal. To anyone else, a half meant nothing. Twenty-five
                centuries later, that is still the correct design.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="shell">
          <span>© 2026 Symbolon · Built on Canton Network</span>
          <span>
            <a href={GITHUB} target="_blank" rel="noreferrer">
              GitHub ↗
            </a>
            {" · "}All market figures on this page are simulated.
          </span>
        </div>
      </footer>
    </>
  );
}
