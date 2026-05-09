import { MESES_FULL } from "../../constants";
import styles from "./Header.module.css";

interface Props {
  mes: number;
  ano: number;
  onChangeMes: (mes: number, ano: number) => void;
  onOpenBackup: () => void;
  onToggleTaxBar: () => void;
}

export function Header({ mes, ano, onChangeMes, onOpenBackup, onToggleTaxBar }: Props) {
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
      <div className={styles.row}>
        <div className={styles.brand}>
          <span className={styles.brandDot} />
          Controle de Caixa
        </div>

        <div className={styles.monthNav}>
          <button
            className={styles.monthBtn}
            aria-label="Mês anterior"
            onClick={prev}
          >
            ‹
          </button>
          <div className={styles.monthLabel}>
            {MESES_FULL[mes]} {ano}
          </div>
          <button
            className={styles.monthBtn}
            aria-label="Próximo mês"
            onClick={next}
          >
            ›
          </button>
        </div>

        <div className={styles.actions}>
          <button className={styles.actionBtn} onClick={onToggleTaxBar}>
            % <span>Taxas</span>
          </button>
          <button className={styles.actionBtn} onClick={onOpenBackup}>
            ⬇ <span>Backup</span>
          </button>
        </div>
      </div>
    </header>
  );
}
