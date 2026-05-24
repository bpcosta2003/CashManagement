import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import "./styles/global.css";
import "./styles/tour.css";
import App from "./App";
import { PricingPage } from "./pages/PricingPage";
import { ErrorBoundary } from "./ErrorBoundary";
import { ConfirmProvider } from "./components/feedback/ConfirmDialog";

// Roteamento simples por pathname — evitamos adicionar react-router só
// pra uma landing standalone. /pricing renderiza a página dela; qualquer
// outro path cai no app principal (que já usa state interno pra navegar).
const path = window.location.pathname;
const isPricing = path === "/pricing" || path === "/pricing/";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ConfirmProvider>
        {isPricing ? <PricingPage /> : <App />}
        {/* Sonner toaster — usado pra notificações pontuais com
            ações (ex.: "Lançamento removido · Desfazer"). O toaster
            custom interno ainda existe pra mensagens simples. */}
        <Toaster
          position="bottom-center"
          richColors
          closeButton={false}
          theme="system"
          toastOptions={{
            style: { fontSize: "0.9rem" },
          }}
        />
      </ConfirmProvider>
    </ErrorBoundary>
  </StrictMode>,
);
