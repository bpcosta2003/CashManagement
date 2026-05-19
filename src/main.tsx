import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import "./styles/tour.css";
import App from "./App";
import { PricingPage } from "./pages/PricingPage";
import { ErrorBoundary } from "./ErrorBoundary";

// Roteamento simples por pathname — evitamos adicionar react-router só
// pra uma landing standalone. /pricing renderiza a página dela; qualquer
// outro path cai no app principal (que já usa state interno pra navegar).
const path = window.location.pathname;
const isPricing = path === "/pricing" || path === "/pricing/";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>{isPricing ? <PricingPage /> : <App />}</ErrorBoundary>
  </StrictMode>,
);
