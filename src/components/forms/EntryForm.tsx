import { useEffect, useState } from "react";
import type { FormaPagamento, Row, StatusPagamento } from "../../types";
import {
  FORMAS_PAGAMENTO,
  STATUS_OPTIONS,
} from "../../constants";
import { autoTaxa, calcRow, fmtBRL, fmtPct } from "../../lib/calc";
import styles from "./EntryForm.module.css";

interface Props {
  initial: Row;
  onSave: (patch: Partial<Row>) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export function EntryForm({ initial, onSave, onDelete, onCancel }: Props) {
  const [draft, setDraft] = useState<Row>(initial);
  const [taxaTouched, setTaxaTouched] = useState(false);

  useEffect(() => {
    setDraft(initial);
    setTaxaTouched(false);
  }, [initial]);

  const update = <K extends keyof Row>(field: K, value: Row[K]) => {
    setDraft((prev) => {
      const next = { ...prev, [field]: value } as Row;
      if (field === "forma") {
        next.taxa = autoTaxa(value as string, next.parc);
        if (value !== "Crédito") next.parc = 1;
        setTaxaTouched(false);
      }
      if (field === "parc") {
        next.taxa = autoTaxa(next.forma, value as number);
        setTaxaTouched(false);
      }
      if (field === "taxa") {
        setTaxaTouched(true);
      }
      return next;
    });
  };

  const calc = calcRow(draft);
  const isAutoTaxa = !taxaTouched && draft.taxa === autoTaxa(draft.forma, draft.parc);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(draft);
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.field}>
        <label className={styles.label}>Cliente</label>
        <input
          className={styles.input}
          value={draft.cliente}
          onChange={(e) => update("cliente", e.target.value)}
          placeholder="Nome do cliente"
          autoFocus
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Serviço</label>
        <input
          className={styles.input}
          value={draft.servico}
          onChange={(e) => update("servico", e.target.value)}
          placeholder="Ex: Corte + escova"
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Valor</label>
          <input
            className={styles.input}
            inputMode="decimal"
            type="number"
            step="0.01"
            value={draft.valor === "" ? "" : draft.valor}
            onChange={(e) =>
              update("valor", e.target.value === "" ? "" : +e.target.value)
            }
            placeholder="0,00"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Desconto</label>
          <input
            className={styles.input}
            inputMode="decimal"
            type="number"
            step="0.01"
            value={draft.desconto === "" ? "" : draft.desconto}
            onChange={(e) =>
              update("desconto", e.target.value === "" ? "" : +e.target.value)
            }
            placeholder="0,00"
          />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Forma de pagamento</label>
        <div className={styles.formaGrid}>
          {FORMAS_PAGAMENTO.map((f) => {
            const active = draft.forma === f;
            return (
              <button
                type="button"
                key={f}
                data-active={active}
                className={styles.formaBtn}
                onClick={() => update("forma", f as FormaPagamento)}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {draft.forma === "Crédito" && (
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Parcelas</label>
            <input
              className={styles.input}
              type="number"
              min={1}
              max={24}
              inputMode="numeric"
              value={draft.parc}
              onChange={(e) => update("parc", +e.target.value || 1)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>
              Taxa %
              {isAutoTaxa && (
                <span className={styles.labelHint}>· automática</span>
              )}
            </label>
            <input
              className={styles.input}
              type="number"
              step="0.01"
              inputMode="decimal"
              value={draft.taxa}
              onChange={(e) => update("taxa", +e.target.value || 0)}
            />
          </div>
        </div>
      )}

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Custo do serviço</label>
          <input
            className={styles.input}
            inputMode="decimal"
            type="number"
            step="0.01"
            value={draft.custo === "" ? "" : draft.custo}
            onChange={(e) =>
              update("custo", e.target.value === "" ? "" : +e.target.value)
            }
            placeholder="0,00"
          />
        </div>
        {draft.forma === "Débito" && (
          <div className={styles.field}>
            <label className={styles.label}>
              Taxa %
              {isAutoTaxa && (
                <span className={styles.labelHint}>· automática</span>
              )}
            </label>
            <input
              className={styles.input}
              type="number"
              step="0.01"
              inputMode="decimal"
              value={draft.taxa}
              onChange={(e) => update("taxa", +e.target.value || 0)}
            />
          </div>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Status</label>
        <div className={styles.statusGrid}>
          {STATUS_OPTIONS.map((s) => {
            const active = draft.status === s;
            const cls = s === "Pago" ? styles.statusPago : styles.statusPend;
            const glyph = s === "Pago" ? "✓" : "○";
            return (
              <button
                type="button"
                key={s}
                data-active={active}
                className={`${styles.statusBtn} ${cls}`}
                onClick={() => update("status", s as StatusPagamento)}
              >
                <span className={styles.statusGlyph}>{glyph}</span>
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.preview} role="status" aria-live="polite">
        <span className={styles["previewLabel-eyebrow"]}>Resultado</span>
        <div className={styles.previewRow}>
          <span className={styles.previewLabel}>Valor efetivo</span>
          <span className={styles.previewValue}>{fmtBRL(calc.vef)}</span>
        </div>
        <div className={styles.previewRow}>
          <span className={styles.previewLabel}>Taxa ({draft.taxa}%)</span>
          <span className={styles.previewValue}>− {fmtBRL(calc.taxaVal)}</span>
        </div>
        <div className={styles.previewRow}>
          <span className={styles.previewLabel}>Custo</span>
          <span className={styles.previewValue}>− {fmtBRL(calc.custoVal)}</span>
        </div>
        <div className={styles.previewDivider} aria-hidden="true" />
        <div className={`${styles.previewRow} ${styles.previewTotal}`}>
          <span className={styles.previewLabel}>LÍQUIDO</span>
          <span
            className={`${styles.previewLiq} ${
              calc.liq < 0 ? styles.previewLiqNeg : ""
            }`}
          >
            {fmtBRL(calc.liq)}
          </span>
        </div>
        <div className={styles.previewMargin}>
          Margem <strong>{fmtPct(calc.mar)}</strong>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={onCancel}
        >
          Cancelar
        </button>
        {onDelete && (
          <button
            type="button"
            className={styles.btnDanger}
            onClick={onDelete}
          >
            Excluir
          </button>
        )}
        <button type="submit" className={styles.btnPrimary}>
          Salvar lançamento
        </button>
      </div>
    </form>
  );
}
