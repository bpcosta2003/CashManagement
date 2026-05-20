import { useState } from "react";
import { BrandMark } from "../components/layout/Brand";
import styles from "./PricingPage.module.css";

/**
 * Landing standalone em /pricing — Fase 0 da monetização.
 *
 * Renderiza 3 tiers (Free / Pro / Ultra) com "Quero ser avisado" em cada
 * pago. O CTA chama POST /api/pricing-interest e o backend valida +
 * grava em pricing_interest no Supabase.
 *
 * Decisões intencionais:
 *  - Mostra 3 tiers porque o objetivo é descobrir QUAL tier as pessoas
 *    querem (Ultra é o sinal mais forte de disposição a pagar).
 *  - Free está visível mas sem CTA — não faz sentido marcar interesse
 *    em algo gratuito; o app inteiro é o "Free".
 *  - Página é totalmente independente do app — sem header de
 *    empreendimento, sem sync, sem nada. Carrega rápido pra link
 *    compartilhado em redes sociais não morrer.
 */

type Tier = "pro" | "ultra";

interface Plan {
  id: Tier | "free";
  name: string;
  price: string;
  priceHint: string;
  highlight?: boolean;
  features: string[];
  ctaLabel: string;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "R$ 0",
    priceHint: "pra sempre",
    features: [
      "Controle de caixa completo",
      "Catálogo, clientes e metas",
      "Backup Excel manual",
      "1 análise IA por mês",
      "1 empreendimento",
    ],
    ctaLabel: "Já está no app",
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 29",
    priceHint: "por mês",
    highlight: true,
    features: [
      "Tudo do Free, mais:",
      "30 análises IA por mês",
      "Até 5 empreendimentos",
      "Export automático pro contador",
      "PDF anual completo (IRPF)",
      "Suporte prioritário",
    ],
    ctaLabel: "Quero ser avisado",
  },
  {
    id: "ultra",
    name: "Ultra",
    price: "R$ 79",
    priceHint: "por mês",
    features: [
      "Tudo do Pro, mais:",
      "Análises IA ilimitadas",
      "Consultor de negócio com IA",
      "Plano de 30 dias personalizado",
      "Check-ins diários e replanejamento",
      "Empreendimentos ilimitados",
    ],
    ctaLabel: "Quero ser avisado",
  },
];

function getSourceFromUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    const params = new URLSearchParams(window.location.search);
    return (params.get("src") ?? params.get("utm_source") ?? "").slice(0, 40);
  } catch {
    return "";
  }
}

export function PricingPage() {
  const [openTier, setOpenTier] = useState<Tier | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "success"; tier: Tier }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const handleOpen = (tier: Tier) => {
    setOpenTier(tier);
    setStatus({ kind: "idle" });
    setEmail("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openTier || submitting) return;

    setSubmitting(true);
    setStatus({ kind: "idle" });

    try {
      const response = await fetch("/api/pricing-interest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          tier: openTier,
          source: getSourceFromUrl(),
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;
      if (!response.ok || !data?.ok) {
        setStatus({
          kind: "error",
          message:
            data?.message ??
            "Não foi possível registrar agora. Tente novamente em instantes.",
        });
        return;
      }
      setStatus({ kind: "success", tier: openTier });
      setEmail("");
    } catch (err) {
      console.error("[pricing] submit error", err);
      setStatus({
        kind: "error",
        message: "Falha de rede. Verifique sua conexão.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a href="/" className={styles.brandLink} aria-label="Voltar para o app">
          <BrandMark size={32} />
          <span className={styles.brandName}>Controle de Caixa</span>
        </a>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.title}>Planos pensados pra negócios reais.</h1>
          <p className={styles.subtitle}>
            O app é grátis pra usar. Pros donos que querem ir mais longe,
            análise por IA, consultoria e ferramentas avançadas estão chegando.
            Marque seu interesse e te avisamos quando lançar — com desconto pra
            quem entrou cedo.
          </p>
        </section>

        <section className={styles.grid} aria-label="Planos disponíveis">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`${styles.card} ${plan.highlight ? styles.cardHi : ""}`}
            >
              {plan.highlight && (
                <span className={styles.badge}>Mais popular</span>
              )}
              <h2 className={styles.planName}>{plan.name}</h2>
              <div className={styles.priceRow}>
                <span className={styles.price}>{plan.price}</span>
                <span className={styles.priceHint}>{plan.priceHint}</span>
              </div>
              <ul className={styles.features}>
                {plan.features.map((f, i) => (
                  <li key={i} className={styles.feature}>
                    <span className={styles.featureDot} aria-hidden="true">
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              {plan.id === "free" ? (
                <a className={styles.ctaFree} href="/">
                  {plan.ctaLabel}
                </a>
              ) : (
                <button
                  type="button"
                  className={`${styles.cta} ${plan.highlight ? styles.ctaHi : ""}`}
                  onClick={() => handleOpen(plan.id as Tier)}
                >
                  {plan.ctaLabel}
                </button>
              )}
            </article>
          ))}
        </section>

        {openTier && (
          <div
            className={styles.modalBackdrop}
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpenTier(null);
            }}
          >
            <div
              className={styles.modal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="pi-title"
            >
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setOpenTier(null)}
                aria-label="Fechar"
              >
                ×
              </button>
              <h3 id="pi-title" className={styles.modalTitle}>
                {status.kind === "success"
                  ? "Recebido!"
                  : `Quero ser avisado do ${openTier === "pro" ? "Pro" : "Ultra"}`}
              </h3>

              {status.kind === "success" ? (
                <p className={styles.modalSuccess}>
                  Vamos te avisar no lançamento. Quem entrou pela lista de
                  espera ganha desconto e prioridade no acesso beta.
                </p>
              ) : (
                <form className={styles.form} onSubmit={handleSubmit}>
                  <p className={styles.modalIntro}>
                    Sem spam. Só uma mensagem quando o {openTier === "pro" ? "Pro" : "Ultra"}{" "}
                    estiver disponível.
                  </p>
                  <label className={styles.label} htmlFor="pi-email">
                    Seu e-mail
                  </label>
                  <input
                    id="pi-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    className={styles.input}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    required
                    autoFocus
                    maxLength={120}
                  />
                  {status.kind === "error" && (
                    <span className={styles.modalError}>{status.message}</span>
                  )}
                  <button
                    type="submit"
                    className={styles.submit}
                    disabled={submitting || email.trim().length === 0}
                  >
                    {submitting ? "Enviando…" : "Marcar interesse"}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        <footer className={styles.footer}>
          <p>
            Já usa o app?{" "}
            <a href="/" className={styles.footerLink}>
              Voltar pra Controle de Caixa
            </a>
          </p>
          <p className={styles.footerNote}>
            Preços ainda em validação. Quem marcar interesse agora terá desconto
            no lançamento.
          </p>
        </footer>
      </main>
    </div>
  );
}
