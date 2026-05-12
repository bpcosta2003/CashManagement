import { useState } from "react";
import { setFirstUseAcked } from "../../lib/storage";
import type { BusinessProfile, BusinessType } from "../../types";
import styles from "./FirstUseModal.module.css";

interface Props {
  open: boolean;
  initialBusiness?: BusinessProfile;
  cloudAvailable: boolean;
  onSubmit: (business: BusinessProfile) => void;
  onClose: () => void;
  onWantsCloud?: () => void;
}

const BUSINESS_TYPES: { value: BusinessType; label: string; icon: string }[] = [
  { value: "salao", label: "Salão de beleza", icon: "💇" },
  { value: "restaurante", label: "Restaurante / bar", icon: "🍽️" },
  { value: "comercio", label: "Comércio / loja", icon: "🛍️" },
  { value: "servicos", label: "Serviços", icon: "🔧" },
  { value: "freelancer", label: "Freelancer", icon: "💼" },
  { value: "outro", label: "Outro", icon: "✨" },
];

export function FirstUseModal({
  open,
  initialBusiness,
  cloudAvailable,
  onSubmit,
  onClose,
  onWantsCloud,
}: Props) {
  const [name, setName] = useState(initialBusiness?.name ?? "");
  const [type, setType] = useState<BusinessType>(
    initialBusiness?.type ?? "salao",
  );
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Diga o nome do seu negócio para começar");
      return;
    }
    setFirstUseAcked();
    onSubmit({ name: trimmed, type });
    onClose();
  };

  const handleCloud = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Diga o nome do seu negócio antes de sincronizar");
      return;
    }
    setFirstUseAcked();
    onSubmit({ name: trimmed, type });
    onClose();
    onWantsCloud?.();
  };

  return (
    <div className={styles.backdrop}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fum-title"
      >
        <header className={styles.header}>
          <span className={styles.emoji}>👋</span>
          <h2 id="fum-title" className={styles.title}>
            Bem-vindo ao Cash Management
          </h2>
          <p className={styles.subtitle}>
            Controle financeiro simples e elegante pro seu negócio.
          </p>
        </header>

        <form className={styles.body} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="fum-name" className={styles.label}>
              Nome do empreendimento
            </label>
            <input
              id="fum-name"
              className={styles.input}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ex: Salão da Maria"
              autoComplete="organization"
              autoFocus
              maxLength={48}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Tipo de negócio</label>
            <div className={styles.typeGrid}>
              {BUSINESS_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  data-active={type === t.value}
                  className={styles.typeBtn}
                  onClick={() => setType(t.value)}
                >
                  <span className={styles.typeIcon}>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.hint}>
            <span className={styles.hintIcon}>🔒</span>
            <span>
              Seus dados ficam <strong>só neste aparelho</strong> por padrão.
              Faça backup pelo menu pra não perder nada.
              {cloudAvailable && (
                <>
                  {" "}
                  Quer usar em mais de um aparelho? Você pode entrar com e-mail
                  depois.
                </>
              )}
            </span>
          </div>

          <div className={styles.actions}>
            {cloudAvailable && onWantsCloud ? (
              <div className={styles.actionsCol}>
                <button type="submit" className={styles.cta}>
                  Começar
                </button>
                <button
                  type="button"
                  className={styles.ctaGhost}
                  onClick={handleCloud}
                >
                  Começar e sincronizar entre aparelhos
                </button>
              </div>
            ) : (
              <button type="submit" className={styles.cta}>
                Começar
              </button>
            )}
            {initialBusiness?.name && (
              <button
                type="button"
                className={styles.ctaCancel}
                onClick={onClose}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
