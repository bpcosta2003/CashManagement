import { useState } from "react";
import type { ProjecaoMes } from "../../types";
import { fmtBRL } from "../../lib/calc";
import { BrandMark } from "../layout/Brand";
import { ProjectionMonthModal } from "./ProjectionMonthModal";
import styles from "./ProjectionSection.module.css";

interface Props {
  projecao: ProjecaoMes[];
}

const PREVIEW_LIMIT = 5;

export function ProjectionSection({ projecao }: Props) {
  const [expanded, setExpanded] = useState<ProjecaoMes | null>(null);
  return (
    <section className={styles.section} data-tour="projection">
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
          {projecao.map((p) => {
            const overflow = p.items.length - PREVIEW_LIMIT;
            return (
              <article className={styles.card} key={p.lbl}>
                <header className={styles.cardHeader}>
                  <span className={styles.month}>{p.lbl}</span>
                  <div className={styles.cardHeaderRight}>
                    <div className={styles.totals}>{fmtBRL(p.liq)}</div>
                    <div className={styles.bruto}>bruto {fmtBRL(p.bruto)}</div>
                  </div>
                </header>
                <div className={styles.itemList}>
                  {p.items.slice(0, PREVIEW_LIMIT).map((it, i) => (
                    <div className={styles.item} key={i}>
                      <div className={styles.itemMain}>
                        <span className={styles.cliente}>{it.cliente}</span>
                        <span className={styles.servicoLine}>
                          <span
                            className={styles.servicoName}
                            title={it.servico}
                          >
                            {it.servico}
                          </span>
                          <span className={styles.parcLabel}>
                            · {it.label}
                          </span>
                        </span>
                      </div>
                      <div className={styles.itemRight}>
                        <div className={styles.itemValue}>{fmtBRL(it.liq)}</div>
                        <div className={styles.itemLabel}>
                          bruto {fmtBRL(it.bruto)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Slots vazios pra manter altura constante */}
                  {Array.from({
                    length: Math.max(
                      0,
                      PREVIEW_LIMIT - Math.min(PREVIEW_LIMIT, p.items.length),
                    ),
                  }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className={`${styles.item} ${styles.itemEmpty}`}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <div className={styles.expandRow}>
                  {overflow > 0 ? (
                    <button
                      type="button"
                      className={styles.expandBtn}
                      onClick={() => setExpanded(p)}
                    >
                      + {overflow} outro{overflow === 1 ? "" : "s"} lançamento
                      {overflow === 1 ? "" : "s"}
                      <span className={styles.expandArrow} aria-hidden="true">
                        →
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.expandBtnGhost}
                      onClick={() => setExpanded(p)}
                    >
                      Ver detalhes
                      <span className={styles.expandArrow} aria-hidden="true">
                        →
                      </span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <ProjectionMonthModal
        mes={expanded}
        onClose={() => setExpanded(null)}
      />
    </section>
  );
}
