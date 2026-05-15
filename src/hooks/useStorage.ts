import { useCallback, useEffect, useState } from "react";
import type {
  AppSettings,
  AppState,
  Business,
  BusinessType,
  CatalogItem,
  Client,
  MonthGoal,
  Row,
} from "../types";
import { autoTaxa, uid } from "../lib/calc";
import { initialState, loadState, saveState } from "../lib/storage";

export function useStorage() {
  const [state, setState] = useState<AppState>(
    () => loadState() ?? initialState(),
  );

  useEffect(() => {
    saveState(state);
  }, [state]);

  const mutate = useCallback((apply: (prev: AppState) => AppState) => {
    setState((prev) => {
      const next = apply(prev);
      return { ...next, lastModified: new Date().toISOString() };
    });
  }, []);

  const setRows = useCallback(
    (updater: (rows: Row[]) => Row[]) => {
      mutate((prev) => ({ ...prev, rows: updater(prev.rows) }));
    },
    [mutate],
  );

  /* ── Rows ─────────────────────────────────────────────────────── */
  const addRow = useCallback(
    (init: Partial<Row> = {}) => {
      const id = uid();
      const newRow: Row = {
        id,
        businessId: state.activeBusinessId,
        cliente: "",
        servico: "",
        valor: "",
        forma: "Pix",
        parc: 1,
        taxa: 0,
        custo: "",
        desconto: "",
        status: "Pago",
        mes: new Date().getMonth(),
        ano: new Date().getFullYear(),
        criadoEm: new Date().toISOString(),
        ...init,
      };
      setRows((rows) => [...rows, newRow]);
      return id;
    },
    [setRows, state.activeBusinessId],
  );

  /** Adiciona um row já montado (usado quando o EntryForm cria do zero). */
  const commitRow = useCallback(
    (row: Row) => {
      const ensured: Row = {
        ...row,
        businessId: row.businessId || state.activeBusinessId,
      };
      setRows((rows) => [...rows, ensured]);
    },
    [setRows, state.activeBusinessId],
  );

  const updateRow = useCallback(
    (id: string, field: keyof Row, value: unknown) => {
      setRows((rows) =>
        rows.map((r) => {
          if (r.id !== id) return r;
          const u = { ...r, [field]: value } as Row;
          if (field === "forma") {
            u.taxa = autoTaxa(value as string, u.parc);
            if (value !== "Crédito") u.parc = 1;
          }
          if (field === "parc") {
            u.taxa = autoTaxa(u.forma, value as number);
          }
          return u;
        }),
      );
    },
    [setRows],
  );

  const deleteRow = useCallback(
    (id: string) => {
      setRows((rows) => rows.filter((r) => r.id !== id));
    },
    [setRows],
  );

  const replaceAllRows = useCallback(
    (rows: Row[]) => {
      setRows(() => rows);
    },
    [setRows],
  );

  const mergeRows = useCallback(
    (incoming: Row[]) => {
      setRows((existing) => {
        const existingIds = new Set(existing.map((r) => r.id));
        const newRows = incoming.filter((r) => !existingIds.has(r.id));
        return [...existing, ...newRows];
      });
    },
    [setRows],
  );

  const mergeClients = useCallback(
    (incoming: Client[]) => {
      mutate((prev) => {
        const byKey = new Map<string, Client>();
        // Existing first (preserva ids atuais)
        prev.clients.forEach((c) =>
          byKey.set(`${c.businessId}|${c.name.toLowerCase().trim()}`, c),
        );
        // Merge novos, atualizando lastUsedAt + phone se vazio
        incoming.forEach((c) => {
          const key = `${c.businessId}|${c.name.toLowerCase().trim()}`;
          const existing = byKey.get(key);
          if (existing) {
            byKey.set(key, {
              ...existing,
              phone: existing.phone ?? c.phone,
              lastUsedAt:
                c.lastUsedAt > existing.lastUsedAt
                  ? c.lastUsedAt
                  : existing.lastUsedAt,
            });
          } else {
            byKey.set(key, c);
          }
        });
        return { ...prev, clients: Array.from(byKey.values()) };
      });
    },
    [mutate],
  );

  const replaceAllClients = useCallback(
    (clients: Client[]) => {
      mutate((prev) => ({ ...prev, clients }));
    },
    [mutate],
  );

  /* ── Businesses ───────────────────────────────────────────────── */
  const addBusiness = useCallback(
    (data: { name: string; type: BusinessType; logo?: string }) => {
      const id = uid();
      const newBusiness: Business = {
        id,
        name: data.name.trim(),
        type: data.type,
        createdAt: new Date().toISOString(),
        ...(data.logo ? { logo: data.logo } : {}),
      };
      mutate((prev) => ({
        ...prev,
        businesses: [...prev.businesses, newBusiness],
        // Se era o primeiro, já ativa
        activeBusinessId: prev.activeBusinessId || id,
      }));
      return id;
    },
    [mutate],
  );

  const updateBusiness = useCallback(
    (
      id: string,
      patch: Partial<Pick<Business, "name" | "type" | "logo">>,
    ) => {
      mutate((prev) => ({
        ...prev,
        businesses: prev.businesses.map((b) => {
          if (b.id !== id) return b;
          const next = { ...b, ...patch };
          // "logo: undefined" no patch significa remover a logo
          if ("logo" in patch && patch.logo === undefined) {
            const { logo: _drop, ...rest } = next;
            return rest;
          }
          return next;
        }),
      }));
    },
    [mutate],
  );

  const deleteBusiness = useCallback(
    (id: string) => {
      mutate((prev) => {
        const remaining = prev.businesses.filter((b) => b.id !== id);
        // Se apagou o ativo, troca pro primeiro restante (ou vazio)
        const newActive =
          prev.activeBusinessId === id
            ? (remaining[0]?.id ?? "")
            : prev.activeBusinessId;
        return {
          ...prev,
          businesses: remaining,
          activeBusinessId: newActive,
          // Remove rows + clients + catalog + goals órfãos
          rows: prev.rows.filter((r) => r.businessId !== id),
          clients: prev.clients.filter((c) => c.businessId !== id),
          catalog: prev.catalog.filter((c) => c.businessId !== id),
          goals: prev.goals.filter((g) => g.businessId !== id),
        };
      });
    },
    [mutate],
  );

  const setActiveBusinessId = useCallback(
    (id: string) => {
      mutate((prev) => ({ ...prev, activeBusinessId: id }));
    },
    [mutate],
  );

  /* ── Clients ──────────────────────────────────────────────────── */

  /** Cria ou atualiza um cliente do empreendimento ativo a partir do nome.
   *  Match case-insensitive. Atualiza lastUsedAt + phone (se fornecido). */
  const upsertClient = useCallback(
    (name: string, phone?: string): string | null => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const businessId = state.activeBusinessId;
      if (!businessId) return null;

      const now = new Date().toISOString();
      const phoneTrim = phone?.trim() || undefined;

      const existing = state.clients.find(
        (c) =>
          c.businessId === businessId &&
          c.name.toLowerCase() === trimmed.toLowerCase(),
      );

      if (existing) {
        mutate((prev) => ({
          ...prev,
          clients: prev.clients.map((c) =>
            c.id === existing.id
              ? {
                  ...c,
                  name: trimmed, // mantém capitalização mais recente
                  phone: phoneTrim ?? c.phone,
                  lastUsedAt: now,
                }
              : c,
          ),
        }));
        return existing.id;
      }

      const newId = uid();
      const newClient: Client = {
        id: newId,
        businessId,
        name: trimmed,
        phone: phoneTrim,
        lastUsedAt: now,
        createdAt: now,
      };
      mutate((prev) => ({
        ...prev,
        clients: [...prev.clients, newClient],
      }));
      return newId;
    },
    [mutate, state.activeBusinessId, state.clients],
  );

  const updateClient = useCallback(
    (id: string, patch: Partial<Pick<Client, "name" | "phone">>) => {
      mutate((prev) => ({
        ...prev,
        clients: prev.clients.map((c) =>
          c.id === id
            ? {
                ...c,
                name: patch.name?.trim() ?? c.name,
                phone:
                  patch.phone !== undefined
                    ? patch.phone.trim() || undefined
                    : c.phone,
              }
            : c,
        ),
      }));
    },
    [mutate],
  );

  const deleteClient = useCallback(
    (id: string) => {
      mutate((prev) => ({
        ...prev,
        clients: prev.clients.filter((c) => c.id !== id),
      }));
    },
    [mutate],
  );

  /* ── Catálogo ─────────────────────────────────────────────────── */

  /**
   * Cria ou atualiza um item do catálogo a partir do nome.
   * Match case-insensitive por (businessId, nome). Quando já existe,
   * atualiza lastUsedAt e — opcionalmente — o defaultValue.
   *
   * @param defaultValue valor sugerido. undefined = preserva o que tinha.
   * @param overrideDefaultValue true força sobrescrever o defaultValue
   *   mesmo se já houver um (use quando o usuário edita explicitamente).
   */
  const upsertCatalogItem = useCallback(
    (
      name: string,
      defaultValue?: number,
      overrideDefaultValue = false,
    ): string | null => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const businessId = state.activeBusinessId;
      if (!businessId) return null;
      const now = new Date().toISOString();

      const existing = state.catalog.find(
        (c) =>
          c.businessId === businessId &&
          c.name.toLowerCase() === trimmed.toLowerCase(),
      );
      if (existing) {
        mutate((prev) => ({
          ...prev,
          catalog: prev.catalog.map((c) =>
            c.id === existing.id
              ? {
                  ...c,
                  // Mantém a grafia mais recente — corrige acentos/case.
                  name: trimmed,
                  defaultValue: overrideDefaultValue
                    ? defaultValue
                    : (c.defaultValue ?? defaultValue),
                  lastUsedAt: now,
                }
              : c,
          ),
        }));
        return existing.id;
      }
      const newId = uid();
      const item: CatalogItem = {
        id: newId,
        businessId,
        name: trimmed,
        defaultValue,
        lastUsedAt: now,
        createdAt: now,
      };
      mutate((prev) => ({ ...prev, catalog: [...prev.catalog, item] }));
      return newId;
    },
    [mutate, state.activeBusinessId, state.catalog],
  );

  const updateCatalogItem = useCallback(
    (
      id: string,
      patch: Partial<Pick<CatalogItem, "name" | "defaultValue">>,
    ) => {
      mutate((prev) => ({
        ...prev,
        catalog: prev.catalog.map((c) => {
          if (c.id !== id) return c;
          const next: CatalogItem = { ...c };
          if (patch.name !== undefined) next.name = patch.name.trim();
          if ("defaultValue" in patch) next.defaultValue = patch.defaultValue;
          return next;
        }),
      }));
    },
    [mutate],
  );

  const deleteCatalogItem = useCallback(
    (id: string) => {
      mutate((prev) => ({
        ...prev,
        catalog: prev.catalog.filter((c) => c.id !== id),
      }));
    },
    [mutate],
  );

  /** Substitui o catálogo inteiro (usado por backup/restore e tour). */
  const replaceAllCatalog = useCallback(
    (catalog: CatalogItem[]) => {
      mutate((prev) => ({ ...prev, catalog }));
    },
    [mutate],
  );

  /** Mescla itens de catálogo evitando duplicados por (businessId, nome). */
  const mergeCatalog = useCallback(
    (incoming: CatalogItem[]) => {
      mutate((prev) => {
        const key = (c: CatalogItem) =>
          `${c.businessId}|${c.name.trim().toLowerCase()}`;
        const existingKeys = new Set(prev.catalog.map(key));
        const fresh = incoming.filter((c) => !existingKeys.has(key(c)));
        return { ...prev, catalog: [...prev.catalog, ...fresh] };
      });
    },
    [mutate],
  );

  /* ── Metas mensais ────────────────────────────────────────────── */

  /**
   * Cria ou atualiza a meta de (businessId, mes, ano).
   * Passar target<=0 ou NaN equivale a remover (cleanup).
   */
  const setMonthGoal = useCallback(
    (businessId: string, mes: number, ano: number, target: number) => {
      if (!businessId) return;
      const validTarget = Number.isFinite(target) && target > 0 ? target : 0;
      const now = new Date().toISOString();
      mutate((prev) => {
        const existing = prev.goals.find(
          (g) => g.businessId === businessId && g.mes === mes && g.ano === ano,
        );
        // target == 0 → remove
        if (validTarget === 0) {
          if (!existing) return prev;
          return {
            ...prev,
            goals: prev.goals.filter((g) => g.id !== existing.id),
          };
        }
        if (existing) {
          return {
            ...prev,
            goals: prev.goals.map((g) =>
              g.id === existing.id
                ? { ...g, target: validTarget, updatedAt: now }
                : g,
            ),
          };
        }
        const newGoal: MonthGoal = {
          id: uid(),
          businessId,
          mes,
          ano,
          target: validTarget,
          createdAt: now,
          updatedAt: now,
        };
        return { ...prev, goals: [...prev.goals, newGoal] };
      });
    },
    [mutate],
  );

  /* ── Settings ─────────────────────────────────────────────────── */
  const setSettings = useCallback(
    (update: Partial<AppSettings>) => {
      mutate((prev) => ({
        ...prev,
        settings: {
          autoBackupConsent: null,
          ...prev.settings,
          ...update,
        },
      }));
    },
    [mutate],
  );

  const replaceState = useCallback((next: AppState) => {
    setState(next);
  }, []);

  return {
    state,
    setRows,
    addRow,
    commitRow,
    updateRow,
    deleteRow,
    replaceAllRows,
    mergeRows,
    mergeClients,
    replaceAllClients,
    addBusiness,
    updateBusiness,
    deleteBusiness,
    setActiveBusinessId,
    upsertClient,
    updateClient,
    deleteClient,
    upsertCatalogItem,
    updateCatalogItem,
    deleteCatalogItem,
    mergeCatalog,
    replaceAllCatalog,
    setMonthGoal,
    setSettings,
    replaceState,
  };
}
