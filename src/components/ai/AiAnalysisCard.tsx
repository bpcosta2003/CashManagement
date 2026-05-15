import { useEffect, useMemo, useState } from "react";
import { useAiAnalysis } from "../../hooks/useAiAnalysis";
import { buildAiContext } from "../../lib/aiContext";
import type {
  Business,
  Client,
  MonthGoal,
  Row,
  Summary,
} from "../../types";
import { AiAnalysisModal } from "./AiAnalysisModal";
import styles from "./AiAnalysisCard.module.css";

interface Props {
  business: Business | null;
  rows: Row[];
  clients: Client[];
  goal: MonthGoal | null;
  mes: number;
  ano: number;
  summary: Summary;
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
  const {
    business,
    rows,
    clients,
    goal,
    mes,
    ano,
    summary,
    signedIn,
    onToast,
  } = props;
  const { enabled, loading, result, error, analyze, reset } = useAiAnalysis();
  const [modalOpen, setModalOpen] = useState(false);

  // Reseta resultado/erro quando muda o contexto (mês, ano, business).
  useEffect(() => {
    reset();
    setModalOpen(false);
  }, [mes, ano, business?.id, reset]);

  // Constrói o contexto sempre — barato (memoizado), reaproveitado pelo
  // botão de gerar e pelo cabeçalho de quota.
  const context = useMemo(() => {
    if (!business) return null;
    return buildAiContext({
      business,
      allRows: rows,
      clients,
      goal,
      mes,
      ano,
      summary,
    });
  }, [business, rows, clients, goal, mes, ano, summary]);

  if (!enabled || !business) return null;

  const monthRowCount = rows.filter(
    (r) => r.businessId === business.id && r.mes === mes && r.ano === ano,
  ).length;
  const hasMinData = monthRowCount >= MIN_ROWS_FOR_VALUE;

  const monthTiming = useMemo(() => classifyMonthTiming(ano, mes), [ano, mes]);

  const handleGenerate = async (force = false) => {
    if (!context || !business) return;
    if (monthTiming === "early") {
      const ok = window.confirm(
        "O mês ainda não terminou. A análise vai usar só os dados lançados até hoje — pode faltar informação importante.\n\nO ideal é gerar no último dia útil do mês.\n\nDeseja continuar mesmo assim?",
      );
      if (!ok) return;
    }
    await analyze({
      businessId: business.id,
      businessName: business.name,
      mes,
      ano,
      monthLabel: context.monthLabel,
      dataHash: context.dataHash,
      contextXml: context.contextXml,
      force,
    });
    setModalOpen(true);
  };

  // ─── Tratamento de erro: alguns viram toast, outros ficam visíveis ──
  useEffect(() => {
    if (!error) return;
    if (
      error.code === "user_quota_exceeded" ||
      error.code === "service_budget_exceeded"
    ) {
      onToast(error.message, 5000);
    }
  }, [error, onToast]);

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
    <div className={styles.section}>
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
                `Resumo inteligente de ${context?.monthLabel ?? "este mês"}`}
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

        {error &&
          error.code !== "user_quota_exceeded" &&
          error.code !== "service_budget_exceeded" && (
            <div className={styles.errorBox} role="alert">
              {error.message}
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
                onClick={() => {
                  const ok = window.confirm(
                    "Refazer a análise vai usar 1 das suas análises do mês.\n\nDeseja continuar?",
                  );
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
              disabled={loading || !context}
            >
              Gerar análise
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
          monthLabel={context?.monthLabel ?? ""}
          businessName={business.name}
          result={result}
          onClose={() => setModalOpen(false)}
          onRefresh={() => {
            setModalOpen(false);
            const ok = window.confirm(
              "Refazer a análise vai usar 1 das suas análises do mês.\n\nDeseja continuar?",
            );
            if (ok) handleGenerate(true);
          }}
        />
      )}
    </div>
  );
}
