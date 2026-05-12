import { useMemo, useState } from "react";
import type { Client } from "../../types";
import type { ClientStats } from "../../hooks/useClients";
import { fmtBRL } from "../../lib/calc";
import { BrandMark } from "../layout/Brand";
import { Sheet } from "../forms/Sheet";
import { ClientForm } from "./ClientForm";
import styles from "./ClientsView.module.css";

interface EditingState {
  client: Client;
  stats: ClientStats;
}

interface Props {
  clients: ClientStats[];
  onUpdate: (id: string, patch: Partial<Pick<Client, "name" | "phone">>) => void;
  onDelete: (id: string) => void;
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "—";
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const days = Math.floor((now - then) / (1000 * 60 * 60 * 24));
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  return `há ${years} ${years === 1 ? "ano" : "anos"}`;
}

export function ClientsView({ clients, onUpdate, onDelete }: Props) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<EditingState | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.client.name.toLowerCase().includes(q) ||
        (c.client.phone ?? "").toLowerCase().includes(q),
    );
  }, [clients, query]);

  const total = clients.length;

  const handleDelete = (id: string, name: string) => {
    const ok = window.confirm(
      `Apagar o cliente "${name}"?\n\nOs lançamentos com esse nome não serão apagados — só o registro do cliente.`,
    );
    if (!ok) return;
    onDelete(id);
  };

  if (total === 0) {
    return (
      <section className={styles.section} aria-label="Clientes">
        <div className={styles.empty}>
          <div className={styles.emptyArt} aria-hidden="true">
            <BrandMark size={64} />
          </div>
          <span className={styles.emptyTitle}>
            Nenhum cliente cadastrado ainda
          </span>
          <p className={styles.emptyText}>
            Os clientes são salvos automaticamente quando você lança um
            atendimento. Quanto mais lança, mais o autocomplete fica útil.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section} aria-label="Clientes">
      <div className={styles.shell}>
        <header className={styles.head}>
          <span className={styles.title}>
            Clientes <span className={styles.count}>· {total}</span>
          </span>
          {total > 4 && (
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
                placeholder="Buscar cliente"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          )}
        </header>

        {filtered.length === 0 ? (
          <div className={styles.noResults}>
            Nenhum cliente encontrado para "{query}"
          </div>
        ) : (
          <ul className={styles.list}>
            {filtered.map((stats) => {
              const { client, ltv, count, lastEntryAt } = stats;
              return (
              <li key={client.id} className={styles.item}>
                <button
                  type="button"
                  className={styles.itemBody}
                  onClick={() => setEditing({ client, stats })}
                  aria-label={`Editar ${client.name}`}
                >
                  <div className={styles.itemMain}>
                    <span className={styles.itemName}>{client.name}</span>
                    <span className={styles.itemMeta}>
                      {client.phone ? (
                        <>
                          <span className={styles.phone}>{client.phone}</span>
                          <span className={styles.dot}>·</span>
                        </>
                      ) : null}
                      {count > 0 ? (
                        <>
                          {count} atendimento{count === 1 ? "" : "s"}
                          <span className={styles.dot}>·</span>
                          {formatRelativeDate(lastEntryAt)}
                        </>
                      ) : (
                        "ainda não usado"
                      )}
                    </span>
                  </div>
                  <div className={styles.itemValue}>
                    <span
                      className={`${styles.ltv} ${ltv === 0 ? styles.ltvEmpty : ""}`}
                    >
                      {ltv > 0 ? fmtBRL(ltv) : "—"}
                    </span>
                    <span className={styles.ltvLabel}>LTV</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={styles.itemDelete}
                  onClick={() => handleDelete(client.id, client.name)}
                  aria-label={`Remover ${client.name}`}
                  title="Remover cliente"
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
              );
            })}
          </ul>
        )}
      </div>

      <Sheet
        open={!!editing}
        title={editing ? `Editar — ${editing.client.name}` : "Editar cliente"}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <ClientForm
            initial={editing.client}
            ltv={editing.stats.ltv}
            ticketMedio={editing.stats.ticketMedio}
            count={editing.stats.count}
            recentEntries={editing.stats.recentEntries}
            onSave={(patch) => {
              onUpdate(editing.client.id, patch);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Sheet>
    </section>
  );
}
