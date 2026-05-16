import { useEffect, useState } from "react";
import type { AppSettings, Row } from "../../types";
import {
  daysSince,
  getLastBackup,
  setLastBackup,
} from "../../lib/storage";
import { isTourActive } from "../../lib/tour";
import styles from "./BackupReminder.module.css";

const REMIND_AFTER_DAYS = 7;
const URGENT_AFTER_DAYS = 14;
const AUTO_EXPORT_AFTER_DAYS = 14;
const SESSION_AUTO_FLAG = "controle-caixa:auto-exported-this-session";
const DISMISS_FLAG = "controle-caixa:reminder-dismissed-at";

type Consent = AppSettings["autoBackupConsent"];

interface Props {
  rows: Row[];
  autoConsent: Consent;
  onSetAutoConsent: (c: Consent) => void;
  onToast?: (msg: string) => void;
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

export function BackupReminder({
  rows,
  autoConsent,
  onSetAutoConsent,
  onToast,
}: Props) {
  const [tick, setTick] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<string | null>(() =>
    readSession(DISMISS_FLAG),
  );

  // Refresh state once per minute so the "X dias" stays current.
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const lastBackup = getLastBackup();
  const days = daysSince(lastBackup);

  // Auto-export apenas se usuário deu consentimento explícito ("yes").
  useEffect(() => {
    if (autoConsent !== "yes") return;
    if (rows.length === 0) return;
    if (days !== null && days < AUTO_EXPORT_AFTER_DAYS) return;
    if (readSession(SESSION_AUTO_FLAG) === "1") return;
    // Durante o tour, o state é fake — não baixar arquivo de exemplo.
    if (isTourActive()) return;

    writeSession(SESSION_AUTO_FLAG, "1");
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
  }, [autoConsent, days === null ? -1 : days, rows.length === 0]);

  // Sem dados → não tem o que lembrar.
  if (rows.length === 0) return null;

  const needsConsent = autoConsent === null;
  const overdueReminder = days === null || days >= REMIND_AFTER_DAYS;
  const urgent = days === null || days >= URGENT_AFTER_DAYS;
  const recentlyDismissed =
    dismissedAt &&
    daysSince(dismissedAt) !== null &&
    (daysSince(dismissedAt) ?? 0) < 1;

  // Decide qual banner mostrar:
  // 1. Se nunca pediu consentimento E está atrasado → pede consentimento
  // 2. Se está atrasado → lembrete normal
  // 3. Senão → nada
  if (!overdueReminder) return null;
  if (recentlyDismissed && !needsConsent) return null;

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
    writeSession(DISMISS_FLAG, now);
    setDismissedAt(now);
  };

  const handleEnableAuto = async () => {
    onSetAutoConsent("yes");
    await handleBackupNow();
  };

  const handleDisableAuto = () => {
    onSetAutoConsent("no");
    handleDismiss();
  };

  /* ── Banner de consentimento (1ª vez que atrasou) ── */
  if (needsConsent) {
    return (
      <div
        className={`${styles.banner} ${styles.consent}`}
        data-tick={tick}
        role="region"
        aria-label="Permitir backup automático"
      >
        <span className={styles.icon}>💾</span>
        <span className={styles.text}>
          Quer que o app baixe um <strong>backup automaticamente</strong> a cada
          14 dias? Você sempre pode fazer manual também.
        </span>
        <div className={styles.actions}>
          <button className={styles.btn} onClick={handleEnableAuto}>
            Sim, ativar
          </button>
          <button
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={handleDisableAuto}
          >
            Não, só manual
          </button>
        </div>
      </div>
    );
  }

  /* ── Lembrete normal ── */
  return (
    <div
      className={`${styles.banner} ${urgent ? styles.urgent : ""}`}
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
            Último backup há{" "}
            <strong>
              {days} dia{days === 1 ? "" : "s"}
            </strong>
            .{" "}
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
