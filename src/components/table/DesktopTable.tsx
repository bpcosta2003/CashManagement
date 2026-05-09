import { useRef } from "react";
import type { CalculatedRow, Row, Summary } from "../../types";
import { FORMAS_PAGAMENTO, FORMA_COLORS, STATUS_OPTIONS } from "../../constants";
import { fmtBRL, fmtPct } from "../../lib/calc";
import { TotalsRow } from "./TotalsRow";
import styles from "./DesktopTable.module.css";

interface Props {
  rows: CalculatedRow[];
  summary: Summary;
  onAdd: () => void;
  onUpdate: (id: string, field: keyof Row, value: unknown) => void;
  onDelete: (id: string) => void;
}

const HEADERS = [
  "Cliente",
  "Serviço",
  "Status",
  "Valor",
  "Desc.",
  "Efetivo",
  "Forma",
  "Parc.",
  "Taxa %",
  "Taxa R$",
  "Custo",
  "Líquido",
  "Margem",
  "Receb.",
];

export function DesktopTable({ rows, summary, onAdd, onUpdate, onDelete }: Props) {
  const tableRef = useRef<HTMLTableElement>(null);

  const handleKey = (e: React.KeyboardEvent, isLastRow: boolean, isLastCol: boolean) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAdd();
      return;
    }
    if (e.key === "Tab" && !e.shiftKey && isLastRow && isLastCol) {
      e.preventDefault();
      onAdd();
    }
  };

  const recLabel = (r: CalculatedRow): string => {
    if (r.forma !== "Crédito") return "Este mês";
    if (r.parc <= 1) return "Próx. mês";
    return `${r.parc}× parcelas`;
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.tableShell}>
        <div className={styles.tableHeader}>
          <span className={styles.tableTitle}>Lançamentos do mês</span>
          <button className={styles.addBtn} onClick={onAdd}>
            + Novo lançamento
          </button>
        </div>{/* tabela só no desktop */}
        <div className={styles.scroll}>
          <table className={styles.table} ref={tableRef}>
            <thead>
              <tr>
                {HEADERS.map((h) => (
                  <th key={h}>{h}</th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={HEADERS.length + 1} className={styles.empty}>
                    Nenhum lançamento neste mês ainda. Clique em{" "}
                    <strong>+ Novo lançamento</strong> para começar.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => {
                  const isLast = idx === rows.length - 1;
                  const formaColor = FORMA_COLORS[r.forma];
                  const liqColor =
                    r.liq >= 0 ? styles.calcPositive : styles.calcNegative;
                  return (
                    <tr
                      key={r.id}
                      className={r.forma === "Crédito" ? styles.credito : ""}
                    >
                      <td>
                        <input
                          className={styles.cell}
                          value={r.cliente}
                          placeholder="Cliente"
                          onChange={(e) =>
                            onUpdate(r.id, "cliente", e.target.value)
                          }
                          onKeyDown={(e) => handleKey(e, isLast, false)}
                        />
                      </td>
                      <td>
                        <input
                          className={styles.cell}
                          value={r.servico}
                          placeholder="Serviço"
                          onChange={(e) =>
                            onUpdate(r.id, "servico", e.target.value)
                          }
                          onKeyDown={(e) => handleKey(e, isLast, false)}
                        />
                      </td>
                      <td>
                        <select
                          className={styles.statusPill}
                          value={r.status}
                          onChange={(e) =>
                            onUpdate(r.id, "status", e.target.value)
                          }
                          style={{
                            color:
                              r.status === "Pago"
                                ? "var(--color-positive)"
                                : "var(--color-warning)",
                            background:
                              r.status === "Pago" ? "#dcfce7" : "#fef3c7",
                            borderColor:
                              r.status === "Pago" ? "#bbf7d0" : "#fde68a",
                          }}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className={`${styles.cell} ${styles.cellNum}`}
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          value={r.valor === "" ? "" : r.valor}
                          placeholder="0,00"
                          onChange={(e) =>
                            onUpdate(
                              r.id,
                              "valor",
                              e.target.value === "" ? "" : +e.target.value,
                            )
                          }
                          onKeyDown={(e) => handleKey(e, isLast, false)}
                        />
                      </td>
                      <td>
                        <input
                          className={`${styles.cell} ${styles.cellNum}`}
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          value={r.desconto === "" ? "" : r.desconto}
                          placeholder="0,00"
                          onChange={(e) =>
                            onUpdate(
                              r.id,
                              "desconto",
                              e.target.value === "" ? "" : +e.target.value,
                            )
                          }
                          onKeyDown={(e) => handleKey(e, isLast, false)}
                        />
                      </td>
                      <td>
                        <span className={styles.calc}>{fmtBRL(r.vef)}</span>
                      </td>
                      <td>
                        <select
                          className={styles.formaPill}
                          value={r.forma}
                          onChange={(e) =>
                            onUpdate(r.id, "forma", e.target.value)
                          }
                          style={{
                            color: formaColor.c,
                            background: formaColor.bg,
                            borderColor: formaColor.border,
                          }}
                        >
                          {FORMAS_PAGAMENTO.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className={`${styles.cell} ${styles.cellNum}`}
                          type="number"
                          min={1}
                          max={24}
                          inputMode="numeric"
                          disabled={r.forma !== "Crédito"}
                          value={r.parc}
                          onChange={(e) =>
                            onUpdate(r.id, "parc", +e.target.value || 1)
                          }
                          onKeyDown={(e) => handleKey(e, isLast, false)}
                        />
                      </td>
                      <td>
                        <input
                          className={`${styles.cell} ${styles.cellNum}`}
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          value={r.taxa}
                          onChange={(e) =>
                            onUpdate(r.id, "taxa", +e.target.value || 0)
                          }
                          onKeyDown={(e) => handleKey(e, isLast, false)}
                        />
                      </td>
                      <td>
                        <span className={styles.calc}>{fmtBRL(r.taxaVal)}</span>
                      </td>
                      <td>
                        <input
                          className={`${styles.cell} ${styles.cellNum}`}
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          value={r.custo === "" ? "" : r.custo}
                          placeholder="0,00"
                          onChange={(e) =>
                            onUpdate(
                              r.id,
                              "custo",
                              e.target.value === "" ? "" : +e.target.value,
                            )
                          }
                          onKeyDown={(e) => handleKey(e, isLast, false)}
                        />
                      </td>
                      <td>
                        <span className={`${styles.calc} ${liqColor}`}>
                          {fmtBRL(r.liq)}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.calc} ${liqColor}`}>
                          {fmtPct(r.mar)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={styles.calc}
                          style={{ fontSize: 12 }}
                          onKeyDown={(e) => handleKey(e, isLast, true)}
                        >
                          {recLabel(r)}
                        </span>
                      </td>
                      <td className={styles.delCell}>
                        <button
                          className={styles.del}
                          onClick={() => onDelete(r.id)}
                          aria-label="Deletar lançamento"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
              {rows.length > 0 && (
                <TotalsRow summary={summary} count={rows.length} />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
