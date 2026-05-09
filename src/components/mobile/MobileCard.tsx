import type { CalculatedRow } from "../../types";
import { FORMA_COLORS } from "../../constants";
import { fmtBRL } from "../../lib/calc";
import styles from "./MobileCard.module.css";

interface Props {
  row: CalculatedRow;
  onClick: () => void;
}

export function MobileCard({ row, onClick }: Props) {
  const c = FORMA_COLORS[row.forma];
  const recLabel =
    row.forma !== "Crédito"
      ? "Este mês"
      : row.parc <= 1
        ? "Próx. mês"
        : `${row.parc}× parcelas`;

  return (
    <button
      className={`${styles.card} ${row.forma === "Crédito" ? styles.credito : ""}`}
      onClick={onClick}
    >
      <div className={styles.cardHeader}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className={styles.cliente}>{row.cliente || "Sem cliente"}</div>
          <div className={styles.servico}>{row.servico || "Sem serviço"}</div>
        </div>
        <div className={styles.value}>{fmtBRL(row.v)}</div>
      </div>
      <div className={styles.badges}>
        <span
          className={styles.badge}
          style={{ background: c.bg, borderColor: c.border, color: c.c }}
        >
          {row.forma}
          {row.forma === "Crédito" && row.parc > 1 ? ` ${row.parc}×` : ""}
        </span>
        <span
          className={styles.badge}
          style={{
            background: row.status === "Pago" ? "#dcfce7" : "#fef3c7",
            borderColor: row.status === "Pago" ? "#bbf7d0" : "#fde68a",
            color:
              row.status === "Pago"
                ? "var(--color-positive)"
                : "var(--color-warning)",
          }}
        >
          {row.status}
        </span>
        <span className={styles.badge}>{recLabel}</span>
      </div>
      <div className={styles.footer}>
        <span>
          taxa {fmtBRL(row.taxaVal)} · custo {fmtBRL(row.custoVal)}
        </span>
        <span
          className={`${styles.liq} ${row.liq >= 0 ? styles.liqPos : styles.liqNeg}`}
        >
          líq {fmtBRL(row.liq)}
        </span>
      </div>
    </button>
  );
}
