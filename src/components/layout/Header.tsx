import type { ReactNode } from "react";
import { Brand } from "./Brand";
import styles from "./Header.module.css";

interface Props {
  businessName?: string;
  /** Quando passado, brand vira botão pra abrir o switcher. */
  onBrandClick?: () => void;
  showBrandChevron?: boolean;
  onOpenBackup: () => void;
  onToggleTaxBar: () => void;
  /** Slot opcional à direita (ex.: SyncStatus, ThemeToggle). */
  extraActions?: ReactNode;
}

export function Header({
  businessName,
  onBrandClick,
  showBrandChevron,
  onOpenBackup,
  onToggleTaxBar,
  extraActions,
}: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brandWrap}>
          <Brand
            size="sm"
            businessName={businessName}
            onClick={onBrandClick}
            showChevron={showBrandChevron}
          />
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
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span className={styles.actionLabel}>Backup</span>
          </button>
        </div>
      </div>
    </header>
  );
}
