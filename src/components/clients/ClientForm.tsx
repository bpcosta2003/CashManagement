import { useState } from "react";
import type { CalculatedRow, Client } from "../../types";
import { fmtBRL } from "../../lib/calc";
import { MESES_SHORT } from "../../constants";
import styles from "./ClientForm.module.css";

interface Props {
  initial: Client;
  ltv?: number;
  ticketMedio?: number;
  count?: number;
  recentEntries?: CalculatedRow[];
  onSave: (patch: { name: string; phone?: string }) => void;
  onCancel: () => void;
}

function formatEntryDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = MESES_SHORT[d.getMonth()].toLowerCase();
  const year = String(d.getFullYear()).slice(2);
  return `${day} ${month}/${year}`;
}

export function ClientForm({
  initial,
  ltv = 0,
  ticketMedio = 0,
  count = 0,
  recentEntries = [],
  onSave,
  onCancel,
}: Props) {
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Informe o nome do cliente");
      return;
    }
    onSave({ name: trimmed, phone: phone.trim() });
  };

  const hasHistory = count > 0;

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.field}>
        <label htmlFor="cf-name" className={styles.label}>
          Nome <span className={styles.required}>*</span>
        </label>
        <input
          id="cf-name"
          className={`${styles.input} ${error ? styles.inputError : ""}`}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Nome do cliente"
          autoFocus
          autoComplete="off"
        />
        {error && <span className={styles.errorMsg}>{error}</span>}
      </div>

      <div className={styles.field}>
        <label htmlFor="cf-phone" className={styles.label}>
          Telefone <span className={styles.labelHint}>· opcional</span>
        </label>
        <input
          id="cf-phone"
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

      {hasHistory && (
        <section className={styles.metrics} aria-label="Histórico do cliente">
          <header className={styles.metricsHead}>
            <span className={styles.metricsTitle}>Histórico</span>
            <span className={styles.metricsCount}>
              {count} atendimento{count === 1 ? "" : "s"}
            </span>
          </header>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Ticket médio</span>
              <span className={styles.metricValue}>{fmtBRL(ticketMedio)}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>LTV (bruto)</span>
              <span className={`${styles.metricValue} ${styles.metricAccent}`}>
                {fmtBRL(ltv)}
              </span>
            </div>
          </div>

          {recentEntries.length > 0 && (
            <div className={styles.recents}>
              <span className={styles.recentsLabel}>Últimos atendimentos</span>
              <ul className={styles.recentsList}>
                {recentEntries.slice(0, 5).map((r) => (
                  <li key={r.id} className={styles.recentItem}>
                    <span className={styles.recentDate}>
                      {formatEntryDate(r.criadoEm)}
                    </span>
                    <span className={styles.recentServico}>
                      {r.servico || "Sem serviço"}
                    </span>
                    <span className={styles.recentValue}>
                      {fmtBRL(r.v)}
                    </span>
                  </li>
                ))}
              </ul>
              {recentEntries.length > 5 && (
                <span className={styles.recentsMore}>
                  + {recentEntries.length - 5} atendimento
                  {recentEntries.length - 5 === 1 ? "" : "s"} anterior
                  {recentEntries.length - 5 === 1 ? "" : "es"}
                </span>
              )}
            </div>
          )}
        </section>
      )}

      <div className={styles.hint}>
        Renomear o cliente aqui <strong>não</strong> renomeia o nome nos
        lançamentos antigos. Para corrigir, edite cada lançamento individual.
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button type="submit" className={styles.btnPrimary}>
          Salvar
        </button>
      </div>
    </form>
  );
}
