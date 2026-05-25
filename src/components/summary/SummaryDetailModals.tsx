import { useMemo } from "react";
import type { CalculatedRow, Summary } from "../../types";
import type { MonthBucket } from "../../hooks/useAnnual";
import { fmtBRL, fmtPct } from "../../lib/calc";
import { Sheet } from "../forms/Sheet";
import styles from "./SummaryDetailModals.module.css";

/* Dados mínimos pra montar a composição Bruto → Líquido. */
interface BreakdownData {
  bruto: number;
  descontos: number;
  custos: number;
  taxas: number;
  liq: number;
  taxaCartao: number;
  taxaNegocio: number;
  auxiliar: number;
}

/* Forma comum a Summary (mês) e ao total anual — o que a margem precisa. */
export interface MarginData {
  bruto: number;
  descontos: number;
  custos: number;
  taxas: number;
  liq: number;
  margem: number;
}

/* ─── Visual compartilhado: composição por categoria ──────────────── */

function CategoryBreakdown({ d }: { d: BreakdownData }) {
  const pct = (v: number) => (d.bruto > 0 ? (v / d.bruto) * 100 : 0);
  const margem = pct(d.liq);

  // Segmentos da barra (somam ~100% do bruto). Só entra o que tem valor.
  const segments = [
    { key: "liq", label: "Líquido", value: d.liq, cls: styles.segLiq },
    { key: "taxas", label: "Taxas", value: d.taxas, cls: styles.segTaxas },
    { key: "custos", label: "Custos", value: d.custos, cls: styles.segCustos },
    {
      key: "desc",
      label: "Descontos",
      value: d.descontos,
      cls: styles.segDesc,
    },
  ].filter((s) => s.value > 0.005);

  const taxaSub = [
    { label: "Taxa de cartão", value: d.taxaCartao },
    { label: "Taxa do negócio", value: d.taxaNegocio },
    { label: "Auxiliar", value: d.auxiliar },
  ].filter((s) => s.value > 0.005);

  return (
    <>
      {/* Hero: bruto → líquido (empilhado pra não estourar no mobile) */}
      <div className={styles.hero}>
        <div className={styles.heroRow}>
          <span className={styles.heroLabel}>Bruto</span>
          <span className={styles.heroBruto}>{fmtBRL(d.bruto)}</span>
        </div>
        <div className={styles.heroRow}>
          <span className={styles.heroLabel}>Líquido</span>
          <span className={styles.heroLiq}>{fmtBRL(d.liq)}</span>
        </div>
        <div className={styles.heroMargemRow}>
          <span className={styles.heroMargem}>
            margem de {fmtPct(margem)}
          </span>
        </div>
      </div>

      {/* Barra de composição */}
      {d.bruto > 0 && (
        <div
          className={styles.bar}
          role="img"
          aria-label="Composição do bruto"
        >
          {segments.map((s) => (
            <span
              key={s.key}
              className={`${styles.barSeg} ${s.cls}`}
              style={{ width: `${pct(s.value)}%` }}
              title={`${s.label}: ${fmtPct(pct(s.value))}`}
            />
          ))}
        </div>
      )}

      {/* Linhas por categoria, com % do bruto */}
      <div className={styles.cats}>
        <div className={styles.catRow}>
          <span className={`${styles.dot} ${styles.segLiq}`} />
          <span className={styles.catLabel}>Líquido</span>
          <span className={styles.catPct}>{fmtPct(pct(d.liq))}</span>
          <span className={`${styles.catValue} ${styles.accent}`}>
            {fmtBRL(d.liq)}
          </span>
        </div>
        {d.taxas > 0 && (
          <div className={styles.catRow}>
            <span className={`${styles.dot} ${styles.segTaxas}`} />
            <span className={styles.catLabel}>Taxas</span>
            <span className={styles.catPct}>{fmtPct(pct(d.taxas))}</span>
            <span className={`${styles.catValue} ${styles.neg}`}>
              − {fmtBRL(d.taxas)}
            </span>
          </div>
        )}
        {taxaSub.map((s) => (
          <div key={s.label} className={`${styles.catRow} ${styles.catSub}`}>
            <span className={styles.dotSpacer} />
            <span className={styles.catLabel}>↳ {s.label}</span>
            <span className={styles.catPct}>{fmtPct(pct(s.value))}</span>
            <span className={`${styles.catValueSub} ${styles.neg}`}>
              {fmtBRL(s.value)}
            </span>
          </div>
        ))}
        {d.custos > 0 && (
          <div className={styles.catRow}>
            <span className={`${styles.dot} ${styles.segCustos}`} />
            <span className={styles.catLabel}>Custos</span>
            <span className={styles.catPct}>{fmtPct(pct(d.custos))}</span>
            <span className={`${styles.catValue} ${styles.neg}`}>
              − {fmtBRL(d.custos)}
            </span>
          </div>
        )}
        {d.descontos > 0 && (
          <div className={styles.catRow}>
            <span className={`${styles.dot} ${styles.segDesc}`} />
            <span className={styles.catLabel}>Descontos</span>
            <span className={styles.catPct}>{fmtPct(pct(d.descontos))}</span>
            <span className={`${styles.catValue} ${styles.neg}`}>
              − {fmtBRL(d.descontos)}
            </span>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Modal de detalhe do Bruto (mês) ─────────────────────────────── */

interface BrutoProps {
  open: boolean;
  onClose: () => void;
  summary: Summary;
  monthRows: CalculatedRow[];
  monthLabel: string;
}

export function BrutoDetailModal({
  open,
  onClose,
  summary,
  monthRows,
  monthLabel,
}: BrutoProps) {
  const data = useMemo<BreakdownData>(() => {
    let taxaCartao = 0;
    let taxaNegocio = 0;
    let auxiliar = 0;
    for (const r of monthRows) {
      if (r.v <= 0) continue;
      taxaCartao += r.taxaVal;
      taxaNegocio += r.taxaFixaVal;
      auxiliar += r.auxiliarVal;
    }
    return {
      bruto: summary.bruto,
      descontos: summary.descontos,
      custos: summary.custos,
      taxas: summary.taxas,
      liq: summary.liq,
      taxaCartao,
      taxaNegocio,
      auxiliar,
    };
  }, [summary, monthRows]);

  return (
    <Sheet open={open} title={`Composição · ${monthLabel}`} onClose={onClose}>
      <CategoryBreakdown d={data} />
    </Sheet>
  );
}

/* ─── Modal de detalhe do Bruto (ano) ─────────────────────────────── */

interface AnnualBrutoProps {
  open: boolean;
  onClose: () => void;
  total: MarginData;
  monthly: MonthBucket[];
  year: number;
}

export function AnnualBrutoDetailModal({
  open,
  onClose,
  total,
  monthly,
  year,
}: AnnualBrutoProps) {
  const data = useMemo<BreakdownData>(() => {
    let taxaCartao = 0;
    let taxaNegocio = 0;
    let auxiliar = 0;
    for (const b of monthly) {
      for (const r of b.rows) {
        taxaCartao += r.taxaVal;
        taxaNegocio += r.taxaFixaVal;
        auxiliar += r.auxiliarVal;
      }
    }
    return {
      bruto: total.bruto,
      descontos: total.descontos,
      custos: total.custos,
      taxas: total.taxas,
      liq: total.liq,
      taxaCartao,
      taxaNegocio,
      auxiliar,
    };
  }, [total, monthly]);

  return (
    <Sheet open={open} title={`Composição · ${year}`} onClose={onClose}>
      <CategoryBreakdown d={data} />
    </Sheet>
  );
}

/* ─── Modal de Info da Margem (cadeia + glossário) ─────────────────── */

interface MargemProps {
  open: boolean;
  onClose: () => void;
  data: MarginData;
  label: string;
}

export function MargemInfoModal({ open, onClose, data, label }: MargemProps) {
  return (
    <Sheet open={open} title="Como a margem é calculada" onClose={onClose}>
      <span className={styles.eyebrow}>Cadeia do cálculo · {label}</span>

      {/* Cadeia compacta */}
      <div className={styles.chain}>
        <div className={styles.chainRow}>
          <span className={styles.chainLabel}>Bruto</span>
          <span className={styles.chainValue}>{fmtBRL(data.bruto)}</span>
        </div>
        <div className={styles.chainRow}>
          <span className={styles.chainOp}>−</span>
          <span className={styles.chainLabel}>Descontos</span>
          <span className={`${styles.chainValue} ${styles.neg}`}>
            {fmtBRL(data.descontos)}
          </span>
        </div>
        <div className={styles.chainRow}>
          <span className={styles.chainOp}>−</span>
          <span className={styles.chainLabel}>Custos</span>
          <span className={`${styles.chainValue} ${styles.neg}`}>
            {fmtBRL(data.custos)}
          </span>
        </div>
        <div className={styles.chainRow}>
          <span className={styles.chainOp}>−</span>
          <span className={styles.chainLabel}>
            Taxas
            <span className={styles.chainHint}>cartão + negócio + auxiliar</span>
          </span>
          <span className={`${styles.chainValue} ${styles.neg}`}>
            {fmtBRL(data.taxas)}
          </span>
        </div>
        <div className={`${styles.chainRow} ${styles.chainResult}`}>
          <span className={styles.chainOp}>=</span>
          <span className={styles.chainLabel}>Líquido</span>
          <span className={`${styles.chainValue} ${styles.accent}`}>
            {fmtBRL(data.liq)}
          </span>
        </div>
      </div>

      <div className={styles.formula}>
        <span className={styles.formulaResult}>{fmtPct(data.margem)}</span>
        <span className={styles.formulaPlain}>
          De cada <strong>{fmtBRL(data.bruto)}</strong> que entrou,
          sobraram <strong>{fmtBRL(data.liq)}</strong> de lucro.
        </span>
        <span className={styles.formulaCalc}>
          margem = líquido ÷ bruto
        </span>
      </div>
    </Sheet>
  );
}
