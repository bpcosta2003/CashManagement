import { useEffect, useMemo, useState } from "react";
import { useAiAnalysis } from "../../hooks/useAiAnalysis";
import { MESES_FULL } from "../../constants";
import type { Business, MonthGoal, Row } from "../../types";
import { AiAnalysisModal } from "./AiAnalysisModal";
import { useConfirm } from "../feedback/ConfirmDialog";
import styles from "./AiAnalysisCard.module.css";

interface Props {
  business: Business | null;
  rows: Row[];
  goal: MonthGoal | null;
  mes: number;
  ano: number;
  /** True quando o usuário está autenticado no Supabase. Sem login a IA
   *  não funciona (precisa de JWT pra rate limit por usuário). */
  signedIn: boolean;
  /** Aviso curto no toast pra erros não-fatais (ex.: cota acabou). */
  onToast: (msg: string, ms?: number) => void;
}

const MIN_ROWS_FOR_VALUE = 1;

/**
 * Retorna o último dia útil (seg-sex) do mês informado.
 * Considera apenas fins de semana — feriados não são checados pra evitar
 * dependência de tabela regional; o impacto é no máximo 1 dia.
 */
function lastBusinessDayOfMonth(ano: number, mes: number): Date {
  const last = new Date(ano, mes + 1, 0);
  while (last.getDay() === 0 || last.getDay() === 6) {
    last.setDate(last.getDate() - 1);
  }
  return last;
}

type MonthTiming = "past" | "ready" | "early";

function classifyMonthTiming(ano: number, mes: number, today = new Date()): MonthTiming {
  const monthStart = new Date(ano, mes, 1);
  const monthEnd = new Date(ano, mes + 1, 0, 23, 59, 59, 999);
  if (today > monthEnd) return "past";
  if (today < monthStart) return "early";
  const cutoff = lastBusinessDayOfMonth(ano, mes);
  cutoff.setHours(0, 0, 0, 0);
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  return todayStart >= cutoff ? "ready" : "early";
}

export function AiAnalysisCard(props: Props) {
  const { business, rows, goal, mes, ano, signedIn, onToast } = props;
  const { enabled, loading, result, error, analyze, reset } = useAiAnalysis();
  const confirm = useConfirm();
  const [modalOpen, setModalOpen] = useState(false);

  // Reseta resultado/erro quando muda o contexto (mês, ano, business).
  useEffect(() => {
    reset();
    setModalOpen(false);
  }, [mes, ano, business?.id, reset]);

  // Rótulo amigável do mês — usado só na UI. O XML enviado pra IA é
  // montado server-side a partir dos dados brutos.
  const monthLabel = useMemo(
    () => `${MESES_FULL[mes]}/${ano}`,
    [mes, ano],
  );

  const monthTiming = useMemo(() => classifyMonthTiming(ano, mes), [ano, mes]);

  // Erro de quota/budget: além do card, dá um toast (sinal forte de que
  // a ação não rolou). Os demais erros ficam só no card.
  useEffect(() => {
    if (!error) return;
    if (
      error.code === "user_quota_exceeded" ||
      error.code === "service_budget_exceeded"
    ) {
      onToast(error.message, 5000);
    }
  }, [error, onToast]);

  // Quota esgotada → não adianta oferecer "Gerar"/"Refazer".
  const quotaExhausted = error?.code === "user_quota_exceeded";

  if (!enabled || !business) return null;

  const monthRowCount = rows.filter(
    (r) => r.businessId === business.id && r.mes === mes && r.ano === ano,
  ).length;
  const hasMinData = monthRowCount >= MIN_ROWS_FOR_VALUE;

  const handleGenerate = async (force = false) => {
    if (!business) return;
    if (monthTiming === "early") {
      const ok = await confirm({
        title: "O mês ainda não terminou",
        message:
          "A análise vai usar só os dados lançados até hoje — pode faltar informação importante. O ideal é gerar no último dia útil do mês.",
        confirmText: "Continuar mesmo assim",
        danger: false,
      });
      if (!ok) return;
    }
    // Mandamos só os dados brutos do empreendimento — o servidor monta
    // o XML que vai pro Claude. Não confiamos em texto vindo do navegador.
    // Filtramos por janela de 7 meses (mês atual + 6 anteriores) porque
    // é tudo que o contexto da IA usa — reduz payload e o limite do
    // servidor de forma drástica pra contas com histórico longo.
    const minWindow = (() => {
      let m = mes - 6;
      let y = ano;
      while (m < 0) {
        m += 12;
        y -= 1;
      }
      return y * 12 + m;
    })();
    const maxWindow = ano * 12 + mes;
    const businessRows = rows.filter((r) => {
      if (r.businessId !== business.id) return false;
      const key = r.ano * 12 + r.mes;
      return key >= minWindow && key <= maxWindow;
    });
    await analyze({
      businessId: business.id,
      business: {
        id: business.id,
        name: business.name,
        type: business.type,
        createdAt: business.createdAt,
      },
      mes,
      ano,
      rows: businessRows,
      goal: goal ?? null,
      force,
    });
    setModalOpen(true);
  };

  // ─── Estados visuais ───────────────────────────────────────────────
  const quota = result?.quota ?? error?.quota;
  const status: "empty" | "ready" | "loading" | "no-data" | "no-login" =
    !signedIn
      ? "no-login"
      : !hasMinData
        ? "no-data"
        : loading
          ? "loading"
          : result
            ? "ready"
            : "empty";

  return (
    <div className={styles.section} data-tour="ai-card">
      <section className={styles.card} aria-label="Análise IA do mês">
        <div className={styles.head}>
          <div className={styles.headText}>
            <span className={styles.eyebrow}>
              Análise IA
              {quota && status !== "no-login" && status !== "no-data" && (
                <>
                  <span className={styles.dot}>·</span>
                  <span className={styles.quotaInline}>
                    {quota.used}/{quota.limit} no mês
                  </span>
                </>
              )}
            </span>
            <span className={styles.headline}>
              {status === "no-login" && "Faça login pra gerar análises"}
              {status === "no-data" && "Adicione lançamentos pra começar"}
              {status === "loading" && "Gerando análise…"}
              {status === "empty" &&
                `Resumo inteligente de ${monthLabel}`}
              {status === "ready" && "Análise pronta"}
            </span>
          </div>
          <span className={styles.badge} aria-hidden="true">
            ✨
          </span>
        </div>

        <p className={styles.desc}>
          {status === "no-login" &&
            "A IA usa sua sessão pra controlar uso. Sincronize sua conta nas configurações."}
          {status === "no-data" &&
            "Lance pelo menos uma venda do mês pra eu gerar uma análise útil."}
          {status === "loading" &&
            "Estou olhando seu mês, comparando com o anterior e procurando padrões. Leva alguns segundos."}
          {status === "empty" &&
            (monthTiming === "early"
              ? "Recomendo gerar no último dia útil do mês, quando todos os lançamentos já estão registrados. Você ainda pode gerar agora, mas com dados parciais."
              : "Vou comparar com o mês anterior, identificar padrões e sugerir ações práticas. Privacidade: só os dados deste empreendimento são enviados.")}
          {status === "ready" &&
            (result?.cached
              ? `Gerada com base nos dados atuais. Reabra pra rever.`
              : `Pronta agora mesmo. Clique pra ler ou refazer se mudar dados.`)}
        </p>

        {error && (
          <div
            className={`${styles.errorBox} ${
              quotaExhausted || error.code === "service_budget_exceeded"
                ? styles.errorBoxQuota
                : ""
            }`}
            role="alert"
          >
            {error.message}
            {quotaExhausted && quota && (
              <span className={styles.errorBoxMeta}>
                Você usou {quota.used} de {quota.limit} análises deste mês.
              </span>
            )}
          </div>
        )}

        <div className={styles.actions}>
          {status === "ready" && (
            <>
              <button
                type="button"
                className={styles.primary}
                onClick={() => setModalOpen(true)}
              >
                Ver análise
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={async () => {
                  const ok = await confirm({
                    title: "Refazer análise?",
                    message:
                      "Vai usar 1 das suas análises do mês.",
                    confirmText: "Refazer",
                    danger: false,
                  });
                  if (ok) handleGenerate(true);
                }}
                disabled={loading}
              >
                Refazer
              </button>
            </>
          )}
          {status === "empty" && (
            <button
              type="button"
              className={styles.primary}
              onClick={() => handleGenerate(false)}
              disabled={loading || !business || quotaExhausted}
            >
              {quotaExhausted ? "Limite do mês atingido" : "Gerar análise"}
            </button>
          )}
          {status === "loading" && (
            <button type="button" className={styles.primary} disabled>
              <span className={styles.spinner} aria-hidden="true" />
              Gerando…
            </button>
          )}
        </div>
      </section>

      {result && (
        <AiAnalysisModal
          open={modalOpen}
          monthLabel={monthLabel}
          businessName={business.name}
          result={result}
          onClose={() => setModalOpen(false)}
          onRefresh={async () => {
            setModalOpen(false);
            const ok = await confirm({
              title: "Refazer análise?",
              message: "Vai usar 1 das suas análises do mês.",
              confirmText: "Refazer",
              danger: false,
            });
            if (ok) handleGenerate(true);
          }}
        />
      )}
    </div>
  );
}
