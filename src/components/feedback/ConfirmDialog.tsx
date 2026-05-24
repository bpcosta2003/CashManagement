import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "./ConfirmDialog.module.css";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** Marca o botão de confirmação como ação destrutiva (vermelho).
   *  Default true — confirmar quase sempre destrói algo (deletar,
   *  resetar, etc.). Passa `false` quando é uma ação não-destrutiva
   *  mas que ainda precisa de confirmação (ex.: "Mover pra arquivado"). */
  danger?: boolean;
}

type Resolver = (ok: boolean) => void;

interface State {
  open: boolean;
  opts: ConfirmOptions | null;
}

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(
  () => Promise.resolve(false),
);

/** API imperativa pra substituir `window.confirm()`. Uso:
 *
 *     const confirm = useConfirm();
 *     const ok = await confirm({ title: "Excluir cliente?", danger: true });
 *     if (ok) { ... }
 *
 *  Sempre retorna boolean. Resolve `false` em ESC/backdrop/cancelar. */
export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ open: false, opts: null });
  const resolverRef = useRef<Resolver | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    // Se já tem um dialog aberto, fecha o anterior como cancelado.
    // Evita race condition quando o caller dispara dois confirms seguidos.
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({ open: true, opts });
    });
  }, []);

  const close = useCallback((ok: boolean) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setState({ open: false, opts: null });
    if (resolver) resolver(ok);
  }, []);

  // ESC fecha como cancelado. Bloqueio de scroll enquanto aberto.
  useEffect(() => {
    if (!state.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [state.open, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state.open && state.opts && (
        <ConfirmDialog opts={state.opts} onClose={close} />
      )}
    </ConfirmContext.Provider>
  );
}

interface DialogProps {
  opts: ConfirmOptions;
  onClose: (ok: boolean) => void;
}

function ConfirmDialog({ opts, onClose }: DialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const danger = opts.danger !== false;

  // Foco no botão de confirmar quando abre — usuário aperta Enter e age.
  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    onClose(false);
  };

  return (
    <div className={styles.backdrop} onClick={handleBackdrop}>
      <div
        className={styles.sheet}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={opts.message ? "confirm-message" : undefined}
      >
        <h3 id="confirm-title" className={styles.title}>
          {opts.title}
        </h3>
        {opts.message && (
          <p id="confirm-message" className={styles.message}>
            {opts.message}
          </p>
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.cancel}`}
            onClick={() => onClose(false)}
          >
            {opts.cancelText ?? "Cancelar"}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`${styles.btn} ${danger ? styles.danger : styles.confirm}`}
            onClick={() => onClose(true)}
          >
            {opts.confirmText ?? "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
