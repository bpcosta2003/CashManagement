import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";
export type Accent = "bordo" | "esmeralda" | "indigo" | "terracota" | "ouro";

const THEME_KEY = "controle-caixa:theme";
const ACCENT_KEY = "controle-caixa:accent";

export const ACCENT_LABELS: Record<Accent, string> = {
  bordo: "Bordô",
  esmeralda: "Esmeralda",
  indigo: "Índigo",
  terracota: "Terracota",
  ouro: "Ouro",
};

/** Cor representativa de cada accent (usada nos swatches do seletor). */
export const ACCENT_PREVIEW: Record<Accent, string> = {
  bordo: "#5a2e3f",
  esmeralda: "#2f5d44",
  indigo: "#2e3f6b",
  terracota: "#8a4530",
  ouro: "#7a5a1f",
};

function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* ignore */
  }
  return "light";
}

function readAccent(): Accent {
  if (typeof document === "undefined") return "bordo";
  try {
    const saved = localStorage.getItem(ACCENT_KEY);
    if (
      saved === "bordo" ||
      saved === "esmeralda" ||
      saved === "indigo" ||
      saved === "terracota" ||
      saved === "ouro"
    ) {
      return saved;
    }
  } catch {
    /* ignore */
  }
  return "bordo";
}

function apply(theme: Theme, accent: Accent) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  if (accent === "bordo") {
    // bordo é o default — limpa o atributo pra não inflar specificity
    root.removeAttribute("data-accent");
  } else {
    root.setAttribute("data-accent", accent);
  }
}

export function useAppearance() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [accent, setAccent] = useState<Accent>(readAccent);

  useEffect(() => {
    apply(theme, accent);
  }, [theme, accent]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const setAccentPref = useCallback((next: Accent) => {
    setAccent(next);
    try {
      localStorage.setItem(ACCENT_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  return { theme, accent, toggleTheme, setAccent: setAccentPref };
}
