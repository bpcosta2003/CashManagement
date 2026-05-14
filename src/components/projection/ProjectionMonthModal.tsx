import { useEffect } from "react";
import type { ProjecaoMes } from "../../types";
import { fmtBRL } from "../../lib/calc";
import styles from "./ProjectionMonthModal.module.css";

interface Props {
  /** Mês selecionado; null = modal fechado. */
  mes: ProjecaoMes | null;
  onClose: () => void;
}

/**
 * Modal com a lista completa de parcelas projetadas pra um mês.
 * Aberto a partir do botão "+ N outros lançamentos" no card da
 * ProjectionSection. Mostra todos os items com cliente, serviço,
 * label da parcela, bruto e líquido.
 */
export function ProjectionMonthModal({ mes, onClose }: Props) {
  // Fecha ao apertar Esc
  useEffect(() => {
    if (!mes) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mes, onClose]);

  if (!mes) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="proj-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.headerText}>
            <span className={styles.eyebrow}>A receber</span>
            <h2 id="proj-modal-title" className={styles.title}>
              {mes.lbl}
            </h2>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        <div className={styles.totalsBar}>
          <div className={styles.totalCol}>
            <span className={styles.totalLabel}>Líquido</span>
            <span className={styles.totalValuePos}>{fmtBRL(mes.liq)}</span>
          </div>
          <div className={styles.totalCol}>
            <span className={styles.totalLabel}>Bruto</span>
            <span className={styles.totalValue}>{fmtBRL(mes.bruto)}</span>
          </div>
          <div className={styles.totalCol}>
            <span className={styles.totalLabel}>Taxa</span>
            <span className={styles.totalValueDim}>
              − {fmtBRL(mes.taxa)}
            </span>
          </div>
          <div className={styles.totalCol}>
            <span className={styles.totalLabel}>Parcelas</span>
            <span className={styles.totalValue}>{mes.items.length}</span>
          </div>
        </div>

        <div className={styles.body}>
          <ul className={styles.list}>
            {mes.items.map((it, i) => (
              <li key={i} className={styles.item}>
                <div className={styles.itemMain}>
                  <span className={styles.cliente}>{it.cliente}</span>
                  <span className={styles.servicoLine}>
                    <span className={styles.servicoName} title={it.servico}>
                      {it.servico}
                    </span>
                    <span className={styles.parcLabel}>· {it.label}</span>
                  </span>
                </div>
                <div className={styles.itemRight}>
                  <div className={styles.itemLiq}>{fmtBRL(it.liq)}</div>
                  <div className={styles.itemBruto}>
                    bruto {fmtBRL(it.bruto)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.footerBtn} onClick={onClose}>
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
}
