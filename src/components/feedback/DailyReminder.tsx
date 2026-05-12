import { useEffect, useState } from "react";
import type { Row } from "../../types";
import styles from "./DailyReminder.module.css";

const DISMISS_KEY = "controle-caixa:daily-reminder-dismissed";
const SESSION_SHOWN_KEY = "controle-caixa:daily-reminder-shown";
const HOURS_THRESHOLD = 24;
const DISMISS_HOURS = 12;

interface Props {
  enabled: boolean;
  rows: Row[];
  /** Click em "Lançar agora" — App.tsx abre o EntryForm. */
  onAdd: () => void;
}

function hoursSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return (Date.now() - then) / (1000 * 60 * 60);
}

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function readDismissedAt(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

function writeDismissedAt(iso: string): void {
  try {
    localStorage.setItem(DISMISS_KEY, iso);
  } catch {
    /* ignore */
  }
}

export function DailyReminder({ enabled, rows, onAdd }: Props) {
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (!enabled) return;
    // Já dispensou recentemente?
    const dismissedAt = readDismissedAt();
    if (dismissedAt) {
      const h = hoursSince(dismissedAt);
      if (h !== null && h < DISMISS_HOURS) {
        setDismissed(true);
        return;
      }
    }
    // Já mostrou nessa sessão? Não repete na mesma sessão.
    if (readSession(SESSION_SHOWN_KEY) === "1") {
      setDismissed(true);
      return;
    }
    setDismissed(false);
  }, [enabled]);

  if (!enabled || dismissed) return null;
  if (rows.length === 0) return null;

  // Último lançamento (qualquer business)
  const lastCriadoEm = rows.reduce(
    (acc, r) => (r.criadoEm > acc ? r.criadoEm : acc),
    "",
  );
  const hours = hoursSince(lastCriadoEm);
  if (hours === null || hours < HOURS_THRESHOLD) return null;

  writeSession(SESSION_SHOWN_KEY, "1");

  const days = Math.floor(hours / 24);
  const text =
    days >= 1
      ? `Faz ${days} dia${days === 1 ? "" : "s"} sem lançar nada.`
      : "Você ainda não lançou nada hoje.";

  const handleAdd = () => {
    setDismissed(true);
    onAdd();
  };

  const handleDismiss = () => {
    writeDismissedAt(new Date().toISOString());
    setDismissed(true);
  };

  return (
    <div className={styles.banner} role="region" aria-label="Lembrete diário">
      <span className={styles.icon}>⏰</span>
      <span className={styles.text}>
        <strong>{text}</strong> Que tal registrar os atendimentos agora pra
        não esquecer?
      </span>
      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={handleAdd}>
          Lançar agora
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnGhost}`}
          onClick={handleDismiss}
        >
          Depois
        </button>
      </div>
    </div>
  );
}
