import { useEffect } from "react";
import type { ReactNode } from "react";
import styles from "./Sheet.module.css";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Sheet({ open, title, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  // Fechar clicando fora só faz sentido no mobile (bottom sheet — gesto
  // intuitivo). No desktop o modal pode ter formulários longos com
  // seleção de texto que escapa do retângulo — fechar por clique fora é
  // hostil. Aqui, só fechamos quando clica no backdrop em mobile (<721px).
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (typeof window !== "undefined" && window.innerWidth > 720) return;
    onClose();
  };

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.handleWrap}>
          <div className={styles.handle} />
        </div>
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button
            className={styles.close}
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
