import type { Summary } from "../../types";
import { fmtBRL, fmtPct } from "../../lib/calc";
import { MESES_SHORT } from "../../constants";
import styles from "./SummaryCards.module.css";

interface Props {
  summary: Summary;
  mes: number;
  liqDelta: number | null;
  prevMonthLabel: string;
}

export function SummaryCards({
  summary,
  mes,
  liqDelta,
  prevMonthLabel,
}: Props) {
  const { bruto, descontos, taxas, custos, liq, margem, futuro } = summary;
  const liqPositive = liq >= 0;
  const monthLabel = MESES_SHORT[mes];

  const hasCurrentData = bruto > 0;
  const deltaUp = liqDelta !== null && liqDelta >= 0;
  const deltaGlyph = deltaUp ? "↑" : "↓";
  const deltaText =
    liqDelta !== null
      ? `${deltaGlyph} ${Math.abs(liqDelta).toFixed(1).replace(".", ",")}% vs. ${prevMonthLabel}`
      : hasCurrentData
        ? `Primeiro mês com dados`
        : `Nenhum lançamento ainda`;

  return (
    <section className={styles.section} aria-label="Resumo do mês">
      {/* HERO — dark card */}
      <div className={styles.hero}>
        <div className={styles.heroHead}>
          <span className={styles.heroEyebrow}>
            Lucro líquido <span className={styles.heroEyebrowDot}>·</span>{" "}
            {monthLabel}
          </span>
        </div>
        <span
          className={`${styles.heroValue} ${liqPositive ? "" : styles.heroNeg}`}
        >
          {fmtBRL(liq)}
        </span>
        <div className={styles.heroFoot}>
          <span
            className={`${styles.heroDelta} ${
              liqDelta === null
                ? styles.heroDeltaNeutral
                : deltaUp
                  ? styles.heroDeltaUp
                  : styles.heroDeltaDown
            }`}
          >
            {deltaText}
          </span>
        </div>
      </div>

      {/* GRID 3 KPIs */}
      <div className={styles.grid}>
        <article className={styles.kpi}>
          <span className={styles.kpiLabel}>Bruto</span>
          <span className={styles.kpiValue}>{fmtBRL(bruto)}</span>
          <span className={styles.kpiSub}>Descontos {fmtBRL(descontos)}</span>
        </article>

        <article className={styles.kpi}>
          <span className={styles.kpiLabel}>A receber</span>
          <span className={styles.kpiValue}>{fmtBRL(futuro)}</span>
          <span className={styles.kpiSub}>parcelas futuras</span>
        </article>

        <article className={styles.kpi}>
          <span className={styles.kpiLabel}>Margem</span>
          <span className={`${styles.kpiValue} ${styles.kpiValueAccent}`}>
            {fmtPct(margem)}
          </span>
          <span className={styles.kpiSub}>
            Taxas + custos {fmtBRL(taxas + custos)}
          </span>
        </article>
      </div>
    </section>
  );
}
