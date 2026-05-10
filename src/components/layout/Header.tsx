import type { ReactNode } from "react";
import { MESES_FULL } from "../../constants";
import { Brand } from "./Brand";
import styles from "./Header.module.css";

interface Props {
  mes: number;
  ano: number;
  onChangeMes: (mes: number, ano: number) => void;
  onOpenBackup: () => void;
  onToggleTaxBar: () => void;
  /** Slot opcional à direita (ex.: SyncStatus, ThemeToggle). */
  extraActions?: ReactNode;
}

export function Header({
  mes,
  ano,
  onChangeMes,
  onOpenBackup,
  onToggleTaxBar,
  extraActions,
}: Props) {
  const prev = () => {
    let m = mes - 1;
    let y = ano;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    onChangeMes(m, y);
  };

  const next = () => {
    let m = mes + 1;
    let y = ano;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    onChangeMes(m, y);
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.topRow}>
          <div className={styles.brandWrap}>
            <Brand size="sm" />
          </div>
          <div className={styles.actions}>
            {extraActions}
            <button
              className={styles.actionBtn}
              onClick={onToggleTaxBar}
              aria-label="Ver taxas"
            >
              <span className={styles.actionGlyph}>%</span>
              <span className={styles.actionLabel}>Taxas</span>
            </button>
            <button
              className={styles.actionBtn}
              onClick={onOpenBackup}
              aria-label="Backup"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span className={styles.actionLabel}>Backup</span>
            </button>
          </div>
        </div>
        <div className={styles.monthRow}>
          <div className={styles.monthChip}>
            <button
              className={styles.monthBtn}
              aria-label="Mês anterior"
              onClick={prev}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className={styles.monthLabel}>
              <span className={styles.monthName}>{MESES_FULL[mes]}</span>
              <span className={styles.monthYear}>{ano}</span>
            </span>
            <button
              className={styles.monthBtn}
              aria-label="Próximo mês"
              onClick={next}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
