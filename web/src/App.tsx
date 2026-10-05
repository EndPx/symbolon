import {
  createElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { RATE_SERIES, RATE_SOURCE } from "./rates";

const GITHUB = "https://github.com/EndPx/symbolon";
const DOCS = "https://symbolon.gitbook.io/symbolon-docs/";

// Load the optional 3D enhancement only when the footer mark approaches.
// The same PNG remains available while loading, or if the library fails.
function DeferredMark({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    let active = true;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      void import("@google/model-viewer")
        .then(() => { if (active) setReady(true); })
        .catch(() => { /* The static mark is the fallback for this enhancement. */ });
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => { active = false; io.disconnect(); };
  }, []);
  return <div className="name-mark" ref={ref}>
    {ready ? createElement("model-viewer", {
      src: "/brand/logo.glb",
      poster: "/brand/logo-mark.png",
      alt: "The Symbolon mark: a gold coin broken in two.",
      ...(reducedMotion ? {} : { "auto-rotate": true, "rotation-per-second": "24deg" }),
      "interaction-prompt": "none",
      "disable-zoom": true,
      "shadow-intensity": "0",
    }) : <img src="/brand/logo-mark.png" alt="The Symbolon mark: a gold coin broken in two." width="210" height="210" loading="lazy" />}
  </div>;
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

// Four marks drawn as plain geometry in one stroke weight — the same
// diagram language as the rate chart, not an icon set bolted on. Terracotta
// is the structural accent here; gold stays reserved for money and action.
const MARKS: Record<string, string[]> = {
  // a line that runs into a sealed gap and comes out the other side
  private: ["M2,12 H7", "M17,12 H22", "M9,6 V18", "M15,6 V18"],
  // a flat span, pinned at both ends
  fixed: ["M3,12 H21", "M3,8 V16", "M21,8 V16"],
  // a marker post standing on a timeline
  date: ["M2,17 H22", "M15,17 V7", "M11,7 H19"],
  // two things trading places
  swap: ["M4,9 H17", "M14,6 L17,9 L14,12", "M20,15 H7", "M10,12 L7,15 L10,18"],
};

function Mark({ name }: { name: string }) {
  return (
    <svg className="card-mark" viewBox="0 0 24 24" aria-hidden="true">
      {MARKS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

const WHY = [
  {
    mark: "private",
    title: "Your position stays private",
    body: "Each dealer receives its own request. A dealer whose quote you do not accept cannot read your position or the rate you agreed with another dealer.",
  },
  {
    mark: "fixed",
    title: "Your rate never moves",
    body: "Your annualized rate and repurchase price are fixed when the repo settles. Interest uses actual days over a 360-day year.",
  },
  {
    mark: "date",
    title: "You choose the end date",
    body: "Choose a tenor from 1 to 365 days and request a dealer quote. Maturity starts at settlement, with no automatic rollover.",
  },
  {
    mark: "swap",
    title: "Swap collateral without closing",
    body: "Propose replacement collateral before a deadline. If the dealer accepts and the agreed margin is met, the assets swap while the repo keeps its rate and maturity.",
  },
];

// Four purpose-painted vignettes following one sealed amphora — deposited,
// priced, weighed, carried home — so the row reads as a sequence rather than
// four unrelated crops.
const STEPS = [
  {
    img: "/brand/step-1.jpg",
    alt: "Two pairs of hands lowering a sealed clay amphora into a marble niche",
    title: "Choose your collateral",
    body: "Select an available holding and an agreed oracle feed. This prototype uses demo assets and manually published prices.",
  },
  {
    img: "/brand/step-2.jpg",
    alt: "Hands over a marble table — one sliding a stack of gold coins across, the other holding a gold coin split in two",
    title: "Borrow at a fixed rate",
    body: "Request quotes from dealers separately. Review the repurchase price, then accept to transfer collateral and receive cash in one transaction.",
  },
  {
    img: "/brand/step-3.jpg",
    alt: "A bronze balance scale weighing the sealed amphora against a heap of gold coins, a storm gathering over the sea behind",
    title: "Monitor your position",
    body: "A dealer can issue a margin call when a fresh mark from the agreed oracle shows a shortfall. Top up within the agreed cure window.",
  },
  {
    img: "/brand/step-4.jpg",
    alt: "A merchant carrying the sealed amphora away from a now-empty marble niche, a whole gold coin glowing above",
    title: "Repurchase and close",
    body: "Pay the full agreed repurchase price before maturity and before any cure deadline expires to receive your collateral back. Early closing does not reduce the interest.",
  },
];

const FAQ = [
  {
    q: "What is Symbolon?",
    a: "Symbolon is a confidential bilateral repo desk on Canton. You sell collateral to a dealer for a purchase price and agree to repurchase it for a fixed amount. The desk covers quotes, settlement, margin calls, collateral substitution and closure.",
  },
  {
    q: "How does privacy work on Symbolon?",
    a: "Canton distributes contract data according to party authorization. RFQs are separate for each dealer, and repo positions belong to their two counterparties. In the current demo asset model, the asset issuer also sees asset movements; that is a separate boundary from repo terms.",
  },
  {
    q: "What can I borrow against?",
    a: "The current prototype trades Symbolon demo holdings from an agreed issuer, with an oracle feed for the collateral and cash pair. Real CIP-56 and Splice token integration is still pending; token names in the demo do not represent real deposited assets.",
  },
  {
    q: "How do I get started?",
    a: "Connect a supported Canton wallet with access to the participant hosting Symbolon. Your party needs provisioned demo holdings and readable oracle feeds. Then enter your dealer party IDs and request quotes. The local development demo also provides seeded parties for exploring each role.",
  },
  {
    q: "What happens if my collateral drops in value?",
    a: "The dealer may issue a margin call when a fresh agreed mark shows insufficient coverage. After the cure deadline, liquidation needs a new post-cure mark showing that the shortfall remains. Maturity default is a separate outcome, available only when the agreed maturity has been reached. This prototype releases pledged collateral to the dealer; it does not model a collateral sale or surplus accounting.",
  },
  {
    q: "What fees and risks should I review?",
    a: "The prototype has no Symbolon protocol fee. Its repo rate is annualized using ACT/360, and the full repurchase price is due even on an early close. Collateral value, oracle accuracy, counterparty performance and contract defects remain risks. Demo assets and simulated marks are not a live market offering.",
  },
  {
    q: "Where can I follow Symbolon's progress?",
    a: "Everything is open source and built in public — contracts, tests, and the on-chain proof runs.",
    link: true,
  },
];

// The variable line is a real year of Aave V3 USDC rates (see rates.ts and
// scripts/fetch-rates.ps1). The flat line sits at that year's average, which
// is an illustration only; it is not an executable Symbolon quote.
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
    img.fetchPriority = "high";
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
          <defs>
            <clipPath id="veil-left">
              <path d="M55,4 L44,31 L58,52 L45,74 L51,97 L-20,97 L-20,4 Z" />
            </clipPath>
            <clipPath id="veil-right">
              <path d="M55,4 L44,31 L58,52 L45,74 L51,97 L120,97 L120,4 Z" />
            </clipPath>
          </defs>
          <g className="veil-half veil-l" clipPath="url(#veil-left)">
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
          </g>
          <g className="veil-half veil-r" clipPath="url(#veil-right)">
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
          </g>
        </svg>
      </div>

      <nav className="nav" aria-label="Main">
        <div className="shell">
          <a className="brand" href="/" aria-label="Symbolon home">
            <img src="/brand/logo-mark.png" alt="" />
            <span>SYMBOLON</span>
          </a>
          <a className="link" href="#why">
            Why Symbolon
          </a>
          <a className="link keep" href="#how">
            How it works
          </a>
          <a className="link" href="#rates">
            Rates
          </a>
          <a className="link" href="#faq">
            FAQ
          </a>
          <a className="link" href={DOCS}>Docs</a>
          <a className="link keep app-link" href="/app">
            Open app
          </a>
        </div>
      </nav>

      <header className="hero">
        <img
          className="hero-art"
          src="/brand/hero.png"
          fetchPriority="high"
          width="1672"
          height="941"
          alt="Two merchants on a marble quay at dusk sealing a deal over a split gold coin, beneath a cracked gold sun above an Aegean harbor city."
        />
        <div className="hero-scrim" aria-hidden="true" />
        <div className={heroReady ? "hero-content lift" : "hero-content"}>
          <div className="shell">
            <div className="hero-inner">
              <h1>
                <span className="accent">Canton</span> conceals.
                <br />
                <span className="accent">Symbolon</span> deals.
              </h1>
              <p>
                Private repo agreements on Canton. A fixed repurchase price,
                atomic settlement, and the full collateral lifecycle.
              </p>
              <div className="cta-row">
                <a className="seal" href="/app">
                  Open the desk
                </a>
                <a className="quiet" href="/demo">
                  Try the guided walkthrough
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="band band-center" id="why">
          <div className="shell">
            <h2>Borrowing, the way it should feel</h2>
            <p className="lede">
              Negotiate privately. Know the repurchase price before accepting.
              Manage the collateral through maturity.
            </p>
            <div className="card-grid" ref={whyRef}>
              {WHY.map((c) => (
                <div className="card" data-spot key={c.title}>
                  <Mark name={c.mark} />
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="band band-center" id="how">
          <div className="shell">
            <h2>How it works</h2>
            <p className="lede">
              Four steps, from a private request to a closed repo.
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
              A floating rate can change throughout a position. This historical
              Aave USDC lending-rate series illustrates that variability;
              the flat line is an example, not a Symbolon quote.
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
                  Illustrative fixed rate — not a Symbolon quote
                </span>
                <span className="key key-float">
                  {RATE_SOURCE.label} — the variable lending rate, as it happened
                </span>
                {/* A chart claiming real data has to say where it came from;
                    it belongs in the chart's own furniture, not a paragraph. */}
                <span className="key-source">
                  {RATE_SOURCE.from} – {RATE_SOURCE.to} ·{" "}
                  <a
                    href="https://defillama.com/yields/pool/aa70268e-4b52-42bf-a116-608b370f9501"
                    target="_blank"
                    rel="noreferrer"
                  >
                    DefiLlama
                  </a>
                </span>
              </div>
              <p className="chart-stat">
                It ranged from <strong>{RATE_SOURCE.min}%</strong> to{" "}
                <strong>{RATE_SOURCE.max}%</strong>, and once moved{" "}
                <strong>{RATE_SOURCE.biggestDailyMove} points in a single day</strong>{" "}
                ({RATE_SOURCE.biggestMoveDate}). These are historical lending
                yields, not borrowing costs or available Symbolon rates.
              </p>
            </div>
          </div>
        </section>

        <section className="band band-center" id="faq">
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
              <DeferredMark reducedMotion={reducedMotion} />
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
            loading="lazy"
            width="1672"
            height="941"
            alt="Two sculpted hands reach up from the dark toward the glowing split gold coin of the Symbolon mark."
          />
          <div className="closing-content">
            <h2 className="closing-head">
              <span className="line-l">
                Sealed on <span className="accent">Canton</span>.
              </span>
              <span className="line-r">
                Settled by <span className="accent">Symbolon</span>.
              </span>
            </h2>
            <a className="seal" href="/app">
              Open the desk
            </a>
          </div>
          <footer className="closing-footer">
            <div className="shell">
              <span>© 2026 Symbolon · Built on Canton Network</span>
              <span>
                <a href={GITHUB} target="_blank" rel="noreferrer">
                  GitHub ↗
                </a>
                {" · "}<a href={DOCS}>Documentation</a>
                {" · "}Prototype: demo assets and simulated oracle marks.
              </span>
            </div>
          </footer>
        </section>
      </main>
    </>
  );
}
