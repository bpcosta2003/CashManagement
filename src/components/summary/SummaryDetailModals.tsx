import { useMemo } from "react";
import type { CalculatedRow, Summary } from "../../types";
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
