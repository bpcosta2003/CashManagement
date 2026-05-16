import { useMemo, useState } from "react";
import type { CatalogItem } from "../../types";
import { fmtBRL } from "../../lib/calc";
import { BrandMark } from "../layout/Brand";
import styles from "./CatalogView.module.css";

interface Props {
  items: CatalogItem[];
  /** add: name + valor opcional. Retorna sem feedback (otimista). */
  onAdd: (name: string, defaultValue?: number) => void;
  onUpdate: (
    id: string,
    patch: { name?: string; defaultValue?: number },
  ) => void;
  onDelete: (id: string) => void;
}

/**
 * Aba dedicada do catálogo de serviços/produtos.
 * Visual e UX espelham a aba Clientes — busca no topo, lista
 * editável inline, sheet pra cadastrar novo.
 *
 * Cada item: nome (editável) + valor padrão (editável). Os valores
 * são usados como sugestão automática no ServicoCombobox do
 * EntryForm — assim os nomes ficam consistentes nos relatórios.
 */
export function CatalogView({ items, onAdd, onUpdate, onDelete }: Props) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...items].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    );
    if (!q) return sorted;
    return sorted.filter((c) => c.name.toLowerCase().includes(q));
  }, [items, query]);

  const total = items.length;

  const handleAdd = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    const value = newValue ? Number(newValue.replace(",", ".")) : undefined;
    onAdd(trimmed, value && value > 0 ? value : undefined);
    setNewName("");
    setNewValue("");
    setAdding(false);
  };

  const handleDelete = (id: string, name: string) => {
    const ok = window.confirm(
      `Remover "${name}" do catálogo?\n\nOs lançamentos antigos com esse nome não serão alterados — só a sugestão é apagada.`,
    );
    if (!ok) return;
    onDelete(id);
  };

  // ─── Empty inicial — sem nenhum item ────────────────────────
  if (total === 0 && !adding) {
    return (
      <section className={styles.section} aria-label="Catálogo" data-tour="catalog-tab">
        <div className={styles.empty}>
          <div className={styles.emptyArt} aria-hidden="true">
            <BrandMark size={64} />
          </div>
          <span className={styles.emptyTitle}>
            Catálogo vazio
          </span>
          <p className={styles.emptyText}>
            Cadastre seus serviços ou produtos recorrentes — eles aparecem
            como sugestão ao criar lançamentos e mantêm a grafia
            consistente nos relatórios.
          </p>
          <button
            type="button"
            className={styles.emptyCta}
            onClick={() => setAdding(true)}
          >
            + Adicionar primeiro item
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section} aria-label="Catálogo">
      <div className={styles.shell}>
        <header className={styles.head}>
          <span className={styles.title}>
            Catálogo
            {total > 0 && (
              <span className={styles.count}>· {total}</span>
            )}
          </span>
          <div className={styles.search}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={styles.searchIcon}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Buscar serviço/produto"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => setAdding(true)}
            aria-label="Novo item"
          >
            <svg
              width="14"
              height="14"
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
            <span className={styles.addBtnLabel}>Novo</span>
          </button>
        </header>

        {adding && (
          <form className={styles.addRow} onSubmit={handleAdd}>
            <input
              autoFocus
              className={styles.input}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome do serviço/produto"
              aria-label="Nome"
            />
            <input
              className={`${styles.input} ${styles.valueInput}`}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="R$"
              inputMode="decimal"
              aria-label="Valor padrão"
            />
            <button
              type="submit"
              className={styles.addRowPrimary}
              disabled={!newName.trim()}
            >
              Adicionar
            </button>
            <button
              type="button"
              className={styles.addRowSecondary}
              onClick={() => {
                setAdding(false);
                setNewName("");
                setNewValue("");
              }}
            >
              Cancelar
            </button>
          </form>
        )}

        {filtered.length === 0 && total > 0 ? (
          <div className={styles.noResults}>
            Nenhum item encontrado para "{query}"
          </div>
        ) : (
          <ul className={styles.list}>
            {filtered.map((item) =>
              editingId === item.id ? (
                <CatalogEditRow
                  key={item.id}
                  item={item}
                  onSave={(patch) => {
                    onUpdate(item.id, patch);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <li key={item.id} className={styles.item}>
                  <button
                    type="button"
                    className={styles.itemBody}
                    onClick={() => setEditingId(item.id)}
                    aria-label={`Editar ${item.name}`}
                  >
                    <span className={styles.itemName}>{item.name}</span>
                    <span className={styles.itemValue}>
                      {typeof item.defaultValue === "number" &&
                      item.defaultValue > 0
                        ? fmtBRL(item.defaultValue)
                        : "—"}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.itemDelete}
                    onClick={() => handleDelete(item.id, item.name)}
                    aria-label={`Remover ${item.name}`}
                    title="Remover"
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
                      aria-hidden="true"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </section>
  );
}

interface EditRowProps {
  item: CatalogItem;
  onSave: (patch: { name?: string; defaultValue?: number }) => void;
  onCancel: () => void;
}

function CatalogEditRow({ item, onSave, onCancel }: EditRowProps) {
  const [name, setName] = useState(item.name);
  const [value, setValue] = useState(
    typeof item.defaultValue === "number" ? String(item.defaultValue) : "",
  );

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      onCancel();
      return;
    }
    const parsed = value ? Number(value.replace(",", ".")) : undefined;
    onSave({
      name: trimmed,
      defaultValue: parsed && parsed > 0 ? parsed : undefined,
    });
  };

  return (
    <li className={`${styles.item} ${styles.itemEditing}`}>
      <div className={styles.editRow}>
        <input
          autoFocus
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") onCancel();
          }}
        />
        <input
          className={`${styles.input} ${styles.valueInput}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode="decimal"
          placeholder="R$"
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") onCancel();
          }}
        />
        <button
          type="button"
          className={styles.addRowPrimary}
          onClick={save}
          disabled={!name.trim()}
        >
          Salvar
        </button>
        <button
          type="button"
          className={styles.addRowSecondary}
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </li>
  );
}
