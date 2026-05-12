import { MESES_FULL } from "../../constants";
import styles from "./PeriodNav.module.css";

export type Period = "month" | "year";

interface Props {
  period: Period;
  mes: number;
  ano: number;
  onChangePeriod: (p: Period) => void;
  onChangeMes: (mes: number, ano: number) => void;
  onChangeAno: (ano: number) => void;
}

export function PeriodNav({
  period,
  mes,
  ano,
  onChangePeriod,
  onChangeMes,
  onChangeAno,
}: Props) {
  const prevMonth = () => {
    let m = mes - 1;
    let y = ano;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    onChangeMes(m, y);
  };

  const nextMonth = () => {
    let m = mes + 1;
    let y = ano;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    onChangeMes(m, y);
  };

  const prevYear = () => onChangeAno(ano - 1);
  const nextYear = () => onChangeAno(ano + 1);

  return (
    <nav className={styles.section} aria-label="Navegação de período">
      <div className={styles.bar}>
        <div className={styles.toggle} role="tablist" aria-label="Tipo de período">
          <button
            type="button"
            role="tab"
            aria-selected={period === "month"}
            data-active={period === "month"}
            className={styles.toggleBtn}
            onClick={() => onChangePeriod("month")}
          >
            Mês
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={period === "year"}
            data-active={period === "year"}
            className={styles.toggleBtn}
            onClick={() => onChangePeriod("year")}
          >
            Ano
          </button>
        </div>

        <div className={styles.nav}>
          <button
            className={styles.arrow}
            onClick={period === "month" ? prevMonth : prevYear}
            aria-label={period === "month" ? "Mês anterior" : "Ano anterior"}
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
            {period === "month" ? (
              <>
                <span className={styles.eyebrow}>Movimento de</span>
                <span className={styles.value}>
                  <span className={styles.valueMain}>{MESES_FULL[mes]}</span>
                  <span className={styles.valueSub}>{ano}</span>
                </span>
              </>
            ) : (
              <>
                <span className={styles.eyebrow}>Resumo de</span>
                <span className={styles.value}>
                  <span className={styles.valueMain}>{ano}</span>
                </span>
              </>
            )}
          </div>

          <button
            className={styles.arrow}
            onClick={period === "month" ? nextMonth : nextYear}
            aria-label={period === "month" ? "Próximo mês" : "Próximo ano"}
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
      </div>
    </nav>
  );
}
