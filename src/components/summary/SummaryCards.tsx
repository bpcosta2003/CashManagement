import { useLayoutEffect, useRef } from "react";
import type { Summary } from "../../types";
import { fmtBRL, fmtPct } from "../../lib/calc";
import { fitTextToContainer } from "../../lib/fitText";
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

  const hasCurrentData = bruto > 0;
  const deltaUp = liqDelta !== null && liqDelta >= 0;
  const deltaGlyph = deltaUp ? "↑" : "↓";
  const deltaText =
    liqDelta !== null
      ? `${deltaGlyph} ${Math.abs(liqDelta).toFixed(1).replace(".", ",")}% vs. ${prevMonthLabel}`
      : hasCurrentData
        ? `Primeiro mês com dados`
        : `Nenhum lançamento ainda`;

  // Refs pros valores que precisam de auto-shrink garantido
  const heroRef = useRef<HTMLSpanElement>(null);
  const brutoRef = useRef<HTMLSpanElement>(null);
  const futuroRef = useRef<HTMLSpanElement>(null);
  const margemRef = useRef<HTMLSpanElement>(null);

  // Bases responsivas
  const heroBase = isMobile ? 48 : 72;
  const heroMin = 24;
  const kpiBase = isMobile ? 22 : 26;
  const kpiMin = 14;

  // Re-ajusta toda vez que o texto/breakpoint muda. useLayoutEffect roda
  // antes do paint, então o usuário nunca vê o overflow.
  useLayoutEffect(() => {
    if (heroRef.current) {
      fitTextToContainer(heroRef.current, heroBase, heroMin);
    }
    if (brutoRef.current) {
      fitTextToContainer(brutoRef.current, kpiBase, kpiMin);
    }
    if (futuroRef.current) {
      fitTextToContainer(futuroRef.current, kpiBase, kpiMin);
    }
    if (margemRef.current) {
      fitTextToContainer(margemRef.current, kpiBase, kpiMin);
    }
  }, [liqStr, brutoStr, futuroStr, heroBase, kpiBase, isMobile]);

  // Re-ajusta também em resize (orientação, redimensionar janela)
  useLayoutEffect(() => {
    const onResize = () => {
      if (heroRef.current) {
        fitTextToContainer(heroRef.current, heroBase, heroMin);
      }
      if (brutoRef.current) {
        fitTextToContainer(brutoRef.current, kpiBase, kpiMin);
      }
      if (futuroRef.current) {
        fitTextToContainer(futuroRef.current, kpiBase, kpiMin);
      }
      if (margemRef.current) {
        fitTextToContainer(margemRef.current, kpiBase, kpiMin);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [heroBase, kpiBase]);

  // key força remount + animação a cada mudança de mês/ano
  const monthKey = `${mes}-${monthLabel}`;

  return (
    <section
      key={monthKey}
      className={styles.section}
      aria-label="Resumo do mês"
    >
      <div className={styles.hero}>
        <div className={styles.heroHead}>
          <span className={styles.heroEyebrow}>
            Lucro líquido <span className={styles.heroEyebrowDot}>·</span>{" "}
            {monthLabel}
          </span>
        </div>
        <span
          ref={heroRef}
          className={`${styles.heroValue} ${liqPositive ? "" : styles.heroNeg}`}
          title={liqStr}
        >
          {liqStr}
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

      <div className={styles.grid}>
        <article className={styles.kpi}>
          <span className={styles.kpiLabel}>Bruto</span>
          <span
            ref={brutoRef}
            className={styles.kpiValue}
            title={brutoStr}
          >
            {brutoStr}
          </span>
          <span className={styles.kpiSub}>Descontos {fmtBRL(descontos)}</span>
        </article>

        <article className={styles.kpi}>
          <span className={styles.kpiLabel}>A receber</span>
          <span
            ref={futuroRef}
            className={styles.kpiValue}
            title={futuroStr}
          >
            {futuroStr}
          </span>
          <span className={styles.kpiSub}>parcelas futuras</span>
        </article>

        <article className={styles.kpi}>
          <span className={styles.kpiLabel}>Margem</span>
          <span
            ref={margemRef}
            className={`${styles.kpiValue} ${styles.kpiValueAccent}`}
          >
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
