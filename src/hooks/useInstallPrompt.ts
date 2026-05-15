import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallStatus =
  | { kind: "installed" }
  | { kind: "ios-manual" }
  | { kind: "available"; install: () => Promise<"accepted" | "dismissed"> }
  | { kind: "unavailable" };

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

/**
 * Captura o evento beforeinstallprompt do navegador (Chromium) e expõe
 * um status estruturado pros consumidores.
 *
 * iOS Safari não dispara o evento — detectamos pelo userAgent e
 * retornamos "ios-manual" pra UI mostrar instruções.
 */
export function useInstallPrompt(): InstallStatus {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());

  useEffect(() => {
    if (installed) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [installed]);

  if (installed) return { kind: "installed" };
  if (prompt) {
    return {
      kind: "available",
      install: async () => {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === "accepted") {
          setInstalled(true);
          setPrompt(null);
        }
        return outcome;
      },
    };
  }
  if (isIos()) return { kind: "ios-manual" };
  return { kind: "unavailable" };
}
