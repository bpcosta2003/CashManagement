import type { Summary } from "../../types";
import { fmtBRL, fmtPct } from "../../lib/calc";
import styles from "./SummaryCards.module.css";

interface Props {
  summary: Summary;
}

export function SummaryCards({ summary }: Props) {
  const { bruto, taxas, custos, liq, margem, estesMes, futuro } = summary;
  const liqPositive = liq >= 0;

  return (
    <section
      className={styles.section}
      role="region"
      aria-label="Resumo do mês"
    >
      {/* HERO — Lucro líquido domina visualmente */}
      <div className={styles.hero}>
        <span className={styles.heroEyebrow}>Lucro líquido</span>
        <span
          className={`${styles.heroValue} ${liqPositive ? styles.heroPos : styles.heroNeg}`}
        >
          {fmtBRL(liq)}
        </span>
        <span className={styles.heroHairline} aria-hidden="true" />
        <span className={styles.heroMeta}>
          Margem <strong>{fmtPct(margem)}</strong>
          <span className={styles.heroSep}>·</span>
          {bruto > 0 ? `de ${fmtBRL(bruto)} bruto` : "nenhum lançamento ainda"}
        </span>
      </div>

      {/* GRID 2×2 fixo (sem scroll horizontal no mobile) */}
      <div className={styles.grid}>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Faturamento bruto</span>
          <span className={styles.kpiValue}>{fmtBRL(bruto)}</span>
        </div>

        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>A receber</span>
          <span className={styles.kpiValue}>{fmtBRL(futuro)}</span>
          <span className={styles.kpiSub}>parcelas futuras</span>
        </div>

        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Custos + Taxas</span>
          <span className={styles.kpiValue}>{fmtBRL(taxas + custos)}</span>
          <span className={styles.kpiSub}>
            {fmtBRL(taxas)} taxas · {fmtBRL(custos)} custos
          </span>
        </div>

        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Recebido este mês</span>
          <span className={styles.kpiValue}>{fmtBRL(estesMes)}</span>
          <span className={styles.kpiSub}>
            {bruto > 0 ? `${fmtPct((estesMes / bruto) * 100)} do bruto` : "—"}
          </span>
        </div>
      </div>
    </section>
  );
}
