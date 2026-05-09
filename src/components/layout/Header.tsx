import type { ReactNode } from "react";
import { MESES_SHORT } from "../../constants";
import { Brand } from "./Brand";
import styles from "./Header.module.css";

interface Props {
  mes: number;
  ano: number;
  onChangeMes: (mes: number, ano: number) => void;
  onOpenBackup: () => void;
  onToggleTaxBar: () => void;
  /** Slot opcional à direita (ex.: SyncStatus). */
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

  const yearShort = String(ano).slice(2);

  return (
    <header className={styles.header}>
      <div className={styles.row}>
        <Brand size="sm" />

        <div className={styles.monthChip}>
          <button
            className={styles.monthBtn}
            aria-label="Mês anterior"
            onClick={prev}
          >
            ‹
          </button>
          <span className={styles.monthLabel}>
            {MESES_SHORT[mes]}<span className={styles.monthDot}>·</span>{yearShort}
          </span>
          <button
            className={styles.monthBtn}
            aria-label="Próximo mês"
            onClick={next}
          >
            ›
          </button>
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
            <span className={styles.actionGlyph}>↧</span>
            <span className={styles.actionLabel}>Backup</span>
          </button>
        </div>
      </div>
    </header>
  );
}
