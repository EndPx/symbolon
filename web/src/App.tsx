import {
  createElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { RATE_SERIES, RATE_SOURCE } from "./rates";

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

// Drives the page's one authored motion: the rate chart drawing itself.
//
// The hiding is applied by JS (.armed) rather than sitting in the stylesheet,
// so a browser that never runs this — JS off, a script error, a crawler —
// still gets the finished chart instead of an empty frame. useLayoutEffect
// arms it before paint, so nobody sees the line flash in first.
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add("armed");
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
    title: "Your position stays private",
    body: "Nobody can see how much you borrowed, at what rate, or that you borrowed at all. On every public chain, your whole position is readable by anyone.",
  },
  {
    title: "Your rate never moves",
    body: "It's fixed the moment you borrow. On variable-rate protocols your interest can double overnight while the market sits still.",
  },
  {
    title: "You choose the end date",
    body: "Borrow for 23 days or 6 months — any date you and your lender agree on. No standard monthly buckets, no auto-rollover you didn't ask for.",
  },
  {
    title: "Swap collateral without closing",
    body: "Need that exact token back mid-loan? Replace it with another asset of equal value. Your loan keeps running, same rate, same end date.",
  },
];

const STEPS = [
  {
    img: "/brand/step-ask.jpg",
    alt: "Two merchants meeting on a quay",
    title: "Deposit collateral",
    body: "Put up the asset you want to borrow against — cETH, cBTC, a tokenised bond. Only you and your lender can see it.",
  },
  {
    img: "/brand/step-lock.jpg",
    alt: "A split gold coin glowing",
    title: "Borrow at a fixed rate",
    body: "Ask a few lenders for a rate, privately and separately. Take the best one. Your rate and end date lock the moment you accept.",
  },
  {
    img: "/brand/step-safe.jpg",
    alt: "A marble temple on the hillside",
    title: "Monitor your position",
    body: "If your collateral falls in value, your lender asks you to top up and you get a set window to do it. A healthy position can't be touched.",
  },
  {
    img: "/brand/step-home.jpg",
    alt: "Ships resting in the harbor",
    title: "Repay and get it back",
    body: "On the end date, repay exactly what you agreed at the start — not a cent more — and your collateral returns to you.",
  },
];

const FAQ = [
  {
    q: "What is Symbolon?",
    a: "Symbolon is the fixed-rate credit layer for Canton. You post collateral, agree a rate and an end date directly with a lender, and settle on-chain — with nobody else able to see the size, the rate, or that the loan happened.",
  },
  {
    q: "How does privacy work on Symbolon?",
    a: "Canton doesn't broadcast transactions to everyone; it delivers them only to the parties involved. So a lender you asked but didn't borrow from receives nothing at all — not an encrypted copy, not a hidden entry. There is no public explorer where your position can be looked up.",
  },
  {
    q: "What can I borrow against?",
    a: "Any asset issued on Canton that you and your lender both accept — cBTC, cETH, tokenised treasuries and funds. Because every loan is agreed one-to-one, you're not limited to a preset list of markets.",
  },
  {
    q: "How do I get started?",
    a: "Connect a Canton wallet, deposit the asset you want to borrow against, and request rates from lenders. There is no signup, no account to fund first, and no deposit held by us — Symbolon never takes custody of your assets.",
  },
  {
    q: "What happens if my collateral drops in value?",
    a: "Your lender can ask you to top up, and you get an agreed window to do it. The contract checks the price itself against a feed you both signed up to, so a healthy position cannot be called and a top-up that doesn't fix the shortfall is rejected.",
  },
  {
    q: "What fees and risks should I review?",
    a: "Symbolon charges no protocol fee today. The real risks are the ordinary ones: your collateral can fall in value and require a top-up, and if you don't repay by the end date the lender keeps the collateral. Rates are fixed, so interest-rate risk is the one thing you don't carry.",
  },
  {
    q: "Where can I follow Symbolon's progress?",
    a: "Everything is open source and built in public — contracts, tests, and the on-chain proof runs.",
    link: true,
  },
];

// The variable line is a real year of Aave V3 USDC rates (see rates.ts and
// scripts/fetch-rates.ps1). The flat line sits at that year's average, which
// is the fairest stand-in for a rate someone would have fixed on day one.
const CHART = { w: 640, h: 300, padL: 46, padR: 20, padT: 24, padB: 34, top: 14 };

function chartY(rate: number) {
  const inner = CHART.h - CHART.padT - CHART.padB;
  return CHART.padT + inner - (rate / CHART.top) * inner;
}

const VARIABLE_PATH = RATE_SERIES.map(([, rate], i) => {
  const innerW = CHART.w - CHART.padL - CHART.padR;
  const x = CHART.padL + (i / (RATE_SERIES.length - 1)) * innerW;
  return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${chartY(rate).toFixed(1)}`;
}).join(" ");

const FIXED_PATH = `M${CHART.padL},${chartY(RATE_SOURCE.avg).toFixed(1)} L${
  CHART.w - CHART.padR
},${chartY(RATE_SOURCE.avg).toFixed(1)}`;

const GRID_LINES = [0, 4, 8, 12];

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

  // The browser applies a URL hash before React has rendered anything, so a
  // shared link to #rates or #faq would silently land at the top of the page.
  // Re-apply it once the veil is gone and the layout has settled.
  useEffect(() => {
    if (!heroReady) return;
    const id = window.location.hash.slice(1);
    if (!id) return;
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "instant", block: "start" });
  }, [heroReady]);

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
                Fixed-rate borrowing and lending on Canton. Your rate, your
                size, and your position stay private.
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

        <section className="band band-center" id="rates">
          <div className="shell">
            <h2>Why a fixed rate?</h2>
            <p className="lede">
              On most lending protocols your rate is recalculated constantly
              from how much of the pool is borrowed. Here is what that actually
              looked like on USDC — the largest, calmest market in DeFi — over
              the past year.
            </p>
            <div className="chart-wrap" ref={chartRef}>
              <svg
                className="chart"
                viewBox={`0 0 ${CHART.w} ${CHART.h}`}
                role="img"
                aria-label={`Aave V3 USDC lending rate from ${RATE_SOURCE.from} to ${RATE_SOURCE.to}, swinging between ${RATE_SOURCE.min}% and ${RATE_SOURCE.max}%, against a flat fixed rate at ${RATE_SOURCE.avg}%.`}
              >
                {GRID_LINES.map((r) => (
                  <g key={r}>
                    <line
                      x1={CHART.padL}
                      y1={chartY(r)}
                      x2={CHART.w - CHART.padR}
                      y2={chartY(r)}
                      className="grid"
                    />
                    <text x={CHART.padL - 10} y={chartY(r) + 4} className="axis">
                      {r}%
                    </text>
                  </g>
                ))}
                <path d={VARIABLE_PATH} className="line-float" pathLength={1000} />
                <path d={FIXED_PATH} className="line-fixed" pathLength={1000} />
              </svg>
              <div className="chart-legend">
                <span className="key key-fixed">
                  A rate fixed on day one — flat for the whole term
                </span>
                <span className="key key-float">
                  {RATE_SOURCE.label} — the variable rate, as it happened
                </span>
              </div>
              <p className="chart-stat">
                It ranged from <strong>{RATE_SOURCE.min}%</strong> to{" "}
                <strong>{RATE_SOURCE.max}%</strong>, and once moved{" "}
                <strong>{RATE_SOURCE.biggestDailyMove} points in a single day</strong>{" "}
                ({RATE_SOURCE.biggestMoveDate}). If you were borrowing that week,
                your interest bill quadrupled while you slept.
              </p>
              <p className="chart-note">
                Real data · {RATE_SOURCE.from} – {RATE_SOURCE.to} · source:{" "}
                <a
                  href="https://defillama.com/yields/pool/aa70268e-4b52-42bf-a116-608b370f9501"
                  target="_blank"
                  rel="noreferrer"
                >
                  DefiLlama
                </a>
                . The flat line sits at the period average ({RATE_SOURCE.avg}%) —
                the fairest stand-in for a rate agreed on day one.
              </p>
            </div>
          </div>
        </section>

        <section className="band" id="faq">
          <div className="shell">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-list">
              {FAQ.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>
                    {f.a}
                    {f.link && (
                      <>
                        {" "}
                        <a href={GITHUB} target="_blank" rel="noreferrer">
                          Follow along on GitHub ↗
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
