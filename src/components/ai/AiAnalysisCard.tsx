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

  const handleGenerate = async (force = false) => {
    if (!context || !business) return;
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
            "Vou comparar com o mês anterior, identificar padrões e sugerir ações práticas. Privacidade: só os dados deste empreendimento são enviados."}
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
