import {
  ACCENT_LABELS,
  ACCENT_PREVIEW,
  type Accent,
  type Theme,
} from "../../hooks/useAppearance";
import type { AppSettings } from "../../types";
import styles from "./SettingsModal.module.css";

interface Props {
  open: boolean;
  theme: Theme;
  accent: Accent;
  settings: AppSettings | undefined;
  onClose: () => void;
  onToggleTheme: () => void;
  onSetAccent: (a: Accent) => void;
  onSetSettings: (patch: Partial<AppSettings>) => void;
}

const ACCENT_ORDER: Accent[] = [
  "bordo",
  "rosa",
  "pessego",
  "terracota",
  "ouro",
  "salvia",
  "esmeralda",
  "oceano",
  "cobalto",
  "indigo",
  "lavanda",
  "grafite",
];

export function SettingsModal({
  open,
  theme,
  accent,
  settings,
  onClose,
  onToggleTheme,
  onSetAccent,
  onSetSettings,
}: Props) {
  if (!open) return null;

  const dailyReminder = settings?.dailyReminder ?? false;
  const autoBackup = settings?.autoBackupConsent ?? null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id="settings-title" className={styles.title}>
            Preferências
          </h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        <div className={styles.body}>
          {/* ─── Aparência ─── */}
          <section className={styles.section}>
            <span className={styles.sectionLabel}>Aparência</span>

            <div className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.rowTitle}>Tema</span>
                <span className={styles.rowDesc}>
                  Cor de fundo do app. Adapta automaticamente todos os
                  componentes.
                </span>
              </div>
              <div className={styles.themeToggleRow}>
                <button
                  type="button"
                  className={styles.themeBtn}
                  data-active={theme === "light"}
                  onClick={theme === "dark" ? onToggleTheme : undefined}
                  aria-label="Tema claro"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                  </svg>
                  Claro
                </button>
                <button
                  type="button"
                  className={styles.themeBtn}
                  data-active={theme === "dark"}
                  onClick={theme === "light" ? onToggleTheme : undefined}
                  aria-label="Tema escuro"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  Escuro
                </button>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.rowTitle}>Cor de destaque</span>
                <span className={styles.rowDesc}>
                  Aplica em botões, links, gráficos e elementos principais.
                </span>
              </div>
            </div>
            <div className={styles.accentGrid}>
              {ACCENT_ORDER.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={styles.accentBtn}
                  data-active={accent === a}
                  onClick={() => onSetAccent(a)}
                  aria-label={`Cor ${ACCENT_LABELS[a]}`}
                  aria-pressed={accent === a}
                >
                  <span
                    className={styles.accentSwatch}
                    style={{ background: ACCENT_PREVIEW[a] }}
                    aria-hidden="true"
                  >
                    {accent === a && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  <span className={styles.accentLabel}>{ACCENT_LABELS[a]}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ─── Notificações ─── */}
          <section className={styles.section}>
            <span className={styles.sectionLabel}>Lembretes</span>

            <label className={styles.switchRow}>
              <div className={styles.rowText}>
                <span className={styles.rowTitle}>Lembrete diário</span>
                <span className={styles.rowDesc}>
                  Mostra um aviso sutil quando você abre o app depois de 24h
                  sem lançar nada.
                </span>
              </div>
              <input
                type="checkbox"
                className={styles.switch}
                checked={dailyReminder}
                onChange={(e) =>
                  onSetSettings({ dailyReminder: e.target.checked })
                }
              />
            </label>

            <label className={styles.switchRow}>
              <div className={styles.rowText}>
                <span className={styles.rowTitle}>Backup automático</span>
                <span className={styles.rowDesc}>
                  Baixa um Excel a cada 14 dias sem precisar pedir. Você
                  pode alterar isso a qualquer momento.
                </span>
              </div>
              <input
                type="checkbox"
                className={styles.switch}
                checked={autoBackup === "yes"}
                onChange={(e) =>
                  onSetSettings({
                    autoBackupConsent: e.target.checked ? "yes" : "no",
                  })
                }
              />
            </label>
          </section>
        </div>
      </div>
    </div>
  );
}
