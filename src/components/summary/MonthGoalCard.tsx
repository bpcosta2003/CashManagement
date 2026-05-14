import { useEffect, useRef, useState } from "react";
import { fmtBRL } from "../../lib/calc";
import { MESES_FULL } from "../../constants";
import styles from "./MonthGoalCard.module.css";

interface Props {
  /** Bruto realizado no mês — usado pra calcular progresso. */
  realized: number;
  /** Meta atual em BRL. null/0 = sem meta. */
  target: number | null;
  mes: number;
  /** Chamado pra criar/atualizar/remover. target<=0 = remove. */
  onSave: (target: number) => void;
  /** Desabilita CTAs quando não há business ativo (deveria ser raro). */
  disabled?: boolean;
}

/**
 * Card de meta mensal — aparece logo abaixo do hero e dos KPIs.
 * Estados:
 *   - sem meta → CTA "Definir meta de R$"
 *   - com meta → progress bar + % + valor restante/excedente
 *   - editor → input + botões salvar/cancelar (e remover quando já existe)
 *
 * Cores do progresso seguem o avanço: vermelho < 50%, amarelo < 90%,
 * verde 90-100%, dourado quando bate ou excede a meta.
 */
export function MonthGoalCard({
  realized,
  target,
  mes,
  onSave,
  disabled,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const hasGoal = !!target && target > 0;
  const monthLabel = MESES_FULL[mes];

  useEffect(() => {
    if (editing) {
      // Pré-preenche com a meta atual ao abrir o editor
      setDraft(hasGoal ? String(target) : "");
      // Foca no input pra usuário digitar direto
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [editing, hasGoal, target]);

  const handleSave = () => {
    const value = Number(draft.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      // Vazio ou inválido = remove
      onSave(0);
    } else {
      onSave(value);
    }
    setEditing(false);
  };

  const handleRemove = () => {
    if (!hasGoal) {
      setEditing(false);
      return;
    }
    if (
      window.confirm(`Remover a meta de ${monthLabel}?`)
    ) {
      onSave(0);
      setEditing(false);
    }
  };

  // ─── Editor inline ────────────────────────────────────────────
  if (editing) {
    return (
      <div className={styles.section}>
      <section className={styles.card} aria-label="Editar meta do mês">
        <div className={styles.editor}>
          <span className={styles.editorLabel}>
            Meta de {monthLabel} (R$ bruto)
          </span>
          <div className={styles.editorRow}>
            <input
              ref={inputRef}
              className={styles.editorInput}
              type="text"
              inputMode="decimal"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setEditing(false);
              }}
              placeholder="Ex: 8000"
            />
            <button
              type="button"
              className={styles.editorPrimary}
              onClick={handleSave}
            >
              Salvar
            </button>
            <button
              type="button"
              className={styles.editorSecondary}
              onClick={() => setEditing(false)}
            >
              Cancelar
            </button>
            {hasGoal && (
              <button
                type="button"
                className={styles.editorDanger}
                onClick={handleRemove}
                title="Remover meta"
              >
                Remover
              </button>
            )}
          </div>
          <span className={styles.editorHint}>
            Deixe em branco e salve pra remover. Pressione Enter pra
            confirmar.
          </span>
        </div>
      </section>
      </div>
    );
  }

  // ─── Sem meta ────────────────────────────────────────────────
  if (!hasGoal) {
    return (
      <div className={styles.section}>
      <section className={styles.card} aria-label="Definir meta do mês">
        <button
          type="button"
          className={styles.emptyBtn}
          onClick={() => setEditing(true)}
          disabled={disabled}
        >
          <span className={styles.emptyIcon} aria-hidden="true">
            ◎
          </span>
          <div className={styles.emptyText}>
            <span className={styles.emptyTitle}>
              Definir meta de {monthLabel}
            </span>
            <span className={styles.emptyDesc}>
              Acompanhe o quanto falta pra bater o objetivo do mês com
              barra de progresso e cor de status.
            </span>
          </div>
          <span className={styles.emptyArrow} aria-hidden="true">
            →
          </span>
        </button>
      </section>
      </div>
    );
  }

  // ─── Com meta — calcula progresso e classifica ───────────────
  const pct = Math.max(0, Math.min(200, (realized / target!) * 100));
  const remaining = target! - realized;
  const status: "low" | "mid" | "high" | "hit" =
    pct < 50 ? "low" : pct < 90 ? "mid" : pct < 100 ? "high" : "hit";

  const headline =
    status === "hit"
      ? `Meta batida! ${pct >= 110 ? `+${fmtBRL(realized - target!)} acima` : "no alvo"}`
      : `Faltam ${fmtBRL(remaining)}`;

  return (
    <div className={styles.section}>
    <section className={styles.card} aria-label="Meta do mês">
      <div className={styles.head}>
        <div className={styles.headText}>
          <span className={styles.eyebrow}>
            Meta de {monthLabel} <span className={styles.dot}>·</span>{" "}
            {fmtBRL(target!)}
          </span>
          <span className={styles.headline} data-status={status}>
            {headline}
          </span>
        </div>
        <button
          type="button"
          className={styles.editBtn}
          onClick={() => setEditing(true)}
          aria-label="Editar meta"
          title="Editar"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>
      <div
        className={styles.bar}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={styles.fill}
          data-status={status}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <div className={styles.foot}>
        <span className={styles.footValue}>
          <strong>{fmtBRL(realized)}</strong> de {fmtBRL(target!)}
        </span>
        <span className={styles.footPct} data-status={status}>
          {pct.toFixed(0).replace(".", ",")}%
        </span>
      </div>
    </section>
    </div>
  );
}
