import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { SyncStatus } from "../../hooks/useSync";
import styles from "./LoginPanel.module.css";

interface Props {
  open: boolean;
  user: User | null;
  syncStatus: SyncStatus;
  lastSyncAt: string | null;
  onClose: () => void;
  onSignIn: (email: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}

const STATUS_LABEL: Record<SyncStatus, string> = {
  disabled: "Apenas neste aparelho",
  offline: "Offline — sincroniza quando voltar",
  idle: "Pronto",
  syncing: "Sincronizando…",
  synced: "Tudo sincronizado",
  error: "Erro de sincronização",
};

export function LoginPanel({
  open,
  user,
  syncStatus,
  lastSyncAt,
  onClose,
  onSignIn,
  onSignOut,
}: Props) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [info, setInfo] = useState<{ kind: "success" | "error"; msg: string } | null>(
    null,
  );

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || submitting) return;
    setSubmitting(true);
    setInfo(null);
    try {
      await onSignIn(email);
      setInfo({
        kind: "success",
        msg: `Enviamos um link mágico para ${email}. Abra o e-mail e clique para entrar.`,
      });
    } catch (e) {
      setInfo({ kind: "error", msg: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.panel} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <span className={styles.title}>
            {user ? "👤 Sua conta" : "☁ Sincronizar entre aparelhos"}
          </span>
          <button className={styles.close} onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        {user ? (
          <div className={styles.body}>
            <div className={styles.account}>
              <span className={styles.accountEmail}>{user.email}</span>
              <span className={styles.accountStatus}>
                {STATUS_LABEL[syncStatus]}
                {lastSyncAt && syncStatus === "synced" && (
                  <> · última sincronização às{" "}
                    {new Date(lastSyncAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </>
                )}
              </span>
            </div>
            <p className={styles.intro}>
              Seus dados são salvos localmente e enviados em segundo plano para
              um banco protegido. Abra com o mesmo e-mail em outro aparelho que
              tudo aparece lá.
            </p>
            <button
              className={styles.signOut}
              onClick={async () => {
                await onSignOut();
                onClose();
              }}
            >
              Sair desta conta
            </button>
          </div>
        ) : (
          <form className={styles.body} onSubmit={submit}>
            <p className={styles.intro}>
              Digite seu e-mail. Vamos enviar um link para entrar — sem senha.
              Use o mesmo e-mail no celular e no notebook para que os dados
              fiquem sincronizados.
            </p>

            <div className={styles.field}>
              <label className={styles.label}>E-mail</label>
              <input
                className={styles.input}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                required
              />
            </div>

            <button className={styles.cta} type="submit" disabled={submitting}>
              {submitting ? "Enviando…" : "Receber link mágico"}
            </button>

            {info && (
              <div
                className={`${styles.message} ${
                  info.kind === "success" ? styles.success : styles.error
                }`}
              >
                {info.msg}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
