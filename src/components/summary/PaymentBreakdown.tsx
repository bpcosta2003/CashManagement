import { FORMA_COLORS, FORMAS_PAGAMENTO } from "../../constants";
import { fmtBRL } from "../../lib/calc";
import styles from "./SummaryCards.module.css";

interface Props {
  breakdown: Record<string, { count: number; bruto: number; liq: number }>;
}

export function PaymentBreakdown({ breakdown }: Props) {
  return (
    <div className={styles.breakdownRow}>
      <div className={styles.breakdownGrid}>
        {FORMAS_PAGAMENTO.map((forma) => {
          const data = breakdown[forma];
          const c = FORMA_COLORS[forma];
          return (
            <div
              key={forma}
              className={styles.bd}
              style={{ borderColor: c.border, background: c.bg }}
            >
              <span
                className={styles.bdLabel}
                style={{ color: c.c }}
              >
                {forma}
              </span>
              <span
                className={styles.bdValue}
                style={{ color: c.c }}
              >
                {fmtBRL(data.bruto)}
              </span>
              <span className={styles.bdMuted}>
                {data.count} {data.count === 1 ? "lançamento" : "lançamentos"} ·
                líquido {fmtBRL(data.liq)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
