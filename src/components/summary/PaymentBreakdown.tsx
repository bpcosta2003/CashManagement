import { FORMAS_PAGAMENTO } from "../../constants";
import { fmtBRL, fmtPct } from "../../lib/calc";
import { Sparkline } from "./Sparkline";
import styles from "./PaymentBreakdown.module.css";

interface SparkPoint {
  liq: number;
  label: string;
}

interface Props {
  breakdown: Record<string, { count: number; bruto: number; liq: number }>;
  sparkline?: SparkPoint[];
}

const SEGMENT_VAR: Record<string, string> = {
  Dinheiro: "var(--pay-dinheiro)",
  Pix: "var(--pay-pix)",
  Débito: "var(--pay-debito)",
  Crédito: "var(--pay-credito)",
};

export function PaymentBreakdown({ breakdown, sparkline }: Props) {
  const total = FORMAS_PAGAMENTO.reduce(
    (s, f) => s + (breakdown[f]?.bruto || 0),
    0,
  );
  const hasData = total > 0;
  const showSparkline = sparkline && sparkline.length >= 2;

  return (
    <section
      className={styles.section}
      aria-label="Composição por forma de pagamento"
    >
      <div className={styles.outer}>
        {showSparkline && (
          <div className={styles.trend}>
            <span className={styles.trendLabel}>
              Tendência <span className={styles.trendDot}>·</span> 6 meses
            </span>
            <Sparkline
              data={sparkline}
              color="var(--accent)"
              width={140}
              height={32}
              ariaLabel="Tendência do líquido nos últimos 6 meses"
            />
          </div>
        )}

        <div className={styles.head}>
          <span className={styles.eyebrow}>Composição</span>
          <span className={styles.totalChip}>
            {hasData ? fmtBRL(total) : "—"}
          </span>
        </div>

        <div
          className={styles.bar}
          role="img"
          aria-label="Distribuição percentual"
        >
          {hasData ? (
            FORMAS_PAGAMENTO.map((forma) => {
              const value = breakdown[forma]?.bruto || 0;
              const pct = total > 0 ? (value / total) * 100 : 0;
              if (pct === 0) return null;
              return (
                <span
                  key={forma}
                  className={styles.segment}
                  style={{
                    width: `${pct}%`,
                    background: SEGMENT_VAR[forma],
                  }}
                  title={`${forma}: ${fmtPct(pct)}`}
                />
              );
            })
          ) : (
            <span className={styles.segmentEmpty} />
          )}
        </div>

        <div className={styles.legend}>
          {FORMAS_PAGAMENTO.map((forma) => {
            const data = breakdown[forma] || { count: 0, bruto: 0, liq: 0 };
            const pct = total > 0 ? (data.bruto / total) * 100 : 0;
            return (
              <div key={forma} className={styles.legendItem}>
                <span
                  className={styles.swatch}
                  style={{ background: SEGMENT_VAR[forma] }}
                  aria-hidden="true"
                />
                <span className={styles.legendName}>{forma}</span>
                <span className={styles.legendValue}>{fmtPct(pct, 0)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
