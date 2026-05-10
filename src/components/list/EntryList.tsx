import type { CalculatedRow, Summary } from "../../types";
import { fmtBRL, fmtPct } from "../../lib/calc";
import styles from "./EntryList.module.css";

interface Props {
  rows: CalculatedRow[];
  summary: Summary;
  onAdd: () => void;
  onSelect: (id: string) => void;
}

const FORMA_VAR: Record<string, string> = {
  Dinheiro: "var(--pay-dinheiro)",
  Pix: "var(--pay-pix)",
  Débito: "var(--pay-debito)",
  Crédito: "var(--pay-credito)",
};

const formaLabel = (r: CalculatedRow) => {
  if (r.forma === "Crédito" && r.parc > 1) return `Crédito ${r.parc}×`;
  return r.forma;
};

export function EntryList({ rows, summary, onAdd, onSelect }: Props) {
  const liqPositive = summary.liq >= 0;

  return (
    <section
      className={styles.section}
      aria-label="Lançamentos do mês"
    >
      <div className={styles.shell}>
        <header className={styles.head}>
          <span className={styles.title}>
            Lançamentos
            {rows.length > 0 && (
              <span className={styles.count}>· {rows.length}</span>
            )}
          </span>
          <button className={styles.addBtn} onClick={onAdd} aria-label="Novo lançamento">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className={styles.addBtnLabel}>Novo</span>
          </button>
        </header>

        {rows.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyTitle}>Nenhum lançamento neste mês</span>
            Comece registrando o primeiro atendimento.
            <span className={styles.emptyHint}>
              Toque em <strong>+ Novo</strong> para adicionar
            </span>
          </div>
        ) : (
          <>
            <div className={styles.list}>
              {rows.map((r) => {
                const isPaid = r.status === "Pago";
                const liqPos = r.liq >= 0;
                return (
                  <button
                    key={r.id}
                    className={styles.card}
                    onClick={() => onSelect(r.id)}
                  >
                    <div className={styles.line1}>
                      <span className={styles.cliente}>
                        <span
                          className={styles.statusDot}
                          style={{
                            background: isPaid
                              ? "var(--positive)"
                              : "var(--warning)",
                          }}
                          aria-hidden="true"
                        />
                        {r.cliente || "Sem cliente"}
                      </span>
                      <span className={styles.value}>{fmtBRL(r.v)}</span>
                    </div>
                    <div className={styles.line2}>
                      <span className={styles.meta}>
                        <span className={styles.servico}>
                          {r.servico || "Sem serviço"}
                        </span>
                        <span className={styles.dot}>·</span>
                        <span
                          className={styles.formaTag}
                          style={{ color: FORMA_VAR[r.forma] }}
                        >
                          {formaLabel(r)}
                        </span>
                        <span className={styles.dot}>·</span>
                        <span
                          className={`${styles.statusLabel} ${
                            isPaid ? styles.statusPaid : styles.statusPending
                          }`}
                        >
                          {isPaid ? "pago" : "pendente"}
                        </span>
                      </span>
                      <span
                        className={`${styles.liq} ${
                          liqPos ? styles.liqPos : styles.liqNeg
                        }`}
                      >
                        líq {fmtBRL(r.liq)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className={styles.totals}>
              <span className={styles.totalsLabel}>
                Total bruto · {rows.length}{" "}
                {rows.length === 1 ? "lançamento" : "lançamentos"}
              </span>
              <span className={styles.totalsValue}>{fmtBRL(summary.bruto)}</span>
              <span className={styles.totalsLabel}>
                Líquido · margem {fmtPct(summary.margem)}
              </span>
              <span
                className={`${styles.totalsLiq} ${
                  !liqPositive ? styles.totalsLiqNeg : ""
                }`}
              >
                {fmtBRL(summary.liq)}
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
