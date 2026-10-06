import { StrictMode, Suspense, lazy } from "react";
import { createRoot, type Root } from "react-dom/client";
import "./landing.css";
import "./app.css";
import "./dealing-suite.css";
import { loadDeployment } from "./ledger/deployment";

if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_REACT_DEVTOOLS === "1") {
  void import("react-grab");
  void import("react-scan").then(({ scan }) => scan({ enabled: true, showToolbar: false }));
}

const App = lazy(() => import("./App"));
const DeskApp = lazy(() => import("./app/DeskApp"));
const isApp = window.location.pathname.replace(/\/+$/, "") === "/app";

const rootElement = document.getElementById("root") as (HTMLElement & { symbolonRoot?: Root });
const root = rootElement.symbolonRoot ?? createRoot(rootElement);
rootElement.symbolonRoot = root;
root.render(<main style={{ padding: "3rem", fontFamily: "serif" }} aria-busy="true">Opening Symbolon…</main>);
void loadDeployment().then(() => root.render(
  <StrictMode>
    <Suspense fallback={<main style={{ padding: "3rem", fontFamily: "serif" }} aria-busy="true">Opening Symbolon…</main>}>
      {isApp ? <DeskApp /> : <App />}
    </Suspense>
  </StrictMode>,
));
