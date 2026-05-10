import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Error boundary que evita "tela em branco" silenciosa quando algum
 * componente quebra durante o render. Mostra um fallback útil com
 * opção de limpar caches e recarregar.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App crashed:", error, info);
  }

  handleReset = async () => {
    try {
      // Tenta desregistrar service workers e limpar caches.
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      /* segue mesmo se não funcionar */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "var(--bg, #f5f0e8)",
          color: "var(--text, #2e2623)",
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: "440px",
            background: "var(--surface, #fff)",
            border: "1px solid var(--border, #e7ded2)",
            borderRadius: "18px",
            padding: "28px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
          <h1
            style={{
              fontSize: 20,
              margin: "0 0 8px",
              letterSpacing: "-0.02em",
              fontWeight: 700,
            }}
          >
            Algo deu errado
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted, #6b625d)",
              margin: "0 0 20px",
              lineHeight: 1.5,
            }}
          >
            Houve um erro ao carregar o app. Geralmente isso é resolvido
            limpando o cache e recarregando.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              background: "var(--accent, #5a2e3f)",
              color: "#fff",
              border: "none",
              padding: "12px 24px",
              borderRadius: "999px",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              minWidth: 200,
            }}
          >
            Limpar cache e recarregar
          </button>
          <details
            style={{
              marginTop: 20,
              fontSize: 11,
              color: "var(--text-dim, #9a928c)",
              textAlign: "left",
            }}
          >
            <summary style={{ cursor: "pointer" }}>Detalhes técnicos</summary>
            <pre
              style={{
                marginTop: 8,
                padding: 12,
                background: "var(--bg, #f5f0e8)",
                borderRadius: 8,
                overflow: "auto",
                fontSize: 11,
                lineHeight: 1.4,
              }}
            >
              {this.state.error.message}
              {"\n\n"}
              {this.state.error.stack?.slice(0, 500)}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
