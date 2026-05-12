import type { ProjecaoMes } from "../../types";
import { fmtBRL } from "../../lib/calc";
import { BrandMark } from "../layout/Brand";
import styles from "./ProjectionSection.module.css";

interface Props {
  projecao: ProjecaoMes[];
}

export function ProjectionSection({ projecao }: Props) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>
        A receber
        <span className={styles.titleHint}>
          parcelas de crédito que ainda vão cair
        </span>
      </h2>
      {projecao.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyArt} aria-hidden="true">
            <BrandMark size={56} />
          </div>
          <span className={styles.emptyTitle}>Nada pra receber ainda</span>
          <p className={styles.emptyText}>
            Quando você lançar pagamentos no crédito parcelado, as parcelas
            futuras aparecem aqui distribuídas mês a mês.
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {projecao.map((p) => (
            <article className={styles.card} key={p.lbl}>
              <header className={styles.cardHeader}>
                <span className={styles.month}>{p.lbl}</span>
                <div style={{ textAlign: "right" }}>
                  <div className={styles.totals}>{fmtBRL(p.liq)}</div>
                  <div className={styles.bruto}>bruto {fmtBRL(p.bruto)}</div>
                </div>
              </header>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {p.items.slice(0, 6).map((it, i) => (
                  <div className={styles.item} key={i}>
                    <div className={styles.itemMain}>
                      <span className={styles.cliente}>{it.cliente}</span>
                      <span className={styles.servico}>
                        {it.servico} · {it.label}
                      </span>
                    </div>
                    <div>
                      <div className={styles.itemValue}>{fmtBRL(it.liq)}</div>
                      <div className={styles.itemLabel}>
                        bruto {fmtBRL(it.bruto)}
                      </div>
                    </div>
                  </div>
                ))}
                {p.items.length > 6 && (
                  <span className={styles.itemLabel}>
                    + {p.items.length - 6} outros lançamentos
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
