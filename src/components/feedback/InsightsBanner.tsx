import { useState } from "react";
import type { Insight } from "../../hooks/useInsights";
import styles from "./InsightsBanner.module.css";

interface Props {
  insights: Insight[];
  /** Quantos insights mostrar antes do "ver mais". Default 2. */
  initialCount?: number;
}

const ICONS: Record<Insight["severity"], string> = {
  warning: "⚠",
  positive: "↗",
  info: "ℹ",
};

export function InsightsBanner({ insights, initialCount = 2 }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (insights.length === 0) return null;

  const shown = expanded ? insights : insights.slice(0, initialCount);
  const hidden = insights.length - shown.length;

  return (
    <section
      className={styles.section}
      aria-label="Insights do período"
      data-tour="insights"
    >
      <ul className={styles.list}>
        {shown.map((i) => (
          <li
            key={i.id}
            className={styles.item}
            data-severity={i.severity}
          >
            <span className={styles.icon} aria-hidden="true">
              {ICONS[i.severity]}
            </span>
            <div className={styles.body}>
              <span className={styles.title}>{i.title}</span>
              <span className={styles.detail}>{i.detail}</span>
            </div>
          </li>
        ))}
      </ul>
      {insights.length > initialCount && (
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded
            ? "Mostrar menos"
            : `Ver mais ${hidden} insight${hidden === 1 ? "" : "s"}`}
        </button>
      )}
    </section>
  );
}
