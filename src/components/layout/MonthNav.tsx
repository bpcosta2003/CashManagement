import { MESES_FULL } from "../../constants";
import styles from "./MonthNav.module.css";

interface Props {
  mes: number;
  ano: number;
  onChange: (mes: number, ano: number) => void;
}

export function MonthNav({ mes, ano, onChange }: Props) {
  const prev = () => {
    let m = mes - 1;
    let y = ano;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    onChange(m, y);
  };

  const next = () => {
    let m = mes + 1;
    let y = ano;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    onChange(m, y);
  };

  return (
    <nav className={styles.section} aria-label="Navegação de mês">
      <div className={styles.bar}>
        <button
          className={styles.arrow}
          onClick={prev}
          aria-label="Mês anterior"
        >
          <svg
            width="18"
            height="18"
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

        <div className={styles.label}>
          <span className={styles.eyebrow}>Movimento de</span>
          <span className={styles.month}>
            <span className={styles.monthName}>{MESES_FULL[mes]}</span>
            <span className={styles.monthYear}>{ano}</span>
          </span>
        </div>

        <button
          className={styles.arrow}
          onClick={next}
          aria-label="Próximo mês"
        >
          <svg
            width="18"
            height="18"
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
    </nav>
  );
}
