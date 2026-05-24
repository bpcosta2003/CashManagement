import { useEffect, useRef, useState } from "react";
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
  /** Feature ainda não construída — sai numa fase futura
   *  ("Em breve" — accent-soft pill). */
  soon?: boolean;
  /** Feature que existe e funciona no Free hoje, mas que vira Pro
   *  no lançamento dos planos pagos ("Por tempo limitado no Free"
   *  — accent sólido pill, sinaliza urgência sem retirar acesso
   *  agora). */
  limited?: boolean;
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
    forWhom: "Pra quem quer entender o caixa de verdade, no celular — começando hoje, sem custo.",
    price: "R$ 0",
    priceHint: "pra sempre",
    features: [
      { label: "Lançamentos ilimitados, mesmo offline" },
      { label: "Sincroniza celular ↔ computador" },
      { label: "Mês e ano lado a lado, com gráfico de 12 meses" },
      { label: "Resumo do mês: bruto, líquido, margem, ticket e top serviços" },
      { label: "Projeção de recebimentos futuros mês a mês" },
      { label: "Insights automáticos do que muda no caixa" },
      { label: "Clientes (LTV) e catálogo de serviços" },
      { label: "Backup e restore Excel manual" },
      { label: "Múltiplos empreendimentos", limited: true },
      { label: "3 análises por IA por mês", limited: true },
      { label: "PDF anual e mensal completos", limited: true },
      { label: "Notificações por email (resumo + meta)", limited: true },
      { label: "Cálculo automático de DAS/DARF (MEI e Simples)", soon: true },
    ],
    ctaLabel: "Usar grátis",
  },
  {
    id: "pro",
    name: "Pro",
    forWhom: "Pra quem toca mais de um negócio, lança todo dia e quer IA junto da rotina.",
    price: "R$ 29",
    priceHint: "por mês",
    highlight: true,
    badge: "Mais escolhido",
    features: [
      { label: "Tudo do Free, sem limites de tempo" },
      { label: "Até 5 empreendimentos, troca em 1 toque" },
      { label: "30 análises por IA por mês" },
      { label: "PDF anual e mensal completos, sempre" },
      { label: "Notificações por email (resumo, meta, lembretes)" },
      { label: "Export automático pro contador, todo dia 5", soon: true },
      { label: "Insights aprimorados com IA (pendências, sugestões)", soon: true },
      { label: "Lembrete diário via WhatsApp", soon: true },
      { label: "30 análises de catálogo por IA / mês", soon: true },
      { label: "DARF/DAS em PDF pronta pra pagar + lembrete por email", soon: true },
    ],
    ctaLabel: "Quero ser avisado",
  },
  {
    id: "ultra",
    name: "Ultra",
    forWhom: "Pra quem quer escalar baseado em dado — e vende em marketplace também.",
    price: "R$ 119",
    priceHint: "por mês",
    features: [
      { label: "Tudo do Pro, mais:" },
      { label: "Consultor de negócio por IA, com onboarding guiado" },
      { label: "Plano de 30 dias com 4 metas semanais" },
      { label: "Check-in diário (push + email) e replanejamento mensal" },
      { label: "Análises por IA ilimitadas" },
      { label: "Empreendimentos ilimitados" },
      { label: "Integração com Mercado Livre, Shopee e Amazon", soon: true },
      { label: "Comparativo público de preço + alerta de estoque", soon: true },
      { label: "DARF/DAS gerada e agendada (PIX automático)", soon: true },
    ],
    ctaLabel: "Quero ser avisado",
  },
];

interface FeatureCard {
  icon: string;
  title: string;
  body: string;
}

/**
 * As 15 features principais do app. Mostradas como grid entre os
 * Diferenciais e os Planos pra responder "o que tem dentro disso?"
 * antes do visitante chegar nas tabelas de preço.
 */
const APP_FEATURES: FeatureCard[] = [
  {
    icon: "🏪",
    title: "Seu empreendimento",
    body:
      "Troca entre negócios em 1 toque. Salão + freelance + comércio, cada um com caixa, clientes, catálogo e metas próprios.",
  },
  {
    icon: "☁️",
    title: "Sincronização na nuvem",
    body:
      "Login só com email, sem senha. Funciona offline e sincroniza automaticamente quando volta a conexão.",
  },
  {
    icon: "💳",
    title: "Taxas configuráveis",
    body:
      "Crédito, débito, parcelado — cada modalidade com sua taxa. Vem com padrões do mercado, ajusta pro que sua maquininha cobra.",
  },
  {
    icon: "📅",
    title: "Mês e ano em foco",
    body:
      "Navegue por mês ou alterne pra visão anual com gráfico dos 12 meses, timeline de atividade e comparativo entre negócios.",
  },
  {
    icon: "💰",
    title: "Resumo do mês",
    body:
      "Bruto, descontos, taxas e líquido em tempo real. Toque nos cards pra ver clientes, formas de pagamento e top serviços.",
  },
  {
    icon: "🎯",
    title: "Meta mensal",
    body:
      "Defina quanto quer faturar. Barra colorida (vermelho → dourado) e \"faltam R$ X\" ao vivo, sem precisar abrir planilha.",
  },
  {
    icon: "💡",
    title: "Insights automáticos",
    body:
      "Detecto queda de faturamento, pagamentos pendentes acumulando, concentração em um cliente. Aviso só o que importa.",
  },
  {
    icon: "🤖",
    title: "Análise por IA",
    body:
      "No fim do mês, gere análise inteligente com Claude: insights profundos, comparações e ações práticas em português.",
  },
  {
    icon: "📝",
    title: "Lançamentos do mês",
    body:
      "Cada venda fica aqui: cliente, serviço, valor, forma de pagamento, status. Pendentes destacados pra você dar baixa.",
  },
  {
    icon: "📆",
    title: "Projeção futura",
    body:
      "Vendas no crédito caem nos próximos meses (parceladas ou não). Veja quanto entra e quando, sem fazer conta.",
  },
  {
    icon: "👥",
    title: "Clientes e LTV",
    body:
      "Lista todos os clientes com faturamento total, ticket médio, última visita e telefone. Identifique melhores e quem sumiu.",
  },
  {
    icon: "📚",
    title: "Catálogo de serviços",
    body:
      "Seus serviços com valor sugerido. Ao selecionar no lançamento, o valor vem preenchido — economiza digitação e evita erro.",
  },
  {
    icon: "💾",
    title: "Backup e restauração",
    body:
      "Exporta tudo pra Excel (lançamentos, resumo, projeção, clientes, catálogo). Importa pra restaurar ou migrar de dispositivo.",
  },
  {
    icon: "🎨",
    title: "Aparência",
    body:
      "Tema claro ou escuro, 12 cores de destaque, instala como app no celular (PWA) — funciona como aplicativo nativo.",
  },
  {
    icon: "🔔",
    title: "Lembretes",
    body:
      "Lembrete in-app quando você abre o app sem lançar 24h. Email no 1º e último dia do mês com meta e resumo.",
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

  // ─── Carousel de features ───
  // Snap horizontal nativo + botões prev/next + contador.
  // Sem libs: scroll-snap-type pega o swipe touch grátis; o JS só
  // sincroniza o índice atual e move pra próxima feature ao clicar.
  const carouselRef = useRef<HTMLDivElement>(null);
  const [carouselIdx, setCarouselIdx] = useState(0);

  const scrollToCarouselIdx = (idx: number) => {
    const container = carouselRef.current;
    if (!container) return;
    const card = container.children[idx] as HTMLElement | undefined;
    if (!card) return;
    container.scrollTo({
      left: card.offsetLeft - container.offsetLeft,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;
    // Atualiza o índice ativo conforme o usuário arrasta/swipa.
    // Usa o card mais próximo do scrollLeft pra evitar saltos.
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const cards = Array.from(container.children) as HTMLElement[];
        if (cards.length === 0) return;
        let closest = 0;
        let minDist = Infinity;
        for (let i = 0; i < cards.length; i += 1) {
          const dist = Math.abs(
            cards[i].offsetLeft - container.offsetLeft - container.scrollLeft,
          );
          if (dist < minDist) {
            minDist = dist;
            closest = i;
          }
        }
        setCarouselIdx(closest);
      });
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      container.removeEventListener("scroll", onScroll);
    };
  }, []);

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

        {/* ─── Showcase de features do app (carousel) ─── */}
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>
              O que tem dentro do app
            </span>
            <h2 className={styles.sectionTitle}>
              Tudo o que você precisa, num app só.
            </h2>
            <p className={styles.sectionLead}>
              15 funcionalidades pensadas pro dia-a-dia do dono. Arraste pro
              lado pra ver todas — cada uma resolve uma parte do caixa.
            </p>
          </header>

          <div className={styles.carouselWrap}>
            <div
              ref={carouselRef}
              className={styles.appFeatureCarousel}
              role="region"
              aria-label="Funcionalidades do app"
              tabIndex={0}
            >
              {APP_FEATURES.map((f) => (
                <article key={f.title} className={styles.appFeatureCard}>
                  <span className={styles.appFeatureIcon} aria-hidden="true">
                    {f.icon}
                  </span>
                  <h3 className={styles.appFeatureTitle}>{f.title}</h3>
                  <p className={styles.appFeatureBody}>{f.body}</p>
                </article>
              ))}
            </div>

            <div className={styles.carouselControls}>
              <button
                type="button"
                className={styles.carouselBtn}
                onClick={() =>
                  scrollToCarouselIdx(Math.max(0, carouselIdx - 1))
                }
                disabled={carouselIdx === 0}
                aria-label="Funcionalidade anterior"
              >
                ‹
              </button>
              <span
                className={styles.carouselCounter}
                aria-live="polite"
                aria-atomic="true"
              >
                {carouselIdx + 1}
                <span className={styles.carouselCounterTotal}>
                  {" / "}
                  {APP_FEATURES.length}
                </span>
              </span>
              <button
                type="button"
                className={styles.carouselBtn}
                onClick={() =>
                  scrollToCarouselIdx(
                    Math.min(APP_FEATURES.length - 1, carouselIdx + 1),
                  )
                }
                disabled={carouselIdx === APP_FEATURES.length - 1}
                aria-label="Próxima funcionalidade"
              >
                ›
              </button>
            </div>
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
                        {f.limited && (
                          <span className={styles.limitedTag}>
                            Por tempo limitado no Free
                          </span>
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

          <div className={styles.guarantee}>
            <p>
              <strong>Sem amarração.</strong> Sem cláusula escondida, sem
              fidelidade, sem cartão pra começar. Você cancela quando quiser
              e leva seus dados em Excel ou PDF.
            </p>
            <p className={styles.guaranteeBeta}>
              ⚡ Itens com tag{" "}
              <span className={styles.limitedTagInline}>
                Por tempo limitado no Free
              </span>{" "}
              estão liberados pra todo mundo hoje e migram pro Pro quando os
              planos lançarem. Quem entrar no beta trava desconto vitalício.
            </p>
          </div>
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
