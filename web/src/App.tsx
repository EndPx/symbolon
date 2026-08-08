import { createElement, useEffect, useRef, useState } from "react";

const GITHUB = "https://github.com/EndPx/symbolon";

// <model-viewer> is a custom element; createElement sidesteps JSX typings.
// The library itself (three.js inside) lazy-loads after first paint, so the
// main bundle stays lean and the PNG poster covers the wait.
function ModelViewer(props: Record<string, unknown>) {
  return createElement("model-viewer", props);
}

// A pool of lamplight follows the cursor across a grid of cards. One listener
// per grid writing two CSS variables — no re-render, no animation library.
// Skipped entirely on touch, where there is no cursor to follow.
function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(hover: hover)").matches) return;
    const onMove = (e: PointerEvent) => {
      const card = (e.target as Element).closest<HTMLElement>("[data-spot]");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, []);
  return ref;
}

// Adds .lit when the element scrolls into view — drives the page's one
// authored motion (the rate chart drawing itself).
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
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

const WHY = [
  {
    title: "Nobody watches you trade",
    body: "Your deal is visible to exactly two parties: you and your dealer. Other dealers can't see your price — or that you traded at all.",
  },
  {
    title: "One price, locked",
    body: "The rate you shake hands on is the rate you pay. It cannot drift overnight, and it cannot be changed by anyone.",
  },
  {
    title: "Your collateral comes home",
    body: "Pledge it, take your cash, buy it back on the agreed day. Need that exact asset mid-way? Swap it for another — the deal survives.",
  },
  {
    title: "Built on Canton",
    body: "The network serious financial institutions run on. Privacy here isn't a promise in a policy — it's how the rails are built.",
  },
];

const STEPS = [
  {
    img: "/brand/step-ask.jpg",
    alt: "Two merchants meeting on a quay",
    title: "Ask around, quietly",
    body: "Pick your dealers and ask each one for a price. Every conversation is separate — and private.",
  },
  {
    img: "/brand/step-lock.jpg",
    alt: "A split gold coin glowing",
    title: "Shake hands on a rate",
    body: "Take the offer you like. The price locks the moment you accept, and money changes hands instantly.",
  },
  {
    img: "/brand/step-safe.jpg",
    alt: "A marble temple on the hillside",
    title: "Sleep through the storm",
    body: "Markets move; your rate doesn't. If your collateral's value dips, you simply top it up within a fair window.",
  },
  {
    img: "/brand/step-home.jpg",
    alt: "Ships resting in the harbor",
    title: "Buy it back",
    body: "On the agreed day, pay the agreed price — and your collateral sails home. Done.",
  },
];

const FAQ = [
  {
    q: "What exactly is a repo?",
    a: "Think of a pawn shop between professionals: you sell an asset today and agree — in the same breath — to buy it back at a fixed price on a fixed date. The gap between the two prices is the interest, known from second one.",
  },
  {
    q: "Who can see my trade?",
    a: "You, your dealer, and the price source you both agreed on. Not other dealers, not other users, not a public explorer. On Canton the data never even reaches anyone else's servers.",
  },
  {
    q: "What if my collateral drops in value?",
    a: "Your dealer asks you to top up, and you get a window to do it. The contract itself checks the numbers — nobody can call you unfairly, and a healthy position can't be touched.",
  },
  {
    q: "What if I can't pay at the end?",
    a: "The dealer simply keeps the collateral — it has been legally theirs since the day the deal was struck. No panic auctions, no cascading liquidations.",
  },
  {
    q: "Is this real, or a mock-up?",
    a: "The engine is real: every flow on this page has been executed on a live Canton ledger, and the receipts live in the open-source repository.",
  },
  {
    q: "When can I trade?",
    a: "The desk opens with HackCanton Season 3. The contracts are already built and proven — the door just isn't open yet.",
  },
];

// The floating line wanders; the fixed one doesn't. Simulated paths — the
// honesty label sits right under the chart.
const FLOAT_PATH =
  "M20,150 L60,96 L100,168 L140,64 L180,142 L220,208 L260,112 L300,252 L340,150 L380,84 L420,196 L460,246 L500,124 L540,214 L580,96 L620,164";
const FIXED_PATH = "M20,182 L620,182";

export default function App() {
  const chartRef = useReveal<HTMLDivElement>();
  const whyRef = useSpotlight<HTMLDivElement>();
  const stepRef = useSpotlight<HTMLDivElement>();
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    import("@google/model-viewer");
  }, []);

  // Hold a parchment veil until the hero painting has actually decoded, so
  // the first thing anyone sees is never a half-rendered PNG. The timeout is
  // the escape hatch: a slow network gets the page anyway, progressively.
  const [heroReady, setHeroReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const done = () => {
      if (alive) setHeroReady(true);
    };
    const img = new Image();
    img.src = "/brand/hero.png";
    img.decode().then(done).catch(done);
    const t = window.setTimeout(done, 3500);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, []);

  return (
    <>
      <div
        className={heroReady ? "veil done" : "veil"}
        role="status"
        aria-label="Loading Symbolon"
        aria-hidden={heroReady}
      >
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="42" fill="#c9a227" />
          <circle
            cx="50"
            cy="50"
            r="31"
            fill="none"
            stroke="#f4e9ce"
            strokeWidth="2.5"
            opacity="0.75"
          />
          <polyline
            points="55,4 44,31 58,52 45,74 51,97"
            fill="none"
            stroke="#f4e9ce"
            strokeWidth="7"
          />
        </svg>
      </div>

      <nav className="nav" aria-label="Main">
        <div className="shell">
          <a className="brand" href="/">
            <img src="/brand/logo-mark.png" alt="" />
            <span>SYMBOLON</span>
          </a>
          <a className="link" href="#why">
            Why Symbolon
          </a>
          <a className="link" href="#how">
            How it works
          </a>
          <a className="link" href="#rates">
            Rates
          </a>
          <a className="link keep" href="#faq">
            FAQ
          </a>
          <span
            className="pending"
            title="The desk application opens with HackCanton Season 3 — the contracts already run"
          >
            The desk · soon
          </span>
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
              <h1>
                <span className="accent">Canton</span> conceals.
                <br />
                <span className="accent">Symbolon</span> deals.
              </h1>
              <p>
                Quote in private. Strike a fixed rate. No one else ever knows.
              </p>
              <div className="cta-row">
                <a className="seal" href="#why">
                  See how it works
                </a>
                <a className="quiet" href={GITHUB} target="_blank" rel="noreferrer">
                  Read the source ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="band" id="why">
          <div className="shell">
            <h2>Borrowing, the way it should feel</h2>
            <p className="lede">
              Private, predictable, and done in minutes — on rails built for
              institutions.
            </p>
            <div className="card-grid" ref={whyRef}>
              {WHY.map((c) => (
                <div className="card" data-spot key={c.title}>
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="band" id="how">
          <div className="shell">
            <h2>How it works</h2>
            <p className="lede">
              Four steps, start to finish. No order books, no waiting rooms.
            </p>
            <div className="step-grid" ref={stepRef}>
              {STEPS.map((s, i) => (
                <div className="step-card" data-spot key={s.title}>
                  <img src={s.img} alt={s.alt} loading="lazy" />
                  <div className="step-body">
                    <h3>
                      <span className="step-no">{i + 1}</span>
                      {s.title}
                    </h3>
                    <p>{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="band" id="rates">
          <div className="shell">
            <h2>Why a fixed rate?</h2>
            <p className="lede">
              Most crypto lending floats: your rate changes every hour, and a
              calm market can still ruin your week — the rate itself is the
              risk. Fixing it removes that whole category.
            </p>
            <div className="chart-wrap" ref={chartRef}>
              <svg
                className="chart"
                viewBox="0 0 640 300"
                role="img"
                aria-label="A jagged floating-rate line swings wildly while the fixed-rate line stays flat."
              >
                <line x1="20" y1="60" x2="620" y2="60" className="grid" />
                <line x1="20" y1="150" x2="620" y2="150" className="grid" />
                <line x1="20" y1="240" x2="620" y2="240" className="grid" />
                <path d={FLOAT_PATH} className="line-float" pathLength={1000} />
                <path d={FIXED_PATH} className="line-fixed" pathLength={1000} />
              </svg>
              <div className="chart-legend">
                <span className="key key-fixed">Symbolon — fixed the day you strike</span>
                <span className="key key-float">Floating — wherever the market drags it</span>
              </div>
              <p className="chart-note">
                Illustration — simulated paths, drawn to the shape of real
                floating-rate swings.
              </p>
            </div>
          </div>
        </section>

        <section className="band" id="faq">
          <div className="shell">
            <h2>Questions, answered</h2>
            <div className="faq-list">
              {FAQ.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>
                    {f.a}
                    {f.q.startsWith("Is this real") && (
                      <>
                        {" "}
                        <a href={GITHUB} target="_blank" rel="noreferrer">
                          See it on GitHub ↗
                        </a>
                      </>
                    )}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="band">
          <div className="shell">
            <div className="name-block">
              <ModelViewer
                src="/brand/logo.glb"
                poster="/brand/logo-mark.png"
                alt="The Symbolon mark: a gold coin broken in two, slowly turning."
                {...(reducedMotion
                  ? {}
                  : { "auto-rotate": true, "rotation-per-second": "24deg" })}
                interaction-prompt="none"
                disable-zoom={true}
                shadow-intensity="0"
              />
              <p>
                A <strong>symbolon</strong> was a contract token broken in two —
                each party kept a half, and only the matching halves proved the
                deal. To anyone else, a half meant nothing. Twenty-five
                centuries later, that is still the correct design.
              </p>
            </div>
          </div>
        </section>

        <section className="closing">
          <img
            className="closing-art"
            src="/brand/closing.png"
            alt="Two sculpted hands reach up from the dark toward the glowing split gold coin of the Symbolon mark."
          />
          <div className="closing-content">
            <h2 className="closing-head">
              Sealed on <span>Canton</span>.
              <br />
              Settled by <span>Symbolon</span>.
            </h2>
            <a className="seal" href={GITHUB} target="_blank" rel="noreferrer">
              Read the source ↗
            </a>
          </div>
          <footer className="closing-footer">
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
        </section>
      </main>
    </>
  );
}
