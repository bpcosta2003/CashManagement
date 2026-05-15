import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import type { AiAnalysisResult } from "../../hooks/useAiAnalysis";
import styles from "./AiAnalysisModal.module.css";

interface Props {
  open: boolean;
  monthLabel: string;
  businessName: string;
  result: AiAnalysisResult;
  onClose: () => void;
  onRefresh: () => void;
}

function formatGeneratedAt(iso: string): string {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diffMin = Math.floor((now - d.getTime()) / 60000);
    if (diffMin < 1) return "agora mesmo";
    if (diffMin < 60) return `há ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `há ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `há ${diffD} dia${diffD === 1 ? "" : "s"}`;
    return d.toLocaleDateString("pt-BR");
  } catch {
    return "";
  }
}

export function AiAnalysisModal({
  open,
  monthLabel,
  businessName,
  result,
  onClose,
  onRefresh,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (typeof window !== "undefined" && window.innerWidth > 720) return;
    onClose();
  };

  const generatedAt = formatGeneratedAt(result.generatedAt);

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={`Análise IA de ${monthLabel}`}
      >
        <div className={styles.handleWrap}>
          <div className={styles.handle} />
        </div>
        <div className={styles.header}>
          <div className={styles.headerText}>
            <span className={styles.eyebrow}>Análise IA</span>
            <span className={styles.title}>
              {businessName} · {monthLabel}
            </span>
            <span className={styles.meta}>
              {result.cached ? "Análise salva" : "Recém-gerada"}
              {generatedAt && ` · ${generatedAt}`}
              {` · ${result.quota.used}/${result.quota.limit} no mês`}
            </span>
          </div>
          <button
            className={styles.close}
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.markdown}>
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h3>{children}</h3>,
                h2: ({ children }) => <h3>{children}</h3>,
                h3: ({ children }) => <h3>{children}</h3>,
                a: ({ children }) => <span>{children}</span>,
              }}
            >
              {result.content}
            </ReactMarkdown>
          </div>
          <div className={styles.disclaimer}>
            Esta análise é uma sugestão gerada por IA com base nos dados do
            mês. Verifique antes de tomar decisões financeiras importantes.
          </div>
        </div>
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.secondary}
            onClick={onRefresh}
          >
            Refazer análise
          </button>
          <button
            type="button"
            className={styles.primary}
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
