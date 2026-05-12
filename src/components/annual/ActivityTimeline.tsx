import type { MonthActivity } from "../../hooks/useActivity";
import { fmtBRL } from "../../lib/calc";
import styles from "./ActivityTimeline.module.css";

interface Props {
  activity: MonthActivity[];
  /** Click no mês — abre detalhes daquele mês. */
  onSelectMonth: (m: number, y: number) => void;
}

export function ActivityTimeline({ activity, onSelectMonth }: Props) {
  if (activity.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.shell}>
        <header className={styles.head}>
          <span className={styles.eyebrow}>Atividade do ano</span>
          <span className={styles.hint}>
            {activity.length} mês{activity.length === 1 ? "" : "es"} com
            movimento
          </span>
        </header>
        <ol className={styles.list}>
          {activity.map((m) => (
            <li key={`${m.y}-${m.m}`} className={styles.item}>
              <span className={styles.dot} aria-hidden="true" />
              <button
                type="button"
                className={styles.body}
                onClick={() => onSelectMonth(m.m, m.y)}
              >
                <header className={styles.itemHead}>
                  <span className={styles.monthLabel}>{m.label}</span>
                  <span className={styles.monthTotal}>
                    {fmtBRL(m.bruto)}
                  </span>
                </header>
                <ul className={styles.events}>
                  {m.entries > 0 && (
                    <li className={styles.event}>
                      <span className={styles.eventIcon} aria-hidden="true">
                        📋
                      </span>
                      <span className={styles.eventText}>
                        <strong>
                          {m.entries} lançamento{m.entries === 1 ? "" : "s"}
                        </strong>{" "}
                        · {fmtBRL(m.liq)} de líquido
                      </span>
                    </li>
                  )}
                  {m.bestDay && (
                    <li className={styles.event}>
                      <span className={styles.eventIcon} aria-hidden="true">
                        🏆
                      </span>
                      <span className={styles.eventText}>
                        Melhor dia: <strong>{m.bestDay.date}</strong> com{" "}
                        {fmtBRL(m.bestDay.bruto)}
                      </span>
                    </li>
                  )}
                  {m.newClients.length > 0 && (
                    <li className={styles.event}>
                      <span className={styles.eventIcon} aria-hidden="true">
                        👋
                      </span>
                      <span className={styles.eventText}>
                        <strong>
                          {m.newClients.length} cliente
                          {m.newClients.length === 1 ? "" : "s"} novo
                          {m.newClients.length === 1 ? "" : "s"}
                        </strong>
                        {m.newClients.length <= 3
                          ? `: ${m.newClients.join(", ")}`
                          : `: ${m.newClients.slice(0, 2).join(", ")} +${m.newClients.length - 2}`}
                      </span>
                    </li>
                  )}
                </ul>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
