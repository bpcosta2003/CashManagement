import { useState } from "react";
import type { Client } from "../../types";
import styles from "./ClientForm.module.css";

interface Props {
  initial: Client;
  onSave: (patch: { name: string; phone?: string }) => void;
  onCancel: () => void;
}

export function ClientForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Informe o nome do cliente");
      return;
    }
    onSave({ name: trimmed, phone: phone.trim() });
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.field}>
        <label htmlFor="cf-name" className={styles.label}>
          Nome <span className={styles.required}>*</span>
        </label>
        <input
          id="cf-name"
          className={`${styles.input} ${error ? styles.inputError : ""}`}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Nome do cliente"
          autoFocus
          autoComplete="off"
        />
        {error && <span className={styles.errorMsg}>{error}</span>}
      </div>

      <div className={styles.field}>
        <label htmlFor="cf-phone" className={styles.label}>
          Telefone <span className={styles.labelHint}>· opcional</span>
        </label>
        <input
          id="cf-phone"
          className={styles.input}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(11) 90000-0000"
          inputMode="tel"
          type="tel"
          autoComplete="tel"
          maxLength={20}
        />
      </div>

      <div className={styles.hint}>
        Renomear o cliente aqui <strong>não</strong> renomeia o nome nos
        lançamentos antigos. Para corrigir, edite cada lançamento individual.
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button type="submit" className={styles.btnPrimary}>
          Salvar
        </button>
      </div>
    </form>
  );
}
