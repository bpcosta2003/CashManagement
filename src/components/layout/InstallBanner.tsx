import { useEffect, useState } from "react";
import styles from "./InstallBanner.module.css";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "controle-caixa:install-dismissed";

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (dismissed || isStandalone()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (isIos()) setShowIos(true);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [dismissed]);

  if (dismissed || isStandalone()) return null;
  if (!prompt && !showIos) return null;

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    setPrompt(null);
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

  return (
    <div className={styles.banner}>
      <span className={styles.icon}>📲</span>
      <span className={styles.text}>
        {prompt
          ? "Instale o app para acesso rápido pelo celular"
          : "No Safari: toque em Compartilhar → Adicionar à Tela Inicial"}
      </span>
      <div className={styles.actions}>
        {prompt && (
          <button className={styles.btn} onClick={handleInstall}>
            Instalar
          </button>
        )}
        <button
          className={`${styles.btn} ${styles.btnGhost}`}
          onClick={handleDismiss}
        >
          {prompt ? "Agora não" : "OK"}
        </button>
      </div>
    </div>
  );
}
