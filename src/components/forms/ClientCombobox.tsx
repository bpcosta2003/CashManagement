import { useEffect, useRef, useState } from "react";
import type { Client } from "../../types";
import styles from "./ClientCombobox.module.css";

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Match exato com algum cliente — usado pra mostrar selo "· cadastrado". */
  matchedClient: Client | null;
  clients: Client[];
  placeholder?: string;
  invalid?: boolean;
  errorId?: string;
  autoFocus?: boolean;
}

/**
 * Combobox híbrido: aceita digitar livre (cliente novo) OU selecionar
 * da lista (cliente recorrente). Sugestões filtram conforme digita,
 * com navegação por teclado (↑↓ Enter Esc).
 */
export function ClientCombobox({
  id,
  value,
  onChange,
  matchedClient,
  clients,
  placeholder,
  invalid,
  errorId,
  autoFocus,
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lista filtrada — match case-insensitive em qualquer parte do nome
  // ou telefone. Limita a 8 sugestões.
  const query = value.trim().toLowerCase();
  const suggestions = clients
    .filter((c) => {
      if (!query) return true;
      return (
        c.name.toLowerCase().includes(query) ||
        (c.phone ?? "").toLowerCase().includes(query)
      );
    })
    .sort((a, b) => (a.lastUsedAt < b.lastUsedAt ? 1 : -1))
    .slice(0, 8);

  // Fecha ao clicar fora
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

  const handleSelect = (name: string) => {
    onChange(name);
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
        handleSelect(suggestions[highlight].name);
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
        className={`${styles.input} ${invalid ? styles.inputError : ""}`}
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
        autoFocus={autoFocus}
        aria-invalid={!!invalid}
        aria-describedby={errorId}
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={id ? `${id}-listbox` : undefined}
        role="combobox"
      />
      {matchedClient && (
        <span className={styles.matchBadge} aria-hidden="true">
          ✓ cadastrado
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
                // mousedown pra não disparar blur antes do click
                e.preventDefault();
                handleSelect(c.name);
              }}
              onMouseEnter={() => setHighlight(idx)}
            >
              <span className={styles.optionName}>{c.name}</span>
              {c.phone && (
                <span className={styles.optionPhone}>{c.phone}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
