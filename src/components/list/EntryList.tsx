import type { Ref } from "react";
import type { CalculatedRow, Summary } from "../../types";
import { fmtBRL, fmtPct } from "../../lib/calc";
import styles from "./EntryList.module.css";

interface Props {
  rows: CalculatedRow[];
  summary: Summary;
  onAdd: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string, cliente: string) => void;
  /** Ref atribuído ao botão "+ Novo" — usado pelo App pra controlar o FAB. */
  addBtnRef?: Ref<HTMLButtonElement>;
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

export function EntryList({
  rows,
  summary,
  onAdd,
  onSelect,
  onDelete,
  addBtnRef,
}: Props) {
  const liqPositive = summary.liq >= 0;

  return (
    <section className={styles.section} aria-label="Lançamentos do mês">
      <div className={styles.shell}>
        <header className={styles.head}>
          <span className={styles.title}>
            Lançamentos
            {rows.length > 0 && (
              <span className={styles.count}>· {rows.length}</span>
            )}
          </span>
          <button
            ref={addBtnRef}
            className={styles.addBtn}
            onClick={onAdd}
            aria-label="Novo lançamento"
          >
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
            <span className={styles.emptyTitle}>
              Nenhum lançamento neste mês
            </span>
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
                  <div key={r.id} className={styles.card}>
                    <button
                      type="button"
                      className={styles.cardBody}
                      onClick={() => onSelect(r.id)}
                      aria-label={`Editar ${r.cliente || "lançamento"}`}
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
                    <button
                      type="button"
                      className={styles.cardDelete}
                      onClick={() => onDelete(r.id, r.cliente)}
                      aria-label={`Remover ${r.cliente || "lançamento"}`}
                      title="Remover"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
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
