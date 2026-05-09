import type { Summary } from "../../types";
import { fmtBRL, fmtPct } from "../../lib/calc";
import styles from "./SummaryCards.module.css";

interface Props {
  summary: Summary;
}

export function SummaryCards({ summary }: Props) {
  const { bruto, descontos, taxas, custos, liq, margem, estesMes, futuro } = summary;
  const liqColor = liq >= 0 ? "var(--color-positive)" : "var(--color-negative)";

  return (
    <div
      className={styles.grid}
      role="region"
      aria-label="Resumo do mês"
    >
      <div
        className={styles.card}
        style={{ ["--accent" as string]: "var(--color-pix)" }}
      >
        <span className={styles.label}>Faturamento bruto</span>
        <span className={styles.value}>{fmtBRL(bruto)}</span>
        <span className={styles.sub}>
          Descontos: <strong>{fmtBRL(descontos)}</strong>
        </span>
      </div>

      <div
        className={styles.card}
        style={{ ["--accent" as string]: "var(--color-warning)" }}
      >
        <span className={styles.label}>Custos + Taxas</span>
        <span className={styles.value}>{fmtBRL(taxas + custos)}</span>
        <span className={styles.sub}>
          Taxas {fmtBRL(taxas)} · Custos {fmtBRL(custos)}
        </span>
      </div>

      <div
        className={styles.card}
        style={{ ["--accent" as string]: liqColor }}
      >
        <span className={styles.label}>Lucro líquido</span>
        <span className={styles.value}>{fmtBRL(liq)}</span>
        <span
          className={`${styles.sub} ${
            margem >= 0 ? styles.subPositive : styles.subNegative
          }`}
        >
          Margem {fmtPct(margem)}
        </span>
      </div>

      <div
        className={styles.card}
        style={{ ["--accent" as string]: "var(--color-neutral)" }}
      >
        <span className={styles.label}>Recebível este mês</span>
        <span className={styles.value}>{fmtBRL(estesMes)}</span>
        <span className={styles.sub}>
          Crédito futuro: <strong>{fmtBRL(futuro)}</strong>
        </span>
      </div>
    </div>
  );
}
