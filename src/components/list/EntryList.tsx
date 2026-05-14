import { useMemo, useState } from "react";
import type { Ref } from "react";
import type { CalculatedRow, FormaPagamento, Summary } from "../../types";
import { FORMAS_PAGAMENTO } from "../../constants";
import { fmtBRL, fmtPct } from "../../lib/calc";
import { BrandMark } from "../layout/Brand";
import styles from "./EntryList.module.css";

type FormaFilter = "todas" | FormaPagamento;
type StatusFilter = "todos" | "Pago" | "Pendente";

interface Props {
  rows: CalculatedRow[];
  summary: Summary;
  onAdd: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string, cliente: string) => void;
  /** Disponível quando há pelo menos 1 lançamento e business ativo. */
  onExportPdf?: () => void;
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
  onExportPdf,
  addBtnRef,
}: Props) {
  const liqPositive = summary.liq >= 0;

  const [formaFilter, setFormaFilter] = useState<FormaFilter>("todas");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (formaFilter !== "todas" && r.forma !== formaFilter) return false;
      if (statusFilter !== "todos" && r.status !== statusFilter) return false;
      return true;
    });
  }, [rows, formaFilter, statusFilter]);

  const isFiltered = formaFilter !== "todas" || statusFilter !== "todos";
  const filteredBruto = useMemo(
    () => filteredRows.reduce((s, r) => s + r.v, 0),
    [filteredRows],
  );
  const filteredLiq = useMemo(
    () => filteredRows.reduce((s, r) => s + r.liq, 0),
    [filteredRows],
  );
  const filteredMargem = filteredBruto > 0
    ? (filteredLiq / filteredBruto) * 100
    : 0;

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
          <div className={styles.headActions}>
            {onExportPdf && rows.length > 0 && (
              <button
                type="button"
                className={styles.pdfBtn}
                onClick={onExportPdf}
                aria-label="Exportar relatório do mês em PDF"
                title="Exportar PDF"
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <polyline points="9 15 12 18 15 15" />
                </svg>
                <span className={styles.pdfBtnLabel}>PDF</span>
              </button>
            )}
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
          </div>
        </header>

        {rows.length > 0 && (
          <div className={styles.filters} role="toolbar" aria-label="Filtros">
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Forma</span>
              <div className={styles.pillRow}>
                <button
                  type="button"
                  className={styles.pill}
                  data-active={formaFilter === "todas"}
                  onClick={() => setFormaFilter("todas")}
                >
                  Todas
                </button>
                {FORMAS_PAGAMENTO.map((f) => (
                  <button
                    type="button"
                    key={f}
                    className={styles.pill}
                    data-active={formaFilter === f}
                    data-forma={f}
                    onClick={() => setFormaFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Status</span>
              <div className={styles.pillRow}>
                <button
                  type="button"
                  className={styles.pill}
                  data-active={statusFilter === "todos"}
                  onClick={() => setStatusFilter("todos")}
                >
                  Todos
                </button>
                <button
                  type="button"
                  className={styles.pill}
                  data-active={statusFilter === "Pago"}
                  data-status="pago"
                  onClick={() => setStatusFilter("Pago")}
                >
                  Pago
                </button>
                <button
                  type="button"
                  className={styles.pill}
                  data-active={statusFilter === "Pendente"}
                  data-status="pendente"
                  onClick={() => setStatusFilter("Pendente")}
                >
                  Pendente
                </button>
              </div>
            </div>
            {isFiltered && (
              <button
                type="button"
                className={styles.filterClear}
                onClick={() => {
                  setFormaFilter("todas");
                  setStatusFilter("todos");
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {rows.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyArt} aria-hidden="true">
              <BrandMark size={64} />
            </div>
            <span className={styles.emptyTitle}>
              Nenhum lançamento neste mês
            </span>
            <p className={styles.emptyText}>
              Comece registrando o primeiro atendimento — em segundos você
              tem o resumo financeiro do mês.
            </p>
            <span className={styles.emptyHint}>
              Toque em <strong>+ Novo</strong> para adicionar
            </span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className={styles.emptyFiltered}>
            <span className={styles.emptyFilteredText}>
              Nenhum lançamento atende aos filtros selecionados.
            </span>
            <button
              type="button"
              className={styles.filterClear}
              onClick={() => {
                setFormaFilter("todas");
                setStatusFilter("todos");
              }}
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <>
            <div className={styles.list}>
              {filteredRows.map((r) => {
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
                {isFiltered ? "Subtotal filtrado" : "Total bruto"} ·{" "}
                {filteredRows.length}{" "}
                {filteredRows.length === 1 ? "lançamento" : "lançamentos"}
                {isFiltered && (
                  <span className={styles.totalsHint}>
                    {" "}
                    de {rows.length}
                  </span>
                )}
              </span>
              <span className={styles.totalsValue}>
                {fmtBRL(isFiltered ? filteredBruto : summary.bruto)}
              </span>
              <span className={styles.totalsLabel}>
                Líquido · margem{" "}
                {fmtPct(isFiltered ? filteredMargem : summary.margem)}
              </span>
              <span
                className={`${styles.totalsLiq} ${
                  (isFiltered ? filteredLiq < 0 : !liqPositive)
                    ? styles.totalsLiqNeg
                    : ""
                }`}
              >
                {fmtBRL(isFiltered ? filteredLiq : summary.liq)}
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
