import { useState } from "react";
import { BrandMark } from "../components/layout/Brand";
import styles from "./PricingPage.module.css";

/**
 * Landing standalone em /pricing — Fase 0 da monetização.
 *
 * Renderiza:
 *  - Hero com proposta de valor
 *  - "Como funciona" pra quem nunca usou o app (visitantes vindos de
 *    redes sociais / anúncios precisam entender em 10 segundos)
 *  - "Por que escolher" — diferenciais frente a planilhas e ERPs
 *  - 3 tiers (Free / Pro / Ultra) com "Quero ser avisado" em cada pago
 *
 * O CTA chama POST /api/pricing-interest e o backend valida + grava em
 * pricing_interest no Supabase.
 *
 * Marketplaces (Mercado Livre, Shopee, Amazon) aparecem marcados como
 * "Em breve" — sinaliza pra quem vende online que o app vai chegar lá
 * sem prometer entrega imediata.
 */

type Tier = "pro" | "ultra";

interface PlanFeature {
  label: string;
  soon?: boolean;
}

interface Plan {
  id: Tier | "free";
  name: string;
  tagline: string;
  price: string;
  priceHint: string;
  highlight?: boolean;
  features: PlanFeature[];
  ctaLabel: string;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Pra começar a entender o caixa sem custo nenhum.",
    price: "R$ 0",
    priceHint: "pra sempre",
    features: [
      { label: "1 empreendimento" },
      { label: "Lançamentos ilimitados (entradas, saídas, custos)" },
      { label: "Múltiplos itens por atendimento" },
      { label: "Catálogo de produtos/serviços e clientes" },
      { label: "Meta mensal + acompanhamento diário" },
      { label: "Taxa fixa do negócio + auxiliar do serviço" },
      { label: "Modo % ou R$ em taxa de cartão e auxiliar" },
      { label: "Dark mode + 12 cores de destaque" },
      { label: "Backup Excel manual" },
      { label: "1 análise por IA por mês" },
      { label: "App instalável (PWA) e funciona offline" },
    ],
    ctaLabel: "Já está no app",
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Pra quem quer crescer com decisões baseadas em dado.",
    price: "R$ 29",
    priceHint: "por mês",
    highlight: true,
    features: [
      { label: "Tudo do Free, mais:" },
      { label: "Até 5 empreendimentos com troca rápida" },
      { label: "Sincronização entre celular e computador" },
      { label: "30 análises por IA por mês" },
      { label: "Lembrete diário e resumo mensal por email" },
      { label: "PDF anual completo pronto pro IRPF" },
      { label: "Export automático pro contador" },
      { label: "Backup automático na nuvem" },
      { label: "Integração com Mercado Livre e Shopee", soon: true },
      { label: "Suporte prioritário por email" },
    ],
    ctaLabel: "Quero ser avisado",
  },
  {
    id: "ultra",
    name: "Ultra",
    tagline: "Pra quem trata o negócio como negócio de verdade.",
    price: "R$ 79",
    priceHint: "por mês",
    features: [
      { label: "Tudo do Pro, mais:" },
      { label: "Empreendimentos ilimitados" },
      { label: "Análises por IA ilimitadas" },
      { label: "Consultor de negócio com IA, sob demanda" },
      { label: "Plano de 30 dias personalizado pro seu negócio" },
      { label: "Check-ins diários e replanejamento automático" },
      { label: "Inteligência de catálogo (preços, margens, mix ideal)" },
      { label: "+ Amazon e marketplaces internacionais", soon: true },
      { label: "Suporte direto com o time de produto" },
    ],
    ctaLabel: "Quero ser avisado",
  },
];

interface FeatureHighlight {
  icon: string;
  title: string;
  description: string;
}

const FEATURE_HIGHLIGHTS: FeatureHighlight[] = [
  {
    icon: "📒",
    title: "Lançamento em segundos",
    description:
      "Registre entradas, custos e taxas em uma tela só. Múltiplos itens por venda, modo % ou R$ pra taxa de cartão e auxiliar, taxa fixa do negócio aplicada automaticamente.",
  },
  {
    icon: "📊",
    title: "Resumo que faz sentido",
    description:
      "Veja faturamento, líquido, ticket médio e top serviços por dia, semana, mês ou ano. Compare períodos sem montar planilha nenhuma.",
  },
  {
    icon: "🎯",
    title: "Meta e projeção",
    description:
      "Defina uma meta mensal e o app projeta se você bate, com base no ritmo atual. Lembrete diário quando você fica sem lançar.",
  },
  {
    icon: "🤖",
    title: "Análise por IA",
    description:
      "Uma vez por mês, a IA lê seus números e devolve diagnóstico em português claro: o que cresceu, o que caiu, o que vale ajustar.",
  },
  {
    icon: "📄",
    title: "Relatórios prontos",
    description:
      "Exporte Excel pra contabilidade, PDF mensal pra revisão, PDF anual completo pro IRPF. Tudo formatado, sem precisar mexer.",
  },
  {
    icon: "📱",
    title: "Instala no celular",
    description:
      "Funciona offline, sincroniza quando volta. Tema claro/escuro, 12 cores de destaque. Seus dados ficam no seu dispositivo e (opcionalmente) na nuvem.",
  },
];

interface Differentiator {
  title: string;
  description: string;
}

const DIFFERENTIATORS: Differentiator[] = [
  {
    title: "Feito pro dono, não pro contador",
    description:
      "ERP como Conta Azul foi desenhado pra equipe contábil — interface densa, fluxo longo. Aqui é o oposto: o dono lança numa mão, no celular, entre um atendimento e outro.",
  },
  {
    title: "Mais rápido que planilha",
    description:
      "Excel obriga você a criar fórmula, manter aba, lembrar do total. Aqui o app já sabe: descontou taxa de cartão, somou auxiliar, separou custo, fechou o dia.",
  },
  {
    title: "Decisão, não só registro",
    description:
      "Outros apps mostram a tabela e param. Esse aqui responde \"o que mudou esse mês?\" e \"vou bater a meta?\" — em português, sem você precisar interpretar gráfico.",
  },
  {
    title: "Seu dado é seu",
    description:
      "Tudo salvo no seu dispositivo por padrão. Sincronização na nuvem é opcional, com login. Exporte Excel ou PDF quando quiser — sem trava, sem dependência.",
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
        <a href="/" className={styles.headerCta}>
          Abrir o app
        </a>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Controle de Caixa</span>
          <h1 className={styles.title}>
            O caixa do seu negócio, fechado todo dia em 1 minuto.
          </h1>
          <p className={styles.subtitle}>
            Um app feito pro dono que atende, vende e ainda precisa saber
            quanto sobrou. Lança rápido, entende o mês inteiro de relance e
            decide o próximo passo sem montar planilha.
          </p>
          <div className={styles.heroCtas}>
            <a href="/" className={styles.heroPrimary}>
              Usar grátis agora
            </a>
            <a href="#planos" className={styles.heroSecondary}>
              Ver planos
            </a>
          </div>
          <p className={styles.heroNote}>
            Sem cartão. Funciona offline. Instala no celular como app.
          </p>
        </section>

        {/* ─── Como funciona ─── */}
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>O que o app faz</span>
            <h2 className={styles.sectionTitle}>
              Tudo o que você precisa pra entender o caixa.
            </h2>
            <p className={styles.sectionLead}>
              Não é só anotar entrada e saída. É enxergar o negócio inteiro com
              o mesmo esforço de mandar uma mensagem no WhatsApp.
            </p>
          </header>
          <div className={styles.featureGrid}>
            {FEATURE_HIGHLIGHTS.map((f) => (
              <article key={f.title} className={styles.featureCard}>
                <span className={styles.featureIcon} aria-hidden="true">
                  {f.icon}
                </span>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ─── Por que escolher ─── */}
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>Por que esse e não outro</span>
            <h2 className={styles.sectionTitle}>
              Não é planilha. Não é ERP. É o meio que faltava.
            </h2>
            <p className={styles.sectionLead}>
              A maioria dos negócios pequenos vive entre uma planilha que dá
              trabalho e um sistema caro demais. A gente faz a parte do meio —
              o suficiente pra você decidir, sem o peso do que não precisa.
            </p>
          </header>
          <div className={styles.diffGrid}>
            {DIFFERENTIATORS.map((d) => (
              <article key={d.title} className={styles.diffCard}>
                <h3 className={styles.diffTitle}>{d.title}</h3>
                <p className={styles.diffDesc}>{d.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ─── Planos ─── */}
        <section className={styles.section} id="planos">
          <header className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>Planos</span>
            <h2 className={styles.sectionTitle}>
              Comece grátis. Cresça quando fizer sentido.
            </h2>
            <p className={styles.sectionLead}>
              O app é grátis pra usar. Pros donos que querem ir mais longe,
              análise por IA, consultoria e ferramentas avançadas estão
              chegando. Marque seu interesse e te avisamos quando lançar —
              com desconto pra quem entrou cedo.
            </p>
          </header>

          <div className={styles.grid} aria-label="Planos disponíveis">
            {PLANS.map((plan) => (
              <article
                key={plan.id}
                className={`${styles.card} ${plan.highlight ? styles.cardHi : ""}`}
              >
                {plan.highlight && (
                  <span className={styles.badge}>Mais popular</span>
                )}
                <h3 className={styles.planName}>{plan.name}</h3>
                <p className={styles.planTagline}>{plan.tagline}</p>
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
                      <span className={styles.featureLabel}>
                        {f.label}
                        {f.soon && (
                          <span className={styles.soonTag}>Em breve</span>
                        )}
                      </span>
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
          </div>
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
