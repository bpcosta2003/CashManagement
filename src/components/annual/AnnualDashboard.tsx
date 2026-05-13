import { FORMAS_PAGAMENTO } from "../../constants";
import { fmtBRL, fmtPct } from "../../lib/calc";
import type { AnnualSummary } from "../../hooks/useAnnual";
import type { MonthActivity } from "../../hooks/useActivity";
import { ActivityTimeline } from "./ActivityTimeline";
import { BrandMark } from "../layout/Brand";
import { FitText } from "../feedback/FitText";
import styles from "./AnnualDashboard.module.css";

interface Props {
  summary: AnnualSummary;
  activity: MonthActivity[];
  /** Click em um mês — chama com o número do mês (0-11) e ano. */
  onSelectMonth: (mes: number, ano: number) => void;
}

const SEGMENT_VAR: Record<string, string> = {
  Dinheiro: "var(--pay-dinheiro)",
  Pix: "var(--pay-pix)",
  Débito: "var(--pay-debito)",
  Crédito: "var(--pay-credito)",
};

export function AnnualDashboard({ summary, activity, onSelectMonth }: Props) {
  const {
    year,
    total,
    monthly,
    paymentBreakdown,
    best,
    worst,
    liqDelta,
    topServicos,
  } = summary;

  const hasAnyData = total.count > 0;
  const liqStr = fmtBRL(total.liq);

  // Max líquido pra normalizar as barras do grid
  const maxLiq = Math.max(...monthly.map((m) => Math.abs(m.liq)), 1);

  const deltaUp = liqDelta !== null && liqDelta >= 0;
  const deltaText =
    liqDelta !== null
      ? `${deltaUp ? "↑" : "↓"} ${Math.abs(liqDelta).toFixed(1).replace(".", ",")}% vs. ${year - 1}`
      : hasAnyData
        ? "Primeiro ano com dados"
        : "Nenhum lançamento ainda";

  const totalCompo = FORMAS_PAGAMENTO.reduce(
    (s, f) => s + (paymentBreakdown[f]?.bruto || 0),
    0,
  );

  if (!hasAnyData) {
    return (
      <section
        key={year}
        className={styles.section}
        aria-label={`Resumo de ${year}`}
      >
        <div className={styles.empty}>
          <div className={styles.emptyArt} aria-hidden="true">
            <BrandMark size={64} />
          </div>
          <span className={styles.emptyTitle}>Nenhum dado em {year}</span>
          <p className={styles.emptyText}>
            Lance suas movimentações ao longo do ano que aparece aqui o resumo
            completo dos 12 meses, com comparativo e melhores resultados.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      key={year}
      className={styles.section}
      aria-label={`Resumo de ${year}`}
    >
      {/* HERO: total líquido do ano */}
      <div className={styles.hero}>
        <div className={styles.heroHead}>
          <span className={styles.heroEyebrow}>
            Lucro líquido <span className={styles.heroEyebrowDot}>·</span> {year}
          </span>
        </div>
        <div className={styles.heroValueWrap}>
          <FitText
            className={`${styles.heroValue} ${total.liq < 0 ? styles.heroNeg : ""}`}
            baseFontSize={48}
            minFontSize={14}
            watchKey={liqStr}
            title={liqStr}
          >
            {liqStr}
          </FitText>
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
          <span className={styles.heroMeta}>
            {total.count} lançamentos · margem {fmtPct(total.margem)}
          </span>
        </div>
      </div>

      {/* KPIs anuais */}
      <div className={styles.kpiGrid}>
        <article className={styles.kpi}>
          <span className={styles.kpiLabel}>Bruto</span>
          <div className={styles.kpiValueWrap}>
            <FitText
              className={styles.kpiValue}
              baseFontSize={22}
              minFontSize={11}
              watchKey={total.bruto}
            >
              {fmtBRL(total.bruto)}
            </FitText>
          </div>
          <span className={styles.kpiSub}>
            Descontos {fmtBRL(total.descontos)}
          </span>
        </article>
        <article className={styles.kpi}>
          <span className={styles.kpiLabel}>Custos + Taxas</span>
          <div className={styles.kpiValueWrap}>
            <FitText
              className={styles.kpiValue}
              baseFontSize={22}
              minFontSize={11}
              watchKey={total.taxas + total.custos}
            >
              {fmtBRL(total.taxas + total.custos)}
            </FitText>
          </div>
          <span className={styles.kpiSub}>
            {fmtBRL(total.taxas)} taxas · {fmtBRL(total.custos)} custos
          </span>
        </article>
        <article className={styles.kpi}>
          <span className={styles.kpiLabel}>Margem média</span>
          <div className={styles.kpiValueWrap}>
            <FitText
              className={`${styles.kpiValue} ${styles.kpiValueAccent}`}
              baseFontSize={22}
              minFontSize={11}
              watchKey={total.margem}
            >
              {fmtPct(total.margem)}
            </FitText>
          </div>
          <span className={styles.kpiSub}>do bruto vira líquido</span>
        </article>
      </div>

      {/* Best / worst meses */}
      {best && (
        <div className={styles.highlights}>
          <div className={styles.highlight}>
            <span className={styles.highlightEyebrow}>Melhor mês</span>
            <button
              type="button"
              className={styles.highlightCard}
              onClick={() => onSelectMonth(best.m, year)}
            >
              <span className={styles.highlightMonth}>{best.label}</span>
              <div className={styles.highlightValueWrap}>
                <FitText
                  className={`${styles.highlightValue} ${styles.up}`}
                  baseFontSize={28}
                  minFontSize={13}
                  watchKey={best.liq}
                >
                  {fmtBRL(best.liq)}
                </FitText>
              </div>
              <span className={styles.highlightHint}>
                {best.count} lançamentos · ver detalhes →
              </span>
            </button>
          </div>
          {worst && (
            <div className={styles.highlight}>
              <span className={styles.highlightEyebrow}>Menor mês</span>
              <button
                type="button"
                className={styles.highlightCard}
                onClick={() => onSelectMonth(worst.m, year)}
              >
                <span className={styles.highlightMonth}>{worst.label}</span>
                <div className={styles.highlightValueWrap}>
                  <FitText
                    className={`${styles.highlightValue} ${worst.liq >= 0 ? styles.up : styles.down}`}
                    baseFontSize={28}
                    minFontSize={13}
                    watchKey={worst.liq}
                  >
                    {fmtBRL(worst.liq)}
                  </FitText>
                </div>
                <span className={styles.highlightHint}>
                  {worst.count} lançamentos · ver detalhes →
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grid 12 meses */}
      <div className={styles.shellWrap}>
        <div className={styles.shell}>
          <header className={styles.shellHead}>
            <span className={styles.shellTitle}>12 meses · {year}</span>
            <span className={styles.shellHint}>toque pra abrir o mês</span>
          </header>
          <div className={styles.monthGrid}>
            {monthly.map((b) => {
              const pct = maxLiq > 0 ? Math.abs(b.liq) / maxLiq : 0;
              const hasData = b.count > 0;
              return (
                <button
                  type="button"
                  key={b.m}
                  className={styles.monthCard}
                  onClick={() => onSelectMonth(b.m, year)}
                  data-empty={!hasData}
                  aria-label={`Ver ${b.label} de ${year}`}
                >
                  <span className={styles.monthLabel}>{b.label}</span>
                  <div className={styles.monthValueWrap}>
                    <FitText
                      className={`${styles.monthValue} ${
                        !hasData
                          ? styles.monthEmpty
                          : b.liq < 0
                            ? styles.down
                            : ""
                      }`}
                      baseFontSize={18}
                      minFontSize={10}
                      watchKey={b.liq}
                    >
                      {hasData ? fmtBRL(b.liq) : "—"}
                    </FitText>
                  </div>
                  <span
                    className={styles.monthBar}
                    style={{
                      width: hasData ? `${Math.max(8, pct * 100)}%` : 0,
                      background: b.liq < 0 ? "var(--negative)" : "var(--accent)",
                    }}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Atividade do ano (timeline) */}
      <ActivityTimeline activity={activity} onSelectMonth={onSelectMonth} />

      {/* Top serviços */}
      {topServicos.length > 0 && (
        <div className={styles.servicosWrap}>
          <div className={styles.servicosShell}>
            <header className={styles.servicosHead}>
              <span className={styles.servicosEyebrow}>
                Top serviços do ano
              </span>
              <span className={styles.servicosHint}>
                {topServicos.length} de {topServicos.length}
              </span>
            </header>
            <ol className={styles.servicosList}>
              {topServicos.map((s, idx) => {
                const pct = total.bruto > 0 ? (s.bruto / total.bruto) * 100 : 0;
                return (
                  <li key={s.name} className={styles.servicoItem}>
                    <span className={styles.servicoRank}>{idx + 1}</span>
                    <div className={styles.servicoMain}>
                      <span className={styles.servicoName}>{s.name}</span>
                      <span className={styles.servicoMeta}>
                        {s.count} atendimento{s.count === 1 ? "" : "s"}
                        {pct > 0 ? ` · ${fmtPct(pct, 0)} do bruto` : ""}
                      </span>
                    </div>
                    <span className={styles.servicoValue}>
                      {fmtBRL(s.bruto)}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}

      {/* Composição anual */}
      {totalCompo > 0 && (
        <div className={styles.compoWrap}>
          <div className={styles.compoShell}>
            <header className={styles.compoHead}>
              <span className={styles.compoEyebrow}>Composição do ano</span>
              <span className={styles.compoTotal}>{fmtBRL(totalCompo)}</span>
            </header>
            <div className={styles.compoBar}>
              {FORMAS_PAGAMENTO.map((forma) => {
                const value = paymentBreakdown[forma]?.bruto || 0;
                const pct = (value / totalCompo) * 100;
                if (pct === 0) return null;
                return (
                  <span
                    key={forma}
                    className={styles.compoSegment}
                    style={{
                      width: `${pct}%`,
                      background: SEGMENT_VAR[forma],
                    }}
                    title={`${forma}: ${fmtPct(pct)}`}
                  />
                );
              })}
            </div>
            <div className={styles.compoLegend}>
              {FORMAS_PAGAMENTO.map((forma) => {
                const data = paymentBreakdown[forma] || {
                  count: 0,
                  bruto: 0,
                  liq: 0,
                };
                const pct = totalCompo > 0 ? (data.bruto / totalCompo) * 100 : 0;
                return (
                  <div key={forma} className={styles.compoItem}>
                    <span
                      className={styles.compoSwatch}
                      style={{ background: SEGMENT_VAR[forma] }}
                      aria-hidden="true"
                    />
                    <span className={styles.compoName}>{forma}</span>
                    <span className={styles.compoValue}>
                      {fmtPct(pct, 0)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
