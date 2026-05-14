import { useState } from "react";
import type { CatalogItem } from "../../types";
import { fmtBRL } from "../../lib/calc";
import styles from "./CatalogManager.module.css";

interface Props {
  /** Itens do catálogo do empreendimento ativo (já filtrados). */
  items: CatalogItem[];
  onAdd: (name: string, defaultValue?: number) => void;
  onUpdate: (
    id: string,
    patch: { name?: string; defaultValue?: number },
  ) => void;
  onDelete: (id: string) => void;
}

/**
 * Lista + form inline pra gerenciar o catálogo de serviços/produtos.
 * Mostra: input "Novo item" → lista (cada linha: nome editável, valor
 * editável, botão excluir).
 *
 * Renderizado dentro do SettingsModal, na seção "Catálogo".
 */
export function CatalogManager({
  items,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");

  const submitNew = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    const value = newValue ? Number(newValue.replace(",", ".")) : undefined;
    onAdd(trimmed, value && value > 0 ? value : undefined);
    setNewName("");
    setNewValue("");
  };

  const sorted = [...items].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR"),
  );

  return (
    <div className={styles.wrap}>
      <form className={styles.addRow} onSubmit={submitNew}>
        <input
          className={styles.input}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome do serviço/produto"
          aria-label="Nome do serviço ou produto"
        />
        <input
          className={`${styles.input} ${styles.valueInput}`}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="R$"
          inputMode="decimal"
          type="text"
          aria-label="Valor padrão"
        />
        <button
          type="submit"
          className={styles.addBtn}
          disabled={!newName.trim()}
        >
          Adicionar
        </button>
      </form>

      {sorted.length === 0 ? (
        <p className={styles.empty}>
          Nenhum item ainda. Lance um serviço novo ou cadastre aqui — eles
          vão aparecer como sugestões ao criar lançamentos.
        </p>
      ) : (
        <ul className={styles.list}>
          {sorted.map((c) => (
            <CatalogRow
              key={c.id}
              item={c}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CatalogRow({
  item,
  onUpdate,
  onDelete,
}: {
  item: CatalogItem;
  onUpdate: Props["onUpdate"];
  onDelete: Props["onDelete"];
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [value, setValue] = useState(
    typeof item.defaultValue === "number" ? String(item.defaultValue) : "",
  );

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(item.name);
      setEditing(false);
      return;
    }
    const parsedValue = value
      ? Number(value.replace(",", "."))
      : undefined;
    onUpdate(item.id, {
      name: trimmed,
      defaultValue: parsedValue && parsedValue > 0 ? parsedValue : undefined,
    });
    setEditing(false);
  };

  const cancel = () => {
    setName(item.name);
    setValue(
      typeof item.defaultValue === "number" ? String(item.defaultValue) : "",
    );
    setEditing(false);
  };

  if (editing) {
    return (
      <li className={`${styles.row} ${styles.rowEditing}`}>
        <input
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <input
          className={`${styles.input} ${styles.valueInput}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode="decimal"
          placeholder="R$"
        />
        <div className={styles.rowActions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={save}
            aria-label="Salvar"
            title="Salvar"
          >
            ✓
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={cancel}
            aria-label="Cancelar"
            title="Cancelar"
          >
            ×
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className={styles.row}>
      <span className={styles.name}>{item.name}</span>
      <span className={styles.value}>
        {typeof item.defaultValue === "number" && item.defaultValue > 0
          ? fmtBRL(item.defaultValue)
          : "—"}
      </span>
      <div className={styles.rowActions}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => setEditing(true)}
          aria-label="Editar"
          title="Editar"
        >
          ✎
        </button>
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
          onClick={() => {
            if (confirm(`Remover "${item.name}" do catálogo?`)) {
              onDelete(item.id);
            }
          }}
          aria-label="Remover"
          title="Remover"
        >
          🗑
        </button>
      </div>
    </li>
  );
}
