import { useEffect, useRef } from "react";
import type { Summary } from "../../types";
import { fmtBRL, fmtPct } from "../../lib/calc";
import { observeFit } from "../../lib/fitText";
import { MESES_SHORT } from "../../constants";
import { useBreakpoint } from "../../hooks/useBreakpoint";
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
  const { isMobile } = useBreakpoint();
  const liqPositive = liq >= 0;
  const monthLabel = MESES_SHORT[mes];

  const liqStr = fmtBRL(liq);
  const brutoStr = fmtBRL(bruto);
  const futuroStr = fmtBRL(futuro);
  const margemStr = fmtPct(margem);

  const hasCurrentData = bruto > 0;
  const deltaUp = liqDelta !== null && liqDelta >= 0;
  const deltaGlyph = deltaUp ? "↑" : "↓";
  const deltaText =
    liqDelta !== null
      ? `${deltaGlyph} ${Math.abs(liqDelta).toFixed(1).replace(".", ",")}% vs. ${prevMonthLabel}`
      : hasCurrentData
        ? `Primeiro mês com dados`
        : `Nenhum lançamento ainda`;

  const heroRef = useRef<HTMLSpanElement>(null);
  const brutoRef = useRef<HTMLSpanElement>(null);
  const futuroRef = useRef<HTMLSpanElement>(null);
  const margemRef = useRef<HTMLSpanElement>(null);

  const heroBase = isMobile ? 44 : 64;
  const heroMin = 14;
  const kpiBase = isMobile ? 22 : 26;
  const kpiMin = 11;

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    if (heroRef.current) {
      cleanups.push(observeFit(heroRef.current, heroBase, heroMin));
    }
    if (brutoRef.current) {
      cleanups.push(observeFit(brutoRef.current, kpiBase, kpiMin));
    }
    if (futuroRef.current) {
      cleanups.push(observeFit(futuroRef.current, kpiBase, kpiMin));
    }
    if (margemRef.current) {
      cleanups.push(observeFit(margemRef.current, kpiBase, kpiMin));
    }
    return () => cleanups.forEach((fn) => fn());
  }, [heroBase, kpiBase, liqStr, brutoStr, futuroStr, margemStr]);

  const monthKey = `${mes}-${monthLabel}`;

  return (
    <section
      key={monthKey}
      className={styles.section}
      aria-label="Resumo do mês"
      data-tour="summary"
    >
      <div className={styles.hero}>
        <div className={styles.heroHead}>
          <span className={styles.heroEyebrow}>
            Lucro líquido <span className={styles.heroEyebrowDot}>·</span>{" "}
            {monthLabel}
          </span>
        </div>
        <div className={styles.heroValueWrap}>
          <span
            ref={heroRef}
            className={`${styles.heroValue} ${liqPositive ? "" : styles.heroNeg}`}
            title={liqStr}
          >
            {liqStr}
          </span>
        </div>
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

      <div className={styles.grid}>
        <article className={styles.kpi}>
          <span className={styles.kpiLabel}>Bruto</span>
          <div className={styles.kpiValueWrap}>
            <span ref={brutoRef} className={styles.kpiValue} title={brutoStr}>
              {brutoStr}
            </span>
          </div>
          <span className={styles.kpiSub}>Descontos {fmtBRL(descontos)}</span>
        </article>

        <article className={styles.kpi}>
          <span className={styles.kpiLabel}>A receber</span>
          <div className={styles.kpiValueWrap}>
            <span ref={futuroRef} className={styles.kpiValue} title={futuroStr}>
              {futuroStr}
            </span>
          </div>
          <span className={styles.kpiSub}>parcelas futuras</span>
        </article>

        <article className={styles.kpi}>
          <span className={styles.kpiLabel}>Margem</span>
          <div className={styles.kpiValueWrap}>
            <span
              ref={margemRef}
              className={`${styles.kpiValue} ${styles.kpiValueAccent}`}
            >
              {margemStr}
            </span>
          </div>
          <span className={styles.kpiSub}>
            Taxas + custos {fmtBRL(taxas + custos)}
          </span>
        </article>
      </div>
    </section>
  );
}
