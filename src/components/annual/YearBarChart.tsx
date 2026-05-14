import { useRef, useState } from "react";
import type { MonthBucket } from "../../hooks/useAnnual";
import { fmtBRL } from "../../lib/calc";
import styles from "./YearBarChart.module.css";

interface Props {
  monthly: MonthBucket[];
  year: number;
  onSelectMonth: (m: number, y: number) => void;
}

/**
 * Gráfico de barras vertical com bruto + líquido por mês.
 * Cada barra:
 *  - "ghost" externa: bruto (alpha baixo)
 *  - "fill" interna: líquido (alpha alto, cor varia se negativo)
 * Hover/tap: tooltip flutuante com mês + bruto + líquido.
 * Click: abre o mês no dashboard mensal.
 */
export function YearBarChart({ monthly, year, onSelectMonth }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Escala: maior bruto absoluto define o topo das barras
  const maxBruto = Math.max(
    ...monthly.map((m) => Math.abs(m.bruto)),
    1,
  );

  const hasData = monthly.some((m) => m.count > 0);
  if (!hasData) return null;

  const active = hoverIdx !== null ? monthly[hoverIdx] : null;

  return (
    <div className={styles.shell} ref={wrapRef}>
      <header className={styles.head}>
        <span className={styles.title}>Receita mês a mês</span>
        <span className={styles.legend}>
          <span className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              data-kind="bruto"
              aria-hidden="true"
            />
            bruto
          </span>
          <span className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              data-kind="liq"
              aria-hidden="true"
            />
            líquido
          </span>
        </span>
      </header>

      <div className={styles.chart}>
        {monthly.map((b, idx) => {
          const brutoPct = maxBruto > 0
            ? (Math.abs(b.bruto) / maxBruto) * 100
            : 0;
          const liqPct =
            maxBruto > 0 ? (Math.max(0, b.liq) / maxBruto) * 100 : 0;
          const empty = b.count === 0;
          const isActive = hoverIdx === idx;

          return (
            <button
              type="button"
              key={b.m}
              className={styles.col}
              data-active={isActive}
              data-empty={empty}
              onPointerEnter={() => setHoverIdx(idx)}
              onPointerLeave={() => setHoverIdx(null)}
              onFocus={() => setHoverIdx(idx)}
              onBlur={() => setHoverIdx(null)}
              onClick={() => !empty && onSelectMonth(b.m, year)}
              aria-label={`${b.label}: bruto ${fmtBRL(b.bruto)}, líquido ${fmtBRL(b.liq)}`}
              disabled={empty}
            >
              <div className={styles.barTrack}>
                <div
                  className={styles.barBruto}
                  style={{ height: `${brutoPct}%` }}
                  aria-hidden="true"
                />
                <div
                  className={styles.barLiq}
                  data-neg={b.liq < 0}
                  style={{ height: `${liqPct}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className={styles.colLabel}>{b.label.slice(0, 3)}</span>
            </button>
          );
        })}
      </div>

      {active && active.count > 0 && (
        <div className={styles.tooltip} role="status" aria-live="polite">
          <span className={styles.ttipMonth}>
            {active.label} <span className={styles.ttipYear}>· {year}</span>
          </span>
          <div className={styles.ttipRow}>
            <span className={styles.ttipLabel}>Bruto</span>
            <span className={styles.ttipValue}>{fmtBRL(active.bruto)}</span>
          </div>
          <div className={styles.ttipRow}>
            <span className={styles.ttipLabel}>Líquido</span>
            <span
              className={`${styles.ttipValue} ${active.liq < 0 ? styles.ttipValueNeg : ""}`}
            >
              {fmtBRL(active.liq)}
            </span>
          </div>
          <span className={styles.ttipHint}>toque pra abrir o mês</span>
        </div>
      )}
    </div>
  );
}
