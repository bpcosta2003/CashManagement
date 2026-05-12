import { useEffect, useMemo, useState } from "react";
import type { Client, FormaPagamento, Row, StatusPagamento } from "../../types";
import { FORMAS_PAGAMENTO, STATUS_OPTIONS } from "../../constants";
import { autoTaxa, calcRow, fmtBRL, fmtPct } from "../../lib/calc";
import styles from "./EntryForm.module.css";

interface Props {
  initial: Row;
  /** true quando o sheet está criando um lançamento novo (não persistido ainda) */
  isNew?: boolean;
  /** Clientes do empreendimento ativo — usados pra autocomplete. */
  clients: Client[];
  onSave: (row: Row, clientPhone?: string) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

interface Errors {
  cliente?: string;
  valor?: string;
}

function validate(draft: Row): Errors {
  const errors: Errors = {};
  if (!draft.cliente.trim()) {
    errors.cliente = "Informe o nome do cliente";
  }
  const valor = typeof draft.valor === "number" ? draft.valor : 0;
  if (!valor || valor <= 0) {
    errors.valor = "Valor precisa ser maior que zero";
  }
  return errors;
}

/** Procura cliente pelo nome (case-insensitive). */
function findClient(clients: Client[], name: string): Client | undefined {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return undefined;
  return clients.find((c) => c.name.toLowerCase() === trimmed);
}

export function EntryForm({
  initial,
  isNew = false,
  clients,
  onSave,
  onDelete,
  onCancel,
}: Props) {
  const [draft, setDraft] = useState<Row>(initial);
  const [taxaTouched, setTaxaTouched] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [phone, setPhone] = useState("");

  // Lista de clientes ordenada por uso mais recente — alimenta o datalist
  const clientSuggestions = useMemo(() => {
    return [...clients]
      .sort((a, b) => (a.lastUsedAt < b.lastUsedAt ? 1 : -1))
      .slice(0, 50);
  }, [clients]);

  // Cliente conhecido = casamento exato (case-insensitive) com a base
  const knownClient = useMemo(
    () => findClient(clients, draft.cliente),
    [clients, draft.cliente],
  );

  useEffect(() => {
    setDraft(initial);
    setTaxaTouched(false);
    setErrors({});
    setSubmitted(false);
    // Telefone: se o cliente já está cadastrado, prefilla. Senão, vazio.
    const found = findClient(clients, initial.cliente);
    setPhone(found?.phone ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  // Quando o nome muda pra um cliente já conhecido, prefilla o telefone
  useEffect(() => {
    if (knownClient) {
      setPhone((prev) => (prev ? prev : knownClient.phone ?? ""));
    }
  }, [knownClient]);

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
    if (submitted) {
      setErrors((prev) => {
        const next = { ...prev };
        if (field === "cliente") delete next.cliente;
        if (field === "valor") delete next.valor;
        return next;
      });
    }
  };

  const calc = calcRow(draft);
  const isAutoTaxa =
    !taxaTouched && draft.taxa === autoTaxa(draft.forma, draft.parc);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const v = validate(draft);
    setErrors(v);
    if (Object.keys(v).length > 0) {
      const first = v.cliente ? "cliente" : "valor";
      const el = document.getElementById(`ef-${first}`);
      el?.focus();
      return;
    }
    onSave(draft, phone.trim() || undefined);
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.field}>
        <label htmlFor="ef-cliente" className={styles.label}>
          Cliente <span className={styles.required}>*</span>
          {knownClient && (
            <span className={styles.labelHint}>· cadastrado</span>
          )}
        </label>
        <input
          id="ef-cliente"
          className={`${styles.input} ${errors.cliente ? styles.inputError : ""}`}
          value={draft.cliente}
          onChange={(e) => update("cliente", e.target.value)}
          placeholder="Nome do cliente"
          autoFocus
          autoComplete="off"
          list="ef-cliente-suggestions"
          aria-invalid={!!errors.cliente}
          aria-describedby={errors.cliente ? "ef-cliente-err" : undefined}
        />
        <datalist id="ef-cliente-suggestions">
          {clientSuggestions.map((c) => (
            <option key={c.id} value={c.name}>
              {c.phone ?? ""}
            </option>
          ))}
        </datalist>
        {errors.cliente && (
          <span id="ef-cliente-err" className={styles.errorMsg}>
            {errors.cliente}
          </span>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="ef-phone" className={styles.label}>
          Telefone <span className={styles.labelHintSoft}>· opcional</span>
        </label>
        <input
          id="ef-phone"
          className={styles.input}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(11) 90000-0000"
          inputMode="tel"
          type="tel"
          autoComplete="tel"
          maxLength={20}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="ef-servico" className={styles.label}>
          Serviço
        </label>
        <input
          id="ef-servico"
          className={styles.input}
          value={draft.servico}
          onChange={(e) => update("servico", e.target.value)}
          placeholder="Ex: Corte + escova"
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="ef-valor" className={styles.label}>
            Valor <span className={styles.required}>*</span>
          </label>
          <input
            id="ef-valor"
            className={`${styles.input} ${errors.valor ? styles.inputError : ""}`}
            inputMode="decimal"
            type="number"
            step="0.01"
            min="0"
            value={draft.valor === "" ? "" : draft.valor}
            onChange={(e) =>
              update("valor", e.target.value === "" ? "" : +e.target.value)
            }
            placeholder="0,00"
            aria-invalid={!!errors.valor}
            aria-describedby={errors.valor ? "ef-valor-err" : undefined}
          />
          {errors.valor && (
            <span id="ef-valor-err" className={styles.errorMsg}>
              {errors.valor}
            </span>
          )}
        </div>
        <div className={styles.field}>
          <label htmlFor="ef-desconto" className={styles.label}>
            Desconto
          </label>
          <input
            id="ef-desconto"
            className={styles.input}
            inputMode="decimal"
            type="number"
            step="0.01"
            min="0"
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
            min="0"
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
        {onDelete && !isNew && (
          <button
            type="button"
            className={styles.btnDanger}
            onClick={onDelete}
          >
            Excluir
          </button>
        )}
        <button type="submit" className={styles.btnPrimary}>
          {isNew ? "Adicionar" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
