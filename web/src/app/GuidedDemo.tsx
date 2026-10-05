import { useState } from "react";
import { fmtAmount, health, type RepoPosition, type PriceFeed } from "../ledger/symbolon";
import type { Contract } from "../ledger/api";
import "../guided-demo.css";

type Stage = "quotes" | "active" | "stressed" | "called" | "cured" | "expired" | "repurchased" | "liquidated";
const stages: Stage[] = ["quotes", "active", "stressed", "called", "cured", "repurchased"];
const labels: Record<Stage, string> = {
  quotes: "Compare private quotes", active: "Repo settled", stressed: "Collateral price falls",
  called: "Margin call open", cured: "Margin restored", expired: "Cure window elapsed",
  repurchased: "Repaid and collateral returned", liquidated: "Pledged collateral retained by dealer",
};
const explanations: Record<Stage, [string, string]> = {
  quotes: ["Ask two dealers for financing terms. You can compare their offers; each dealer sees only the request and quote addressed to them.", "Independent bilateral RFQs. The quoted annualized simple rate and ACT/360 repurchase amount are agreed before acceptance."],
  active: ["The dealer provides $1,000 and receives 0.025 cBTC as pledged collateral. You already know how much you must pay to get it back.", "Atomic cash/collateral opening exchange. Collateral title moves to the dealer under the repo lock; the borrower receives the purchase price."],
  stressed: ["The agreed rate stays the same. The collateral price falls, so its value is now below the margin you agreed to maintain.", "A simulated mark falls from $60,000 to $36,000 per cBTC. Health factor falls below 1.00 while the fixed repurchase price remains unchanged."],
  called: ["The dealer asks you to restore the margin before a deadline. You can add enough collateral or repay the full agreed amount before that deadline.", "Dealer-triggered margin call creates UnderCall with a cure deadline. Daml rechecks asset identity, oracle, mark age and required coverage."],
  cured: ["Adding 0.005 cBTC restores the margin. Your original rate, repayment amount and maturity stay the same.", "TopUpCollateral atomically reserves the additional holding and restores Active. The total 0.030 cBTC is worth $1,080 against $1,050 required."],
  expired: ["In this alternate outcome, you did not restore the margin in time. The dealer still needs a new agreed price showing a shortfall before closeout.", "Liquidate requires an expired margin call and a fresh matching mark published at or after the cure deadline, with health factor still below 1.00."],
  repurchased: ["You pay the agreed amount and all your pledged collateral returns in the same transaction. The repo is closed.", "Repurchase exchanges the full fixed payoff for all pledged collateral atomically. Early repayment has no interest rebate in this prototype."],
  liquidated: ["The prototype releases all pledged collateral to the dealer. It does not sell that collateral or calculate a cash recovery.", "Dealer-led closeout records Liquidated with the mark and health factor. Auction execution, realized proceeds and surplus/shortfall accounting remain MainNet release blockers."],
};

export default function GuidedDemo() {
  const [stage, setStage] = useState<Stage>("quotes");
  const [language, setLanguage] = useState<"simple" | "defi">("simple");
  const [role, setRole] = useState<"borrower" | "dealer">("borrower");
  const [rate, setRate] = useState(0.052);
  const [didTopUp, setDidTopUp] = useState(false);
  const [didDrop, setDidDrop] = useState(false);
  const closed = stage === "repurchased" || stage === "liquidated";
  const funded = stage !== "quotes";
  const topped = didTopUp;
  const low = didDrop;
  const quantity = topped ? 0.03 : 0.025;
  const mark = low ? 36000 : 60000;
  const due = 1000 + 1000 * rate * 30 / 360;
  const position = { oracle: "simulated-oracle", collateralIssuer: "simulated-issuer", collateralInstrument: "cBTC",
    cashIssuer: "simulated-cash-issuer", cashInstrument: "USDCx", collateralAmount: String(quantity),
    cashAmount: "1000", marginThresholdPct: "1.05", maxPriceAgeSeconds: "3600" } as RepoPosition;
  const feed: Contract<PriceFeed> = { contractId: "simulated-feed", templateId: "simulated", payload: {
    oracle: position.oracle, instrumentIssuer: position.collateralIssuer, instrument: "cBTC",
    cashIssuer: position.cashIssuer, cashInstrument: "USDCx", price: String(mark), asOf: new Date().toISOString(), readers: [],
  } };
  const risk = health(position, [feed]);
  const stepIndex = stage === "expired" || stage === "liquidated" ? 4 : stages.indexOf(stage);
  const collateralLocked = funded && !closed ? quantity : 0;
  const borrowerCash = 5000 + (funded ? 1000 : 0) - (stage === "repurchased" ? due : 0);

  return <main className="walkthrough">
    <header className="walkthrough-nav"><a href="/" className="walkthrough-brand"><img src="/brand/logo-mark.png" alt="" width="34" height="34" />Symbolon</a>
      <nav aria-label="Product navigation"><a href="/app">Canton desk</a><a href="https://github.com/EndPx/symbolon">Source and run instructions</a></nav>
    </header>
    <div className="simulation-notice"><strong>Interactive simulation</strong><span>No wallet, real funds, or ledger submissions. cBTC / USDCx is the intended asset pair; live token integration is pending.</span></div>
    <div className="walkthrough-layout">
      <aside className="walkthrough-outline"><h1>Know the cost.<br /> Manage the collateral.</h1><p>A fixed-rate repo lets you receive cash against an asset and agree the price to buy it back.</p>
        <div className="walkthrough-toggle" role="group" aria-label="Explanation style"><button aria-pressed={language === "simple"} onClick={() => setLanguage("simple")}>Plain English</button><button aria-pressed={language === "defi"} onClick={() => setLanguage("defi")}>DeFi details</button></div>
        <ol aria-label="Demo progress">{stages.map((item, index) => <li key={item} className={index === stepIndex ? "current" : index < stepIndex ? "complete" : ""}><span>{index + 1}</span>{labels[item]}</li>)}</ol>
        <button className="ghost" onClick={() => { setStage("quotes"); setRate(0.052); setDidTopUp(false); setDidDrop(false); }}>Restart walkthrough</button>
        <p className="walkthrough-small">A repo transfers collateral title to the dealer. Fixed rate removes rate changes within the agreed deal; collateral prices and counterparty risk remain.</p>
      </aside>
      <section className="walkthrough-main" aria-labelledby="walkthrough-stage">
        <div className="walkthrough-role" role="group" aria-label="Perspective"><button aria-pressed={role === "borrower"} onClick={() => setRole("borrower")}>Borrower view</button><button aria-pressed={role === "dealer"} onClick={() => setRole("dealer")}>Dealer view</button></div>
        <p className="walkthrough-step">Step {stepIndex + 1} of 6</p><h2 id="walkthrough-stage" tabIndex={-1}>{labels[stage]}</h2>
        <p className="walkthrough-explanation" aria-live="polite">{stage === "quotes" && role === "dealer" ? "Dealer A sees only its own request and 5.2% quote. Dealer B's quote is absent from this view. Switch to the borrower to compare both offers." : explanations[stage][language === "simple" ? 0 : 1]}</p>
        {stage === "quotes" ? <div className="walkthrough-quotes">{(role === "dealer" ? [0.052] : [0.052, 0.058]).map((offer, index) => <article key={offer}>
          <div className="walkthrough-quote-heading"><h3>Dealer {index === 0 ? "A" : "B"}</h3><span>Private offer</span></div>
          <strong className="walkthrough-rate">{(offer * 100).toFixed(1)}%</strong><p>Annualized simple rate · 30 days</p>
          <dl><div><dt>You receive</dt><dd>1,000.00 USDCx</dd></div><div><dt>You pledge</dt><dd>0.025 cBTC</dd></div><div><dt>You repay</dt><dd>{fmtAmount(1000 + 1000 * offer * 30 / 360, 6)} USDCx</dd></div></dl>
          <button className="seal" onClick={() => { setRate(offer); setStage("active"); }}>{role === "dealer" ? "Simulate borrower acceptance" : `Simulate acceptance at ${(offer * 100).toFixed(1)}%`}</button>
        </article>)}</div> : <article className="walkthrough-position">
          <div className="walkthrough-position-head"><span>{role === "borrower" ? "Your financing agreement" : "Your funded repo"}</span><strong>{(rate * 100).toFixed(1)}% fixed</strong></div>
          <div className="walkthrough-figures"><div><span>Cash received</span><strong>1,000.00 <small>USDCx</small></strong></div><div><span>Full repurchase price</span><strong>{fmtAmount(due, 6)} <small>USDCx</small></strong></div><div><span>Pledged collateral</span><strong>{quantity.toFixed(3)} <small>cBTC</small></strong></div></div>
          {!closed && <div className={`walkthrough-health ${risk.healthy ? "covered" : "breached"}`}><div><strong>Health factor {risk.factor.toFixed(2)}</strong><span>Required margin 1.00</span></div><div className="walkthrough-health-track"><span style={{ transform: `scaleX(${Math.min(1.6, risk.factor) / 1.6})` }} /><i /></div><p>{fmtAmount(risk.collateralValue)} USDCx collateral value / {fmtAmount(risk.requiredValue)} required{risk.shortfallValue > 0 ? ` · ${fmtAmount(risk.shortfallValue)} shortfall` : ""}</p></div>}
          <dl><div><dt>Simulated cBTC price</dt><dd>{fmtAmount(mark)} USDCx</dd></div><div><dt>Term / day count</dt><dd>30 days / ACT/360</dd></div><div><dt>Margin / cure window</dt><dd>105% / agreed in each repo</dd></div><div><dt>Illustrated outcome</dt><dd>{stage === "repurchased" ? "Repurchased" : stage === "liquidated" ? "Liquidated" : stage === "called" ? "Under margin call" : "Open"}</dd></div></dl>
        </article>}
        <div className="walkthrough-actions">
          {stage === "active" && <><button className="seal" onClick={() => { setDidDrop(true); setStage("stressed"); }}>Simulate a collateral price drop</button><button className="ghost" onClick={() => setStage("repurchased")}>Explore full early repayment</button></>}
          {stage === "stressed" && <button className="seal" onClick={() => setStage("called")}>Simulate dealer margin call</button>}
          {stage === "called" && <><button className="seal" onClick={() => { setDidTopUp(true); setStage("cured"); }}>Simulate adding 0.005 cBTC</button><button className="ghost" onClick={() => setStage("expired")}>Explore an uncured call</button></>}
          {stage === "cured" && <button className="seal" onClick={() => setStage("repurchased")}>Simulate full repayment</button>}
          {stage === "expired" && <button className="seal" onClick={() => setStage("liquidated")}>Simulate post-cure mark and dealer closeout</button>}
          {closed && <><a className="seal" href="/app">Open the Canton desk</a><a className="ghost" href="https://github.com/EndPx/symbolon#run-the-complete-demo">Run the real local ledger demo</a></>}
        </div>
        <p className="walkthrough-small">Buttons advance this simulation. The Canton desk signs commands and waits for committed ledger results. No transaction receipt is generated here.</p>
        {funded && <section className="walkthrough-balances"><h3>{role === "borrower" ? "What changed for the borrower" : "What changed for the dealer"}</h3><dl>
          <div><dt>Available cash</dt><dd>{fmtAmount(role === "borrower" ? borrowerCash : 20000 - 1000 + (stage === "repurchased" ? due : 0))} USDCx</dd></div>
          <div><dt>{role === "borrower" ? "Available collateral" : "Pledged collateral held"}</dt><dd>{(role === "borrower" ? stage === "repurchased" ? 0.1 : 0.1 - quantity : collateralLocked).toFixed(3)} cBTC</dd></div>
          {stage === "liquidated" && role === "dealer" && <div><dt>Collateral unlocked at closeout</dt><dd>0.025 cBTC</dd></div>}
        </dl><p>{stage === "liquidated" ? "The prototype does not calculate a collateral sale, cash recovery, surplus, or deficiency claim. These remain required before real-asset closeout." : "Illustrative opening balances: borrower 5,000 USDCx and 0.100 cBTC; dealer 20,000 USDCx. All balances are simulated."}</p></section>}
      </section>
      <aside className="walkthrough-context"><h2>Why privacy matters</h2><p>Financing terms can reveal cash needs, inventory, and counterparty exposure. Symbolon keeps each request and quote scoped to its counterparties.</p>
        <dl><div><dt>Borrower</dt><dd>Compares both addressed quotes.</dd></div><div><dt>Winning dealer</dt><dd>Sees its quote and resulting repo.</dd></div><div><dt>Other dealer</dt><dd>Sees its own quote; the winning repo is absent from its party view.</dd></div></dl>
        <h2>What is proved today</h2><p>The repository contains local Canton scripts for repo settlement, margin, top-up, closeout, and a BitSafe 2-of-3 governance action that changes an oracle mark.</p>
        <p className="walkthrough-small">Party privacy is scoped to ledger views. Hosting operators and the demo issuer remain trust dependencies. A MainNet transaction and live cBTC / USDCx adapter have not been demonstrated.</p>
        <a href="https://symbolon.gitbook.io/symbolon-docs/reference/status">Read evidence and release limits</a>
      </aside>
    </div>
    <footer className="walkthrough-footer"><span>Symbolon · Private fixed-rate repo on Canton</span><a href="/">Back to product overview</a></footer>
  </main>;
}
