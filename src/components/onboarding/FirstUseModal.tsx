import { setFirstUseAcked } from "../../lib/storage";
import styles from "./FirstUseModal.module.css";

interface Props {
  open: boolean;
  cloudAvailable: boolean;
  onClose: () => void;
  onWantsCloud?: () => void;
}

export function FirstUseModal({ open, cloudAvailable, onClose, onWantsCloud }: Props) {
  if (!open) return null;

  const handleAck = () => {
    setFirstUseAcked();
    onClose();
  };

  const handleCloud = () => {
    setFirstUseAcked();
    onClose();
    onWantsCloud?.();
  };

  return (
    <div className={styles.backdrop}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="fum-title">
        <header className={styles.header}>
          <span className={styles.emoji}>👋</span>
          <h2 id="fum-title" className={styles.title}>
            Bem-vinda ao Controle de Caixa
          </h2>
        </header>

        <div className={styles.body}>
          <p className={styles.intro}>
            Antes de começar, é importante saber como seus dados ficam guardados:
          </p>

          <div className={styles.bullet}>
            <span className={styles.bulletIcon}>📱</span>
            <span className={styles.bulletText}>
              Por padrão, tudo é salvo <strong>só neste aparelho</strong>, no
              navegador. Não há servidor.
            </span>
          </div>
          <div className={styles.bullet}>
            <span className={styles.bulletIcon}>📵</span>
            <span className={styles.bulletText}>
              Funciona <strong>offline</strong>, mesmo sem internet.
            </span>
          </div>
          <div className={styles.bullet}>
            <span className={styles.bulletIcon}>💾</span>
            <span className={styles.bulletText}>
              <strong>Faça backup periodicamente.</strong> O app pode gerar um
              arquivo Excel com tudo que você lançou — guarde no e-mail ou no
              Drive. Sem backup, limpar o navegador apaga seus dados.
            </span>
          </div>

          {cloudAvailable && (
            <>
              <hr className={styles.divider} />
              <div className={styles.cloudHint}>
                <strong>💡 Quer usar em dois aparelhos?</strong>
                <br />
                Você pode entrar com o e-mail e ter os dados sincronizados
                entre celular e notebook automaticamente. É opcional e pode
                ativar depois.
              </div>
            </>
          )}
        </div>

        <div className={styles.actions}>
          {cloudAvailable && onWantsCloud ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className={styles.cta} onClick={handleCloud}>
                Entrar para sincronizar entre aparelhos
              </button>
              <button
                className={styles.cta}
                style={{
                  background: "transparent",
                  color: "var(--color-text)",
                  border: "1px solid var(--color-border)",
                }}
                onClick={handleAck}
              >
                Continuar só neste aparelho
              </button>
            </div>
          ) : (
            <button className={styles.cta} onClick={handleAck}>
              Entendi, vamos começar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
