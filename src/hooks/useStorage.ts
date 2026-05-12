import { useCallback, useEffect, useState } from "react";
import type {
  AppSettings,
  AppState,
  Business,
  BusinessType,
  Client,
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

  /* ── Businesses ───────────────────────────────────────────────── */
  const addBusiness = useCallback(
    (data: { name: string; type: BusinessType }) => {
      const id = uid();
      const newBusiness: Business = {
        id,
        name: data.name.trim(),
        type: data.type,
        createdAt: new Date().toISOString(),
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
    (id: string, patch: Partial<Pick<Business, "name" | "type">>) => {
      mutate((prev) => ({
        ...prev,
        businesses: prev.businesses.map((b) =>
          b.id === id ? { ...b, ...patch } : b,
        ),
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
          // Remove rows + clients órfãos
          rows: prev.rows.filter((r) => r.businessId !== id),
          clients: prev.clients.filter((c) => c.businessId !== id),
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
    addBusiness,
    updateBusiness,
    deleteBusiness,
    setActiveBusinessId,
    upsertClient,
    updateClient,
    deleteClient,
    setSettings,
    replaceState,
  };
}
