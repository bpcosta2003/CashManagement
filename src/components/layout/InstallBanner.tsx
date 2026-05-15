import { useState } from "react";
import { useInstallPrompt } from "../../hooks/useInstallPrompt";
import styles from "./InstallBanner.module.css";

const DISMISS_KEY = "controle-caixa:install-dismissed";

export function InstallBanner() {
  const status = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;
  if (status.kind === "installed" || status.kind === "unavailable") return null;

  const handleInstall = async () => {
    if (status.kind !== "available") return;
    const outcome = await status.install();
    if (outcome === "accepted") {
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        /* ignore */
      }
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const isAvailable = status.kind === "available";

  return (
    <div className={styles.banner}>
      <span className={styles.icon}>📲</span>
      <span className={styles.text}>
        {isAvailable
          ? "Instale o app para acesso rápido pelo celular"
          : "No Safari: toque em Compartilhar → Adicionar à Tela Inicial"}
      </span>
      <div className={styles.actions}>
        {isAvailable && (
          <button className={styles.btn} onClick={handleInstall}>
            Instalar
          </button>
        )}
        <button
          className={`${styles.btn} ${styles.btnGhost}`}
          onClick={handleDismiss}
        >
          {isAvailable ? "Agora não" : "OK"}
        </button>
      </div>
    </div>
  );
}
