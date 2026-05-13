import { useEffect, useRef, useState } from "react";
import styles from "./InfoTooltip.module.css";

interface Props {
  text: string;
  label?: string;
}

/**
 * Botão (i) com tooltip explicativa.
 * - Mobile: tap pra abrir, tap fora pra fechar
 * - Desktop: hover OR foco
 */
export function InfoTooltip({ text, label = "Mais informação" }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  return (
    <span ref={wrapRef} className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          // Só fecha se o foco saiu do wrap por inteiro
          if (!wrapRef.current?.contains(e.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </button>
      {open && (
        <span className={styles.bubble} role="tooltip">
          {text}
        </span>
      )}
    </span>
  );
}
