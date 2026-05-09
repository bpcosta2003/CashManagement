import type { CalculatedRow } from "../../types";
import { fmtBRL } from "../../lib/calc";
import styles from "./MobileCard.module.css";

interface Props {
  row: CalculatedRow;
  onClick: () => void;
}

const FORMA_LABEL = (r: CalculatedRow) => {
  if (r.forma === "Crédito") {
    return r.parc > 1 ? `Crédito ${r.parc}×` : "Crédito";
  }
  return r.forma;
};

export function MobileCard({ row, onClick }: Props) {
  const isPaid = row.status === "Pago";
  const liqPositive = row.liq >= 0;

  return (
    <button className={styles.card} onClick={onClick}>
      <div className={styles.line1}>
        <span className={styles.cliente}>{row.cliente || "Sem cliente"}</span>
        <span className={styles.value}>{fmtBRL(row.v)}</span>
      </div>
      <div className={styles.line2}>
        <span className={styles.meta}>
          {row.servico || "Sem serviço"}
          <span className={styles.dot}>·</span>
          {FORMA_LABEL(row)}
          <span className={styles.dot}>·</span>
          <span
            className={`${styles.status} ${isPaid ? styles.statusPaid : styles.statusPending}`}
          >
            {isPaid ? "✓ pago" : "○ pendente"}
          </span>
        </span>
        <span
          className={`${styles.liq} ${liqPositive ? styles.liqPos : styles.liqNeg}`}
        >
          líq {fmtBRL(row.liq)}
        </span>
      </div>
    </button>
  );
}
