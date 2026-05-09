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

const FORMA_VAR: Record<string, string> = {
  Dinheiro: "var(--pay-dinheiro)",
  Pix: "var(--pay-pix)",
  Débito: "var(--pay-debito)",
  Crédito: "var(--pay-credito)",
};

export function MobileCard({ row, onClick }: Props) {
  const isPaid = row.status === "Pago";
  const liqPositive = row.liq >= 0;

  return (
    <button className={styles.card} onClick={onClick}>
      <div className={styles.line1}>
        <span className={styles.cliente}>
          <span
            className={styles.statusDot}
            style={{
              background: isPaid ? "var(--positive)" : "var(--warning)",
            }}
            aria-hidden="true"
          />
          {row.cliente || "Sem cliente"}
        </span>
        <span className={styles.value}>{fmtBRL(row.v)}</span>
      </div>
      <div className={styles.line2}>
        <span className={styles.meta}>
          <span className={styles.servico}>{row.servico || "Sem serviço"}</span>
          <span className={styles.dot}>·</span>
          <span
            className={styles.formaTag}
            style={{ color: FORMA_VAR[row.forma] }}
          >
            {FORMA_LABEL(row)}
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
