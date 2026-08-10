import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import DeskApp from "./app/DeskApp";
import "./landing.css";
import "./app.css";

// Two surfaces, one bundle. A router library would earn its weight at a dozen
// routes; at two, the pathname is the router.
const isApp = window.location.pathname.replace(/\/+$/, "") === "/app";

createRoot(document.getElementById("root")!).render(
  <StrictMode>{isApp ? <DeskApp /> : <App />}</StrictMode>,
);
