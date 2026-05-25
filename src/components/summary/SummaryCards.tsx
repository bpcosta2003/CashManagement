import { useEffect, useRef, useState } from "react";
import type { CalculatedRow, Summary } from "../../types";
import { fmtBRL, fmtPct } from "../../lib/calc";
import { observeFit } from "../../lib/fitText";
import { MESES_SHORT, MESES_FULL } from "../../constants";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { BrutoDetailModal, MargemInfoModal } from "./SummaryDetailModals";
import styles from "./SummaryCards.module.css";

interface Props {
  summary: Summary;
  mes: number;
  liqDelta: number | null;
  prevMonthLabel: string;
  /** Lançamentos do mês — usados no modal de detalhe do Bruto. */
  monthRows: CalculatedRow[];
}

export function SummaryCards({
  summary,
  mes,
  liqDelta,
  prevMonthLabel,
  monthRows,
}: Props) {
  const { bruto, descontos, taxas, custos, liq, margem, futuro } = summary;
  const { isMobile } = useBreakpoint();
  const [brutoOpen, setBrutoOpen] = useState(false);
  const [margemOpen, setMargemOpen] = useState(false);
  const monthFull = MESES_FULL[mes];
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
          <div className={styles.kpiHead}>
            <span className={styles.kpiLabel}>Bruto</span>
            <button
              type="button"
              className={styles.kpiInfoBtn}
              onClick={() => setBrutoOpen(true)}
              aria-label="Ver detalhamento de descontos, taxas e custos"
              title="Ver detalhamento"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>
          <div className={styles.kpiValueWrap}>
            <span ref={brutoRef} className={styles.kpiValue} title={brutoStr}>
              {brutoStr}
            </span>
          </div>
          {/* Desconto / Custos / Taxas sempre empilhados — no mobile a
              linha única com • cortava os valores. */}
          <div className={styles.kpiBreakdown}>
            <span className={styles.kpiSub}>Descontos {fmtBRL(descontos)}</span>
            <span className={styles.kpiSub}>Custos {fmtBRL(custos)}</span>
            <span className={styles.kpiSub}>Taxas {fmtBRL(taxas)}</span>
          </div>
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
          <div className={styles.kpiHead}>
            <span className={styles.kpiLabel}>Margem</span>
            <button
              type="button"
              className={styles.kpiInfoBtn}
              onClick={() => setMargemOpen(true)}
              aria-label="Ver como a margem é calculada"
              title="Como a margem é calculada"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </button>
          </div>
          <div className={styles.kpiValueWrap}>
            <span
              ref={margemRef}
              className={`${styles.kpiValue} ${styles.kpiValueAccent}`}
            >
              {margemStr}
            </span>
          </div>
          <span className={styles.kpiSub}>do bruto vira líquido</span>
        </article>
      </div>

      <BrutoDetailModal
        open={brutoOpen}
        onClose={() => setBrutoOpen(false)}
        summary={summary}
        monthRows={monthRows}
        monthLabel={monthFull}
      />
      <MargemInfoModal
        open={margemOpen}
        onClose={() => setMargemOpen(false)}
        data={summary}
        label={monthFull}
      />
    </section>
  );
}
