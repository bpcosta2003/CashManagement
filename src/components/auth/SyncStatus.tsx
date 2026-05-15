import type { SyncStatus as SyncStatusKind } from "../../hooks/useSync";
import styles from "./SyncStatus.module.css";

interface Props {
  configured: boolean;
  signedIn: boolean;
  status: SyncStatusKind;
  onClick: () => void;
}

const LABELS: Record<SyncStatusKind, string> = {
  disabled: "Local",
  offline: "Offline",
  idle: "Local",
  syncing: "Sincronizando",
  synced: "Sincronizado",
  error: "Erro",
};

const DOT_CLASS: Record<SyncStatusKind, string> = {
  disabled: "disabled",
  offline: "offline",
  idle: "disabled",
  syncing: "syncing",
  synced: "synced",
  error: "error",
};

export function SyncStatus({ configured, signedIn, status, onClick }: Props) {
  if (!configured) return null;

  const effective: SyncStatusKind = signedIn ? status : "disabled";
  const dotKey = DOT_CLASS[effective];
  const label = signedIn ? LABELS[effective] : "Entrar";

  return (
    <button
      type="button"
      className={styles.pill}
      onClick={onClick}
      aria-label={`Status de sincronização: ${label}`}
      title={label}
      data-tour="sync-status"
    >
      <span className={`${styles.dot} ${styles[dotKey]}`} />
      <span className={styles.label}>{label}</span>
    </button>
  );
}
