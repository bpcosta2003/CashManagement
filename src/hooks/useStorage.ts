import { useCallback, useEffect, useState } from "react";
import type { AppState, Row } from "../types";
import { autoTaxa, uid } from "../lib/calc";
import { initialState, loadState, saveState } from "../lib/storage";

export function useStorage() {
  const [state, setState] = useState<AppState>(() => loadState() ?? initialState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const setRows = useCallback((updater: (rows: Row[]) => Row[]) => {
    setState((prev) => ({ ...prev, rows: updater(prev.rows) }));
  }, []);

  const addRow = useCallback(
    (init: Partial<Row> = {}) => {
      const id = uid();
      const newRow: Row = {
        id,
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
    [setRows],
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

  return { state, setRows, addRow, updateRow, deleteRow, replaceAllRows, mergeRows };
}
