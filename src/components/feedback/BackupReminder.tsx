import { useEffect, useState } from "react";
import type { Row } from "../../types";
import {
  daysSince,
  getLastBackup,
  setLastBackup,
} from "../../lib/storage";
import styles from "./BackupReminder.module.css";

const REMIND_AFTER_DAYS = 7;
const URGENT_AFTER_DAYS = 14;
const AUTO_EXPORT_AFTER_DAYS = 14;
const SESSION_AUTO_FLAG = "controle-caixa:auto-exported-this-session";
const DISMISS_FLAG = "controle-caixa:reminder-dismissed-at";

interface Props {
  rows: Row[];
  onToast?: (msg: string) => void;
}

export function BackupReminder({ rows, onToast }: Props) {
  const [tick, setTick] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<string | null>(() =>
    sessionStorage.getItem(DISMISS_FLAG),
  );

  // Refresh state once per minute so the "X dias" stays current.
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const lastBackup = getLastBackup();
  const days = daysSince(lastBackup);

  // Auto-export once per session when threshold passed (and the user
  // actually has data to lose).
  useEffect(() => {
    if (rows.length === 0) return;
    if (days !== null && days < AUTO_EXPORT_AFTER_DAYS) return;
    if (sessionStorage.getItem(SESSION_AUTO_FLAG) === "1") return;

    sessionStorage.setItem(SESSION_AUTO_FLAG, "1");
    const t = window.setTimeout(async () => {
      try {
        const { exportToExcel } = await import("../../lib/excel");
        exportToExcel(rows);
        setLastBackup();
        onToast?.(
          "📥 Backup automático baixado — guarde o arquivo em local seguro",
        );
        setTick((x) => x + 1);
      } catch (e) {
        console.error("Falha no backup automático:", e);
      }
    }, 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days === null ? -1 : days, rows.length === 0]);

  if (rows.length === 0) return null;
  if (days !== null && days < REMIND_AFTER_DAYS) return null;
  if (
    dismissedAt &&
    daysSince(dismissedAt) !== null &&
    (daysSince(dismissedAt) ?? 0) < 1
  )
    return null;

  const urgent = days === null || days >= URGENT_AFTER_DAYS;

  const handleBackupNow = async () => {
    try {
      const { exportToExcel } = await import("../../lib/excel");
      exportToExcel(rows);
      setLastBackup();
      onToast?.("Backup gerado com sucesso");
      setTick((x) => x + 1);
    } catch (e) {
      console.error(e);
      onToast?.("Erro ao gerar backup");
    }
  };

  const handleDismiss = () => {
    const now = new Date().toISOString();
    sessionStorage.setItem(DISMISS_FLAG, now);
    setDismissedAt(now);
  };

  return (
    <div
      className={`${styles.banner} ${urgent ? styles.urgent : ""}`}
      // tick is read here so the linter doesn't strip the rerender dep
      data-tick={tick}
    >
      <span className={styles.icon}>{urgent ? "⚠️" : "💾"}</span>
      <span className={styles.text}>
        {days === null ? (
          <>
            Você ainda <strong>não fez nenhum backup</strong> dos seus dados.
            Exporte agora para não perder nada.
          </>
        ) : (
          <>
            Último backup há <strong>{days} dia{days === 1 ? "" : "s"}</strong>.{" "}
            {urgent
              ? "Faça um agora — limpar histórico ou trocar de aparelho apaga tudo."
              : "Recomendamos exportar pelo menos uma vez por semana."}
          </>
        )}
      </span>
      <div className={styles.actions}>
        <button className={styles.btn} onClick={handleBackupNow}>
          Fazer backup agora
        </button>
        {!urgent && (
          <button
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={handleDismiss}
          >
            Depois
          </button>
        )}
      </div>
    </div>
  );
}
