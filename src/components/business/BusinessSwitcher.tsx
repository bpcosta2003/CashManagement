import { useRef, useState } from "react";
import type { Business, BusinessType } from "../../types";
import { resizeImageToDataUrl } from "../../lib/imageResize";
import styles from "./BusinessSwitcher.module.css";

interface Props {
  open: boolean;
  businesses: Business[];
  activeBusinessId: string;
  onClose: () => void;
  onSelect: (id: string) => void;
  onCreate: (data: {
    name: string;
    type: BusinessType;
    logo?: string;
  }) => string;
  onUpdate: (
    id: string,
    patch: Partial<Pick<Business, "name" | "type" | "logo">>,
  ) => void;
  onDelete: (id: string) => void;
}

type View =
  | { mode: "list" }
  | { mode: "create" }
  | { mode: "edit"; business: Business };

const BUSINESS_TYPES: { value: BusinessType; label: string; icon: string }[] = [
  { value: "salao", label: "Salão", icon: "💇" },
  { value: "restaurante", label: "Restaurante", icon: "🍽️" },
  { value: "comercio", label: "Comércio", icon: "🛍️" },
  { value: "servicos", label: "Serviços", icon: "🔧" },
  { value: "freelancer", label: "Freelancer", icon: "💼" },
  { value: "outro", label: "Outro", icon: "✨" },
];

const TYPE_LABEL: Record<BusinessType, string> = {
  salao: "Salão",
  restaurante: "Restaurante",
  comercio: "Comércio",
  servicos: "Serviços",
  freelancer: "Freelancer",
  outro: "Outro",
};

const TYPE_ICON: Record<BusinessType, string> = {
  salao: "💇",
  restaurante: "🍽️",
  comercio: "🛍️",
  servicos: "🔧",
  freelancer: "💼",
  outro: "✨",
};

export function BusinessSwitcher({
  open,
  businesses,
  activeBusinessId,
  onClose,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [view, setView] = useState<View>({ mode: "list" });

  if (!open) return null;

  const handleSelect = (id: string) => {
    onSelect(id);
    onClose();
  };

  const handleClose = () => {
    setView({ mode: "list" });
    onClose();
  };

  return (
    <div className={styles.backdrop} onClick={handleClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bs-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          {view.mode !== "list" && (
            <button
              className={styles.back}
              onClick={() => setView({ mode: "list" })}
              aria-label="Voltar"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          <h2 id="bs-title" className={styles.title}>
            {view.mode === "list"
              ? "Empreendimentos"
              : view.mode === "create"
                ? "Novo empreendimento"
                : "Editar empreendimento"}
          </h2>
          <button
            className={styles.close}
            onClick={handleClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        <div className={styles.body}>
          {view.mode === "list" && (
            <BusinessList
              businesses={businesses}
              activeId={activeBusinessId}
              onSelect={handleSelect}
              onEdit={(b) => setView({ mode: "edit", business: b })}
              onCreate={() => setView({ mode: "create" })}
            />
          )}

          {view.mode === "create" && (
            <BusinessForm
              onSubmit={(data) => {
                const id = onCreate({
                  name: data.name,
                  type: data.type,
                  logo: typeof data.logo === "string" ? data.logo : undefined,
                });
                onSelect(id);
                onClose();
                setView({ mode: "list" });
              }}
              onCancel={() => setView({ mode: "list" })}
            />
          )}

          {view.mode === "edit" && (
            <BusinessForm
              initial={view.business}
              onSubmit={(data) => {
                // logo: undefined = não mexer; null = remover
                const patch: Partial<
                  Pick<Business, "name" | "type" | "logo">
                > = { name: data.name, type: data.type };
                if (data.logo === null) {
                  patch.logo = undefined;
                } else if (typeof data.logo === "string") {
                  patch.logo = data.logo;
                }
                onUpdate(view.business.id, patch);
                setView({ mode: "list" });
              }}
              onCancel={() => setView({ mode: "list" })}
              onDelete={
                businesses.length > 1
                  ? () => {
                      const ok = window.confirm(
                        `Apagar "${view.business.name}" e todos os lançamentos desse empreendimento?\n\nEssa ação não pode ser desfeita.`,
                      );
                      if (!ok) return;
                      onDelete(view.business.id);
                      setView({ mode: "list" });
                    }
                  : undefined
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Lista de empreendimentos ─── */

interface ListProps {
  businesses: Business[];
  activeId: string;
  onSelect: (id: string) => void;
  onEdit: (b: Business) => void;
  onCreate: () => void;
}

function BusinessList({
  businesses,
  activeId,
  onSelect,
  onEdit,
  onCreate,
}: ListProps) {
  return (
    <>
      <ul className={styles.list}>
        {businesses.map((b) => {
          const active = b.id === activeId;
          return (
            <li key={b.id} className={styles.item} data-active={active}>
              <button
                type="button"
                className={styles.itemBody}
                onClick={() => onSelect(b.id)}
                aria-label={`Selecionar ${b.name}`}
              >
                <span className={styles.itemIcon} aria-hidden="true">
                  {b.logo ? (
                    <img
                      src={b.logo}
                      alt=""
                      className={styles.itemLogoImg}
                    />
                  ) : (
                    TYPE_ICON[b.type]
                  )}
                </span>
                <span className={styles.itemText}>
                  <span className={styles.itemName}>{b.name}</span>
                  <span className={styles.itemType}>{TYPE_LABEL[b.type]}</span>
                </span>
                {active && (
                  <span className={styles.itemCheck} aria-label="ativo">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </button>
              <button
                type="button"
                className={styles.itemEdit}
                onClick={() => onEdit(b)}
                aria-label={`Editar ${b.name}`}
                title="Editar"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className={styles.addBtn} onClick={onCreate}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Adicionar empreendimento
      </button>
    </>
  );
}

/* ─── Form de criação/edição ─── */

interface FormProps {
  initial?: Business;
  onSubmit: (data: {
    name: string;
    type: BusinessType;
    logo?: string | null;
  }) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

function BusinessForm({ initial, onSubmit, onCancel, onDelete }: FormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<BusinessType>(initial?.type ?? "salao");
  const [logo, setLogo] = useState<string | undefined>(initial?.logo);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Informe o nome do empreendimento");
      return;
    }
    // logo === undefined → não mexer; null → remover; string → atualizar
    const logoPatch =
      logo === initial?.logo ? undefined : logo === undefined ? null : logo;
    onSubmit({ name: trimmed, type, logo: logoPatch });
  };

  const handleLogoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLogoError(null);
    if (!file.type.startsWith("image/")) {
      setLogoError("Selecione um arquivo de imagem (PNG, JPG, etc.)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoError("Imagem muito grande — máx. 5 MB");
      return;
    }
    try {
      const dataUrl = await resizeImageToDataUrl(file, 256);
      setLogo(dataUrl);
    } catch (err) {
      setLogoError(
        err instanceof Error ? err.message : "Erro ao processar a imagem",
      );
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="bs-name" className={styles.label}>
          Nome
        </label>
        <input
          id="bs-name"
          className={`${styles.input} ${error ? styles.inputError : ""}`}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Ex: Salão da Maria"
          autoFocus
          maxLength={48}
        />
        {error && <span className={styles.errorMsg}>{error}</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Tipo</label>
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

      <div className={styles.field}>
        <label className={styles.label}>
          Logo <span className={styles.labelHint}>· opcional</span>
        </label>
        <div className={styles.logoRow}>
          <div className={styles.logoPreview} data-empty={!logo}>
            {logo ? (
              <img src={logo} alt="" className={styles.logoImg} />
            ) : (
              <span className={styles.logoPlaceholder}>—</span>
            )}
          </div>
          <div className={styles.logoActions}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => logoInputRef.current?.click()}
            >
              {logo ? "Trocar imagem" : "Escolher imagem"}
            </button>
            {logo && (
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => setLogo(undefined)}
              >
                Remover
              </button>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleLogoPick}
            />
          </div>
        </div>
        {logoError && <span className={styles.errorMsg}>{logoError}</span>}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={onCancel}
        >
          Cancelar
        </button>
        {onDelete && (
          <button
            type="button"
            className={styles.btnDanger}
            onClick={onDelete}
          >
            Excluir
          </button>
        )}
        <button type="submit" className={styles.btnPrimary}>
          {initial ? "Salvar" : "Criar"}
        </button>
      </div>
    </form>
  );
}
