import type { Summary } from "../../types";
import { fmtBRL, fmtPct } from "../../lib/calc";
import { MESES_SHORT } from "../../constants";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import styles from "./SummaryCards.module.css";

interface Props {
  summary: Summary;
  mes: number;
  liqDelta: number | null;
  prevMonthLabel: string;
}

/**
 * Calcula um font-size que cabe melhor em um card, dada a quantidade de
 * caracteres do valor formatado. Não substitui o CSS — refina números
 * muito longos (ex.: R$ 1.234.567,89).
 */
function scaleFontSize(text: string, baseSize: number, minSize: number) {
  const len = text.length;
  // Tolerância de ~10 chars como "R$ 12.345,67". Acima disso, encolhe.
  const threshold = 11;
  if (len <= threshold) return baseSize;
  const ratio = Math.max(0.45, threshold / len);
  return Math.max(minSize, Math.round(baseSize * ratio));
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

  // Auto-scale dinâmico do valor herói para evitar overflow em valores
  // muito grandes (ex.: R$ 1.234.567,89). Base diferente para mobile/desktop.
  const heroBase = isMobile ? 48 : 72;
  const heroMin = isMobile ? 28 : 40;
  const heroFontSize = scaleFontSize(liqStr, heroBase, heroMin);
  const kpiBase = isMobile ? 22 : 24;
  const brutoFontSize = scaleFontSize(brutoStr, kpiBase, 15);
  const futuroFontSize = scaleFontSize(futuroStr, kpiBase, 15);

  // key força remount + animação a cada mudança de mês/ano (slide fade)
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
          className={`${styles.heroValue} ${liqPositive ? "" : styles.heroNeg}`}
          style={{ fontSize: `${heroFontSize}px` }}
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
            className={styles.kpiValue}
            style={{ fontSize: `${brutoFontSize}px` }}
            title={brutoStr}
          >
            {brutoStr}
          </span>
          <span className={styles.kpiSub}>Descontos {fmtBRL(descontos)}</span>
        </article>

        <article className={styles.kpi}>
          <span className={styles.kpiLabel}>A receber</span>
          <span
            className={styles.kpiValue}
            style={{ fontSize: `${futuroFontSize}px` }}
            title={futuroStr}
          >
            {futuroStr}
          </span>
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
