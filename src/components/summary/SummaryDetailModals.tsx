import { useMemo } from "react";
import type { CalculatedRow, Summary } from "../../types";
import type { MonthBucket } from "../../hooks/useAnnual";
import { fmtBRL, fmtPct } from "../../lib/calc";
import { Sheet } from "../forms/Sheet";
import styles from "./SummaryDetailModals.module.css";

/* ─── Modal de detalhe do Bruto (híbrido) ─────────────────────────
   Totais por categoria no topo + lista por lançamento embaixo, pra
   responder "de onde saíram os descontos, taxas e custos?". */

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
  const { totals, lancs } = useMemo(() => {
    const rows = monthRows.filter((r) => r.v > 0);
    const t = {
      taxaCartao: 0,
      taxaNegocio: 0,
      auxiliar: 0,
    };
    for (const r of rows) {
      t.taxaCartao += r.taxaVal;
      t.taxaNegocio += r.taxaFixaVal;
      t.auxiliar += r.auxiliarVal;
    }
    // Lança em ordem decrescente de bruto — destaca quem mais pesou.
    const sorted = [...rows].sort((a, b) => b.v - a.v);
    return { totals: t, lancs: sorted };
  }, [monthRows]);

  const totalTaxas = summary.taxas;

  return (
    <Sheet open={open} title={`Detalhe · ${monthLabel}`} onClose={onClose}>
      {/* Totais por categoria */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Totais por categoria</span>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Bruto</span>
          <span className={styles.rowValue}>{fmtBRL(summary.bruto)}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Descontos</span>
          <span className={`${styles.rowValue} ${styles.rowValueNeg}`}>
            − {fmtBRL(summary.descontos)}
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Custos</span>
          <span className={`${styles.rowValue} ${styles.rowValueNeg}`}>
            − {fmtBRL(summary.custos)}
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>
            Taxas
            <span className={styles.rowSub}>cartão + negócio + auxiliar</span>
          </span>
          <span className={`${styles.rowValue} ${styles.rowValueNeg}`}>
            − {fmtBRL(totalTaxas)}
          </span>
        </div>
        {/* Quebra das taxas (só mostra as que têm valor) */}
        {totals.taxaCartao > 0 && (
          <div className={styles.row}>
            <span className={styles.rowLabel}>
              <span className={styles.rowSub} style={{ marginLeft: 0 }}>
                ↳ Taxa de cartão
              </span>
            </span>
            <span className={styles.rowValue}>{fmtBRL(totals.taxaCartao)}</span>
          </div>
        )}
        {totals.taxaNegocio > 0 && (
          <div className={styles.row}>
            <span className={styles.rowLabel}>
              <span className={styles.rowSub} style={{ marginLeft: 0 }}>
                ↳ Taxa do negócio
              </span>
            </span>
            <span className={styles.rowValue}>
              {fmtBRL(totals.taxaNegocio)}
            </span>
          </div>
        )}
        {totals.auxiliar > 0 && (
          <div className={styles.row}>
            <span className={styles.rowLabel}>
              <span className={styles.rowSub} style={{ marginLeft: 0 }}>
                ↳ Auxiliar
              </span>
            </span>
            <span className={styles.rowValue}>{fmtBRL(totals.auxiliar)}</span>
          </div>
        )}
        <div className={`${styles.row} ${styles.rowStrong}`}>
          <span className={styles.rowLabel}>Líquido</span>
          <span className={`${styles.rowValue} ${styles.accent}`}>
            {fmtBRL(summary.liq)}
          </span>
        </div>
      </div>

      {/* Lista por lançamento */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Por lançamento</span>
        {lancs.length === 0 ? (
          <p className={styles.emptyNote}>Nenhum lançamento no mês.</p>
        ) : (
          <div className={styles.lancList}>
            {lancs.map((r) => {
              const taxasRow = r.taxaVal + r.taxaFixaVal + r.auxiliarVal;
              return (
                <div key={r.id} className={styles.lancItem}>
                  <div className={styles.lancHead}>
                    <span className={styles.lancName}>
                      {r.servico || "—"}
                      {r.cliente ? (
                        <span className={styles.lancCliente}>{r.cliente}</span>
                      ) : null}
                    </span>
                    <span className={styles.lancBruto}>{fmtBRL(r.v)}</span>
                  </div>
                  <div className={styles.lancChips}>
                    {r.descontoVal > 0 && (
                      <span className={styles.chip}>
                        Desc. {fmtBRL(r.descontoVal)}
                      </span>
                    )}
                    {taxasRow > 0 && (
                      <span className={styles.chip}>
                        Taxas {fmtBRL(taxasRow)}
                      </span>
                    )}
                    {r.custoVal > 0 && (
                      <span className={styles.chip}>
                        Custo {fmtBRL(r.custoVal)}
                      </span>
                    )}
                    <span className={styles.chip}>
                      Líq. {fmtBRL(r.liq)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Sheet>
  );
}

/* ─── Modal de Info da Margem (cadeia + glossário) ─────────────────── */

interface MargemProps {
  open: boolean;
  onClose: () => void;
  summary: Summary;
  monthLabel: string;
}

export function MargemInfoModal({
  open,
  onClose,
  summary,
  monthLabel,
}: MargemProps) {
  return (
    <Sheet open={open} title={`Como a margem é calculada`} onClose={onClose}>
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Cadeia do cálculo · {monthLabel}</span>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Bruto</span>
          <span className={styles.rowValue}>{fmtBRL(summary.bruto)}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>− Descontos</span>
          <span className={`${styles.rowValue} ${styles.rowValueNeg}`}>
            − {fmtBRL(summary.descontos)}
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>− Custos</span>
          <span className={`${styles.rowValue} ${styles.rowValueNeg}`}>
            − {fmtBRL(summary.custos)}
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>
            − Taxas
            <span className={styles.rowSub}>cartão + negócio + auxiliar</span>
          </span>
          <span className={`${styles.rowValue} ${styles.rowValueNeg}`}>
            − {fmtBRL(summary.taxas)}
          </span>
        </div>
        <div className={`${styles.row} ${styles.rowStrong}`}>
          <span className={styles.rowLabel}>= Líquido</span>
          <span className={`${styles.rowValue} ${styles.accent}`}>
            {fmtBRL(summary.liq)}
          </span>
        </div>
      </div>

      <div className={styles.formula}>
        Margem = Líquido ÷ Bruto
        <br />
        {fmtBRL(summary.liq)} ÷ {fmtBRL(summary.bruto)} ={" "}
        <strong>{fmtPct(summary.margem)}</strong>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionTitle}>O que cada termo significa</span>
        <div className={styles.glossary}>
          <p className={styles.glossaryItem}>
            <strong>Bruto</strong> — tudo que entrou em vendas no mês, antes
            de qualquer dedução.
          </p>
          <p className={styles.glossaryItem}>
            <strong>Descontos</strong> — abatimentos dados aos clientes no
            preço cheio.
          </p>
          <p className={styles.glossaryItem}>
            <strong>Custos</strong> — material e insumo consumido pra entregar
            o serviço/produto.
          </p>
          <p className={styles.glossaryItem}>
            <strong>Taxas</strong> — soma do que foi retido por terceiros:
            taxa da maquininha (cartão), taxa do negócio (repasse fixo) e
            auxiliar (fração paga a quem ajudou no serviço).
          </p>
          <p className={styles.glossaryItem}>
            <strong>Líquido</strong> — o que realmente sobrou pra você depois
            de tudo.
          </p>
          <p className={styles.glossaryItem}>
            <strong>Margem</strong> — quanto de cada R$ 1,00 vendido virou
            lucro. Margem de {fmtPct(summary.margem)} quer dizer que sobram{" "}
            {fmtPct(summary.margem)} de cada venda.
          </p>
        </div>
      </div>
    </Sheet>
  );
}

/* ─── Modal de detalhe do Bruto ANUAL (híbrido) ───────────────────
   Totais por categoria do ano + lista por MÊS (granularidade certa
   pro anual — listar lançamento a lançamento seria longo demais). */

interface AnnualBrutoProps {
  open: boolean;
  onClose: () => void;
  total: {
    bruto: number;
    descontos: number;
    taxas: number;
    custos: number;
    liq: number;
  };
  monthly: MonthBucket[];
  year: number;
  onSelectMonth?: (mes: number) => void;
}

export function AnnualBrutoDetailModal({
  open,
  onClose,
  total,
  monthly,
  year,
  onSelectMonth,
}: AnnualBrutoProps) {
  const taxaSplit = useMemo(() => {
    const t = { taxaCartao: 0, taxaNegocio: 0, auxiliar: 0 };
    for (const b of monthly) {
      for (const r of b.rows) {
        t.taxaCartao += r.taxaVal;
        t.taxaNegocio += r.taxaFixaVal;
        t.auxiliar += r.auxiliarVal;
      }
    }
    return t;
  }, [monthly]);

  const monthsWithData = monthly.filter((b) => b.count > 0);

  return (
    <Sheet open={open} title={`Detalhe · ${year}`} onClose={onClose}>
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Totais por categoria</span>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Bruto</span>
          <span className={styles.rowValue}>{fmtBRL(total.bruto)}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Descontos</span>
          <span className={`${styles.rowValue} ${styles.rowValueNeg}`}>
            − {fmtBRL(total.descontos)}
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Custos</span>
          <span className={`${styles.rowValue} ${styles.rowValueNeg}`}>
            − {fmtBRL(total.custos)}
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>
            Taxas
            <span className={styles.rowSub}>cartão + negócio + auxiliar</span>
          </span>
          <span className={`${styles.rowValue} ${styles.rowValueNeg}`}>
            − {fmtBRL(total.taxas)}
          </span>
        </div>
        {taxaSplit.taxaCartao > 0 && (
          <div className={styles.row}>
            <span className={styles.rowLabel}>
              <span className={styles.rowSub} style={{ marginLeft: 0 }}>
                ↳ Taxa de cartão
              </span>
            </span>
            <span className={styles.rowValue}>
              {fmtBRL(taxaSplit.taxaCartao)}
            </span>
          </div>
        )}
        {taxaSplit.taxaNegocio > 0 && (
          <div className={styles.row}>
            <span className={styles.rowLabel}>
              <span className={styles.rowSub} style={{ marginLeft: 0 }}>
                ↳ Taxa do negócio
              </span>
            </span>
            <span className={styles.rowValue}>
              {fmtBRL(taxaSplit.taxaNegocio)}
            </span>
          </div>
        )}
        {taxaSplit.auxiliar > 0 && (
          <div className={styles.row}>
            <span className={styles.rowLabel}>
              <span className={styles.rowSub} style={{ marginLeft: 0 }}>
                ↳ Auxiliar
              </span>
            </span>
            <span className={styles.rowValue}>{fmtBRL(taxaSplit.auxiliar)}</span>
          </div>
        )}
        <div className={`${styles.row} ${styles.rowStrong}`}>
          <span className={styles.rowLabel}>Líquido</span>
          <span className={`${styles.rowValue} ${styles.accent}`}>
            {fmtBRL(total.liq)}
          </span>
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionTitle}>Por mês</span>
        {monthsWithData.length === 0 ? (
          <p className={styles.emptyNote}>Nenhum lançamento no ano.</p>
        ) : (
          <div className={styles.lancList}>
            {monthsWithData.map((b) => {
              const taxasMes = b.rows.reduce(
                (s, r) => s + r.taxaVal + r.taxaFixaVal + r.auxiliarVal,
                0,
              );
              const descMes = b.rows.reduce((s, r) => s + r.descontoVal, 0);
              const content = (
                <>
                  <div className={styles.lancHead}>
                    <span className={styles.lancName}>
                      {b.label}
                      <span className={styles.lancCliente}>
                        {b.count} lançamento{b.count === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className={styles.lancBruto}>{fmtBRL(b.bruto)}</span>
                  </div>
                  <div className={styles.lancChips}>
                    {descMes > 0 && (
                      <span className={styles.chip}>
                        Desc. {fmtBRL(descMes)}
                      </span>
                    )}
                    {taxasMes > 0 && (
                      <span className={styles.chip}>
                        Taxas {fmtBRL(taxasMes)}
                      </span>
                    )}
                    {b.custos > 0 && (
                      <span className={styles.chip}>
                        Custo {fmtBRL(b.custos)}
                      </span>
                    )}
                    <span className={styles.chip}>Líq. {fmtBRL(b.liq)}</span>
                  </div>
                </>
              );
              return onSelectMonth ? (
                <button
                  key={b.m}
                  type="button"
                  className={`${styles.lancItem} ${styles.lancItemBtn}`}
                  onClick={() => onSelectMonth(b.m)}
                >
                  {content}
                </button>
              ) : (
                <div key={b.m} className={styles.lancItem}>
                  {content}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Sheet>
  );
}

/* ─── Modal de lançamentos de uma entidade (cliente ou serviço) ────
   Aberto ao tocar num item dos tops — lista os lançamentos do ano
   ligados àquele cliente/serviço. */

interface EntriesListProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  rows: CalculatedRow[];
}

export function EntriesListModal({
  open,
  onClose,
  title,
  subtitle,
  rows,
}: EntriesListProps) {
  const { sorted, totalBruto, totalLiq } = useMemo(() => {
    const s = [...rows].sort((a, b) =>
      a.criadoEm < b.criadoEm ? 1 : -1,
    );
    return {
      sorted: s,
      totalBruto: rows.reduce((acc, r) => acc + r.v, 0),
      totalLiq: rows.reduce((acc, r) => acc + r.liq, 0),
    };
  }, [rows]);

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1,
    ).padStart(2, "0")}`;
  };

  return (
    <Sheet open={open} title={title} onClose={onClose}>
      <div className={styles.section}>
        {subtitle && <span className={styles.sectionTitle}>{subtitle}</span>}
        <div className={styles.row}>
          <span className={styles.rowLabel}>
            {sorted.length} lançamento{sorted.length === 1 ? "" : "s"}
          </span>
          <span className={styles.rowValue}>{fmtBRL(totalBruto)}</span>
        </div>
        <div className={`${styles.row} ${styles.rowStrong}`}>
          <span className={styles.rowLabel}>Líquido</span>
          <span className={`${styles.rowValue} ${styles.accent}`}>
            {fmtBRL(totalLiq)}
          </span>
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionTitle}>Lançamentos</span>
        {sorted.length === 0 ? (
          <p className={styles.emptyNote}>Nada encontrado.</p>
        ) : (
          <div className={styles.lancList}>
            {sorted.map((r) => (
              <div key={r.id} className={styles.lancItem}>
                <div className={styles.lancHead}>
                  <span className={styles.lancName}>
                    {r.servico || "—"}
                    <span className={styles.lancCliente}>
                      {fmtDate(r.criadoEm)}
                      {r.cliente ? ` · ${r.cliente}` : ""}
                    </span>
                  </span>
                  <span className={styles.lancBruto}>{fmtBRL(r.v)}</span>
                </div>
                <div className={styles.lancChips}>
                  <span className={styles.chip}>{r.forma}</span>
                  <span className={styles.chip}>Líq. {fmtBRL(r.liq)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
