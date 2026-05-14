import { useEffect, useRef, useState } from "react";
import type { CatalogItem } from "../../types";
import { fmtBRL } from "../../lib/calc";
import styles from "./ClientCombobox.module.css";

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Catálogo do empreendimento ativo, ordenado pelo uso mais recente. */
  catalog: CatalogItem[];
  /**
   * Chamado quando o usuário seleciona um item da lista. Recebe o item
   * completo pra o consumidor poder auto-popular outros campos (ex: valor).
   */
  onPickItem: (item: CatalogItem) => void;
  placeholder?: string;
}

/**
 * Combobox de serviço/produto — gêmeo do ClientCombobox.
 * Aceita texto livre (cadastra ao salvar) OU seleção do catálogo.
 * Ao escolher um item com defaultValue, o consumidor decide como aplicar.
 */
export function ServicoCombobox({
  id,
  value,
  onChange,
  catalog,
  onPickItem,
  placeholder,
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const query = value.trim().toLowerCase();
  const suggestions = catalog
    .filter((c) => !query || c.name.toLowerCase().includes(query))
    .sort((a, b) => (a.lastUsedAt < b.lastUsedAt ? 1 : -1))
    .slice(0, 8);

  // Match exato → mostra um selo "· catálogo" no input
  const matched = catalog.find(
    (c) => c.name.toLowerCase() === query && query.length > 0,
  );

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setHighlight(-1);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const select = (item: CatalogItem) => {
    onChange(item.name);
    onPickItem(item);
    setOpen(false);
    setHighlight(-1);
    inputRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlight((h) => Math.min(suggestions.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      if (open && highlight >= 0 && suggestions[highlight]) {
        e.preventDefault();
        select(suggestions[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlight(-1);
    }
  };

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        className={styles.input}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (!open) setOpen(true);
          setHighlight(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={id ? `${id}-listbox` : undefined}
        role="combobox"
      />
      {matched && (
        <span className={styles.matchBadge} aria-hidden="true">
          ✓ catálogo
        </span>
      )}
      {open && suggestions.length > 0 && (
        <ul
          id={id ? `${id}-listbox` : undefined}
          className={styles.list}
          role="listbox"
        >
          {suggestions.map((c, idx) => (
            <li
              key={c.id}
              className={`${styles.option} ${idx === highlight ? styles.optionActive : ""}`}
              role="option"
              aria-selected={idx === highlight}
              onMouseDown={(e) => {
                e.preventDefault();
                select(c);
              }}
              onMouseEnter={() => setHighlight(idx)}
            >
              <span className={styles.optionName}>{c.name}</span>
              {typeof c.defaultValue === "number" && c.defaultValue > 0 && (
                <span className={styles.optionPhone}>
                  {fmtBRL(c.defaultValue)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
