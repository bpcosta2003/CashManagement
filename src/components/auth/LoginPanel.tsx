import { useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import type { SyncStatus } from "../../hooks/useSync";
import styles from "./LoginPanel.module.css";

/**
 * Site key pública do Cloudflare Turnstile. Vem do Vercel (env var no
 * deploy). Quando ausente, o widget não é renderizado e o login funciona
 * como antes — útil pra dev local e pra rollback rápido se o CAPTCHA
 * der problema.
 */
const TURNSTILE_SITE_KEY = (
  import.meta.env.VITE_TURNSTILE_SITE_KEY ?? ""
).trim();

interface Props {
  open: boolean;
  user: User | null;
  syncStatus: SyncStatus;
  lastSyncAt: string | null;
  onClose: () => void;
  onSignIn: (email: string, captchaToken?: string) => Promise<void>;
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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const turnstileEnabled = TURNSTILE_SITE_KEY.length > 0;

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || submitting) return;
    if (turnstileEnabled && !captchaToken) {
      setInfo({
        kind: "error",
        msg: "Aguarde a verificação anti-robô terminar antes de enviar.",
      });
      return;
    }
    setSubmitting(true);
    setInfo(null);
    try {
      await onSignIn(email, captchaToken ?? undefined);
      setInfo({
        kind: "success",
        msg: `Enviamos um link mágico para ${email}. Abra o e-mail e clique para entrar.`,
      });
      // Tokens do Turnstile são single-use. Após o uso, reseta o widget
      // pra gerar um novo (caso o usuário precise re-enviar).
      if (turnstileEnabled) {
        setCaptchaToken(null);
        turnstileRef.current?.reset();
      }
    } catch (e) {
      setInfo({ kind: "error", msg: (e as Error).message });
      if (turnstileEnabled) {
        setCaptchaToken(null);
        turnstileRef.current?.reset();
      }
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

            {turnstileEnabled && (
              <div className={styles.captcha}>
                <Turnstile
                  ref={turnstileRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  options={{
                    theme: "auto",
                    size: "flexible",
                    appearance: "always",
                  }}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onError={() => setCaptchaToken(null)}
                  onExpire={() => setCaptchaToken(null)}
                />
              </div>
            )}

            <button
              className={styles.cta}
              type="submit"
              disabled={
                submitting || (turnstileEnabled && !captchaToken)
              }
            >
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
