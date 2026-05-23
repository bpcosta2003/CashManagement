import { useState } from "react";
import { BrandMark } from "../components/layout/Brand";
import styles from "./PricingPage.module.css";

/**
 * Landing standalone em /pricing — Fase 0 da monetização.
 *
 * A página vende em modo "dor → alívio", não em modo "lista de feature":
 *  - Hero: promessa direta (caixa fechado em 1 min) + CTAs
 *  - Painel de dores: 4 problemas comuns que o app resolve
 *  - 3 diferenciais bold: o que separa esse app de planilha e ERP
 *  - 3 planos curados (Free/Pro/Ultra) — 5-7 features cada,
 *    ordenadas por gatilho emocional, com "pra quem é" subtitle
 *  - Garantia + FAQ rápido pra derrubar objeção
 *  - CTA final dedicado
 *
 * Marketplaces (ML+Shopee no Pro, Amazon no Ultra) aparecem com tag
 * "Em breve". Sinaliza intenção pra vendedores online sem prometer
 * entrega imediata.
 */

type Tier = "pro" | "ultra";

interface PlanFeature {
  label: string;
  soon?: boolean;
}

interface Plan {
  id: Tier | "free";
  name: string;
  forWhom: string;
  price: string;
  priceHint: string;
  highlight?: boolean;
  badge?: string;
  features: PlanFeature[];
  ctaLabel: string;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    forWhom: "Pro dono que ainda anota no caderno ou luta com planilha.",
    price: "R$ 0",
    priceHint: "pra sempre",
    features: [
      { label: "Lança em 10s, mesmo offline" },
      { label: "Caixa do mês todo num scroll" },
      { label: "Meta + projeção de fechamento ao vivo" },
      { label: "Catálogo, clientes e múltiplos itens por venda" },
      { label: "1 análise por IA por mês" },
      { label: "1 empreendimento" },
    ],
    ctaLabel: "Usar grátis",
  },
  {
    id: "pro",
    name: "Pro",
    forWhom: "Pro dono que toca mais de um negócio ou quer entregar tudo certo pro contador.",
    price: "R$ 29",
    priceHint: "por mês",
    highlight: true,
    badge: "Mais escolhido",
    features: [
      { label: "Tudo do Free, mais:" },
      { label: "Até 5 empreendimentos, troca em 1 toque" },
      { label: "Sincroniza celular ↔ computador" },
      { label: "30 análises por IA por mês" },
      { label: "Resumo mensal no seu email — sem precisar lembrar" },
      { label: "PDF anual pronto pra entregar no IRPF" },
      { label: "Integração com Mercado Livre e Shopee", soon: true },
    ],
    ctaLabel: "Quero ser avisado",
  },
  {
    id: "ultra",
    name: "Ultra",
    forWhom: "Pro dono que quer escalar baseado em dado, não em achismo.",
    price: "R$ 79",
    priceHint: "por mês",
    features: [
      { label: "Tudo do Pro, mais:" },
      { label: "Consultor de negócio com IA, sob demanda" },
      { label: "Plano de 30 dias personalizado pro seu momento" },
      { label: "Inteligência de catálogo: preço sugerido, margem, mix ideal" },
      { label: "Análises por IA ilimitadas" },
      { label: "Empreendimentos ilimitados" },
      { label: "+ Amazon e marketplaces internacionais", soon: true },
    ],
    ctaLabel: "Quero ser avisado",
  },
];

interface Pain {
  pain: string;
  relief: string;
}

const PAINS: Pain[] = [
  {
    pain: "“Esqueci de descontar a taxa do cartão de novo.”",
    relief:
      "O app desconta taxa, custo e auxiliar automaticamente. Você vê o líquido real na hora — não no fim do mês.",
  },
  {
    pain: "“Será que vou bater a meta esse mês?”",
    relief:
      "Projeção diária baseada no seu ritmo. Se está abaixo, o app avisa antes de virar problema.",
  },
  {
    pain: "“Demoro 2 horas pra fechar o mês.”",
    relief:
      "Faturamento, líquido, ticket médio e top serviços calculados em tempo real. Fecha o mês em 1 minuto.",
  },
  {
    pain: "“Tenho mais de um negócio e me perco.”",
    relief:
      "Cada empreendimento separado, com seus próprios catálogos e metas. Troca em 1 toque, no celular.",
  },
];

interface Differentiator {
  title: string;
  body: string;
}

const DIFFERENTIATORS: Differentiator[] = [
  {
    title: "Mais rápido que planilha. Mais barato que ERP.",
    body:
      "Planilha trava no celular e dá erro de fórmula. ERP custa R$ 200+ por mês e foi desenhado pra contador. Aqui: 10 segundos por lançamento, no celular, durante o atendimento.",
  },
  {
    title: "Decide. Não só registra.",
    body:
      "Os outros mostram a tabela e pronto. Esse aqui responde em português: “o que mudou esse mês?”, “qual serviço dá mais margem?”, “vou bater a meta?”. Sem precisar interpretar gráfico.",
  },
  {
    title: "Seu dado é seu. Sempre.",
    body:
      "Tudo salvo no seu dispositivo por padrão. Sincronização na nuvem é opcional. Exporte Excel ou PDF a qualquer hora — sem trava, sem dependência, sem amarração.",
  },
];

interface Faq {
  q: string;
  a: string;
}

const FAQ: Faq[] = [
  {
    q: "Preciso de cartão de crédito pra começar?",
    a: "Não. O Free é grátis pra sempre e não pede cartão. Os planos pagos ainda estão em validação — você só marca interesse e te avisamos com desconto no lançamento.",
  },
  {
    q: "Funciona sem internet?",
    a: "Sim. O app é PWA: instala no celular como aplicativo, funciona offline e sincroniza quando volta a conexão. Você atende em qualquer lugar.",
  },
  {
    q: "E se eu quiser sair? Levo meus dados?",
    a: "Leva. Exporta tudo em Excel ou PDF a qualquer momento. Sem trava, sem cláusula escondida.",
  },
  {
    q: "Pra que tipo de negócio serve?",
    a: "Salão, restaurante, lojinha, prestador de serviço, freelancer, comércio online. Qualquer um que precise entender entrada, saída, custo e taxa — sem virar contador.",
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
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
        {/* ─── Hero ─── */}
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Pra quem faz o caixa girar</span>
          <h1 className={styles.title}>
            Saiba quanto sobrou{" "}
            <span className={styles.titleAccent}>antes de fechar a porta</span>.
          </h1>
          <p className={styles.subtitle}>
            Lançamento em 10 segundos no celular. Caixa do mês inteiro num
            scroll. Análise por IA que fala português. Sem planilha, sem ERP,
            sem contador no meio.
          </p>
          <div className={styles.heroCtas}>
            <a href="/" className={styles.heroPrimary}>
              Começar grátis em 30s
            </a>
            <a href="#planos" className={styles.heroSecondary}>
              Ver planos
            </a>
          </div>
          <p className={styles.heroNote}>
            Sem cartão. Sem cadastro obrigatório. Funciona offline.
          </p>
        </section>

        {/* ─── Painel de dores ─── */}
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>Soa familiar?</span>
            <h2 className={styles.sectionTitle}>
              Você não precisa virar contador pra ter controle.
            </h2>
            <p className={styles.sectionLead}>
              A gente pegou as 4 dores que todo dono pequeno reclama — e fez o
              app resolver cada uma na origem.
            </p>
          </header>
          <div className={styles.painGrid}>
            {PAINS.map((p) => (
              <article key={p.pain} className={styles.painCard}>
                <p className={styles.painText}>{p.pain}</p>
                <div className={styles.painArrow} aria-hidden="true">
                  →
                </div>
                <p className={styles.reliefText}>{p.relief}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ─── Diferenciais ─── */}
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>
              Por que esse e não outro
            </span>
            <h2 className={styles.sectionTitle}>
              Tem coisa que só esse app faz.
            </h2>
          </header>
          <div className={styles.diffGrid}>
            {DIFFERENTIATORS.map((d, i) => (
              <article key={d.title} className={styles.diffCard}>
                <span className={styles.diffNumber} aria-hidden="true">
                  0{i + 1}
                </span>
                <h3 className={styles.diffTitle}>{d.title}</h3>
                <p className={styles.diffDesc}>{d.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ─── Planos ─── */}
        <section className={styles.section} id="planos">
          <header className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>Planos</span>
            <h2 className={styles.sectionTitle}>
              Comece grátis. Cresça quando o caixa pedir.
            </h2>
            <p className={styles.sectionLead}>
              O Free é completo de verdade. Pago só faz sentido quando você
              tem mais de um negócio, quer IA todo dia ou precisa de
              consultoria automatizada.
            </p>
          </header>

          <div className={styles.grid} aria-label="Planos disponíveis">
            {PLANS.map((plan) => (
              <article
                key={plan.id}
                className={`${styles.card} ${plan.highlight ? styles.cardHi : ""}`}
              >
                {plan.badge && (
                  <span className={styles.badge}>{plan.badge}</span>
                )}
                <h3 className={styles.planName}>{plan.name}</h3>
                <p className={styles.planForWhom}>{plan.forWhom}</p>
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

          <p className={styles.guarantee}>
            <strong>Sem amarração.</strong> Sem cláusula escondida, sem
            fidelidade, sem cartão pra começar. Você cancela quando quiser e
            leva seus dados em Excel ou PDF.
          </p>
        </section>

        {/* ─── FAQ ─── */}
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>Dúvidas comuns</span>
            <h2 className={styles.sectionTitle}>Antes de você perguntar.</h2>
          </header>
          <div className={styles.faqList}>
            {FAQ.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <details
                  key={item.q}
                  className={styles.faqItem}
                  open={isOpen}
                  onToggle={(e) => {
                    if ((e.target as HTMLDetailsElement).open) setOpenFaq(i);
                    else if (openFaq === i) setOpenFaq(null);
                  }}
                >
                  <summary className={styles.faqQ}>
                    <span>{item.q}</span>
                    <span className={styles.faqChevron} aria-hidden="true">
                      ▾
                    </span>
                  </summary>
                  <p className={styles.faqA}>{item.a}</p>
                </details>
              );
            })}
          </div>
        </section>

        {/* ─── CTA final ─── */}
        <section className={styles.finalCta}>
          <h2 className={styles.finalTitle}>
            O próximo mês pode ser diferente.
          </h2>
          <p className={styles.finalLead}>
            Você começa grátis agora. Em 5 minutos já tem o primeiro caixa
            fechado — e sabe quanto realmente sobrou.
          </p>
          <div className={styles.heroCtas}>
            <a href="/" className={styles.heroPrimary}>
              Usar grátis agora
            </a>
          </div>
          <p className={styles.heroNote}>
            Sem cartão. Sem amarração. Cancele quando quiser.
          </p>
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
                    estiver disponível — com desconto pra quem entrou cedo.
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
                    {submitting ? "Enviando…" : "Garantir desconto"}
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
            Preços ainda em validação. Quem marcar interesse agora terá
            desconto no lançamento.
          </p>
        </footer>
      </main>
    </div>
  );
}
