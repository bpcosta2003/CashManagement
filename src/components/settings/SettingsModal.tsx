import { useState } from "react";
import { ACCENT_LABELS, ACCENT_PREVIEW, type Accent, type Theme } from "../../hooks/useAppearance";
import { useInstallPrompt } from "../../hooks/useInstallPrompt";
import { getSupabase } from "../../lib/supabase";
import type { AppSettings } from "../../types";
import styles from "./SettingsModal.module.css";

type TestKind = "firstDay" | "lastBusinessDay";
type TestStatus = "idle" | "sending" | "ok" | "error";

interface Props {
  open: boolean;
  theme: Theme;
  accent: Accent;
  settings: AppSettings | undefined;
  onClose: () => void;
  onToggleTheme: () => void;
  onSetAccent: (a: Accent) => void;
  onSetSettings: (patch: Partial<AppSettings>) => void;
  /** Reinicia o tour de primeiro acesso, mesmo que o usuário já tenha
   *  completado/pulado. */
  onRestartTour: () => void;
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

export function SettingsModal({ open, theme, accent, settings, onClose, onToggleTheme, onSetAccent, onSetSettings, onRestartTour }: Props) {
  const install = useInstallPrompt();
  const [installing, setInstalling] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMessage, setTestMessage] = useState<string>("");

  if (!open) return null;

  const dailyReminder = settings?.dailyReminder ?? false;
  const emailNotifications = settings?.emailNotifications ?? false;
  const autoBackup = settings?.autoBackupConsent ?? null;

  const handleInstall = async () => {
    if (install.kind !== "available") return;
    setInstalling(true);
    try {
      await install.install();
    } finally {
      setInstalling(false);
    }
  };

  const handleTestEmail = async (kind: TestKind) => {
    const supabase = getSupabase();
    if (!supabase) {
      setTestStatus("error");
      setTestMessage("Login Supabase necessário pra testar.");
      return;
    }
    setTestStatus("sending");
    setTestMessage("Enviando…");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setTestStatus("error");
        setTestMessage("Faça login antes de testar.");
        return;
      }
      const res = await fetch("/api/admin/test-notification", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ kind }),
      });
      const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok || !json || json.ok !== true) {
        const msg = typeof json?.message === "string" ? json.message : `Falha (HTTP ${res.status}).`;
        setTestStatus("error");
        setTestMessage(msg);
        return;
      }
      if (json.sent === true) {
        setTestStatus("ok");
        setTestMessage(`Enviado pra ${json.to}. Confira sua caixa de entrada.`);
      } else {
        setTestStatus("ok");
        const reason = typeof json.skippedReason === "string" ? json.skippedReason : "Email seria pulado pelo cron real.";
        setTestMessage(reason);
      }
    } catch (err) {
      console.error("[settings] test email error", err);
      setTestStatus("error");
      setTestMessage("Falha de rede ao testar.");
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h2 id="settings-title" className={styles.title}>
            Preferências
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
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
                <span className={styles.rowDesc}>Cor de fundo do app. Adapta automaticamente todos os componentes.</span>
              </div>
              <div className={styles.themeToggleRow}>
                <button
                  type="button"
                  className={styles.themeBtn}
                  data-active={theme === "light"}
                  onClick={theme === "dark" ? onToggleTheme : undefined}
                  aria-label="Tema claro">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true">
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
                  aria-label="Tema escuro">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  Escuro
                </button>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.rowTitle}>Cor de destaque</span>
                <span className={styles.rowDesc}>Aplica em botões, links, gráficos e elementos principais.</span>
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
                  aria-pressed={accent === a}>
                  <span className={styles.accentSwatch} style={{ background: ACCENT_PREVIEW[a] }} aria-hidden="true">
                    {accent === a && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round">
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
                <span className={styles.rowDesc}>Mostra um aviso sutil quando você abre o app depois de 24h sem lançar nada.</span>
              </div>
              <input
                type="checkbox"
                className={styles.switch}
                checked={dailyReminder}
                onChange={(e) => onSetSettings({ dailyReminder: e.target.checked })}
              />
            </label>

            <label className={styles.switchRow}>
              <div className={styles.rowText}>
                <span className={styles.rowTitle}>Backup automático</span>
                <span className={styles.rowDesc}>Baixa um Excel a cada 14 dias sem precisar pedir. Você pode alterar isso a qualquer momento.</span>
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

            <label className={styles.switchRow}>
              <div className={styles.rowText}>
                <span className={styles.rowTitle}>Notificações por email</span>
                <span className={styles.rowDesc}>
                  No último dia útil do mês envio um resumo com pendências e inconsistências. No 1º dia do mês, lembro de cadastrar a meta. Pra
                  cancelar, é só desligar aqui.
                </span>
              </div>
              <input
                type="checkbox"
                className={styles.switch}
                checked={emailNotifications}
                onChange={(e) => onSetSettings({ emailNotifications: e.target.checked })}
              />
            </label>

            {/* Teste de envio de email */}
            {/* <div className={styles.testRow}>
              <span className={styles.testLabel}>
                Enviar teste pro seu email:
              </span>
              <div className={styles.testActions}>
                <button
                  type="button"
                  className={styles.testBtn}
                  onClick={() => handleTestEmail("firstDay")}
                  disabled={testStatus === "sending"}
                >
                  1º do mês
                </button>
                <button
                  type="button"
                  className={styles.testBtn}
                  onClick={() => handleTestEmail("lastBusinessDay")}
                  disabled={testStatus === "sending"}
                >
                  Fim do mês
                </button>
              </div>
              {testMessage && (
                <span className={styles.testMessage} data-tone={testStatus}>
                  {testMessage}
                </span>
              )}
            </div> */}
          </section>

          {/* ─── App ─── */}
          <section className={styles.section}>
            <span className={styles.sectionLabel}>App</span>

            <div className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.rowTitle}>Instalar no dispositivo</span>
                <span className={styles.rowDesc}>
                  {install.kind === "installed" && "Você já está usando o app instalado. Tudo certo."}
                  {install.kind === "available" && "Adiciona o app à tela inicial. Funciona offline e abre direto, sem barra do navegador."}
                  {install.kind === "ios-manual" && "No Safari, toque em Compartilhar → Adicionar à Tela Inicial."}
                  {install.kind === "unavailable" &&
                    "Seu navegador não oferece instalação automática. Use Chrome ou Edge no desktop, ou o navegador nativo no celular."}
                </span>
              </div>
              {install.kind === "available" && (
                <button type="button" className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={handleInstall} disabled={installing}>
                  {installing ? "Instalando…" : "Instalar app"}
                </button>
              )}
              {install.kind === "installed" && (
                <button type="button" className={styles.actionBtn} disabled>
                  Instalado
                </button>
              )}
            </div>

            <div className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.rowTitle}>Refazer tour de boas-vindas</span>
                <span className={styles.rowDesc}>Apresenta novamente as principais funcionalidades do app.</span>
              </div>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => {
                  onRestartTour();
                  onClose();
                }}>
                Refazer tour
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
