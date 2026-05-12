import { useMemo } from "react";
import type { CalculatedRow, Client, Row } from "../types";
import { calcRow } from "../lib/calc";

export interface ClientStats {
  client: Client;
  /** Total bruto faturado com esse cliente. */
  ltv: number;
  /** Total líquido (após taxa e custo). */
  liq: number;
  /** Quantidade de lançamentos. */
  count: number;
  /** ISO date do último lançamento. null se nunca usado. */
  lastEntryAt: string | null;
  /** Ticket médio (bruto / count). 0 se sem lançamentos. */
  ticketMedio: number;
  /** Últimos atendimentos (mais recente primeiro), até 8 itens. */
  recentEntries: CalculatedRow[];
}

/**
 * Cruza clients[] com rows[] do empreendimento ativo pra produzir as
 * estatísticas por cliente. Match case-insensitive pelo nome.
 */
export function useClients(
  clients: Client[],
  rows: Row[],
  activeBusinessId: string,
): ClientStats[] {
  return useMemo(() => {
    if (!activeBusinessId) return [];

    const scopedClients = clients.filter(
      (c) => c.businessId === activeBusinessId,
    );
    const scopedRows = rows.filter((r) => r.businessId === activeBusinessId);

    // Pré-calcula líquido por linha
    const calced = scopedRows.map(calcRow);

    return scopedClients
      .map((client) => {
        const nameLower = client.name.trim().toLowerCase();
        const related = calced
          .filter(
            (r) =>
              r.cliente.trim().toLowerCase() === nameLower && r.v > 0,
          )
          .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));

        let ltv = 0;
        let liq = 0;
        for (const r of related) {
          ltv += r.v;
          liq += r.liq;
        }

        const count = related.length;
        const ticketMedio = count > 0 ? ltv / count : 0;
        const lastEntryAt = related[0]?.criadoEm ?? null;
        const recentEntries = related.slice(0, 8);

        return {
          client,
          ltv,
          liq,
          count,
          lastEntryAt,
          ticketMedio,
          recentEntries,
        };
      })
      .sort((a, b) => {
        // Sort: maior LTV primeiro, depois alfabético
        if (b.ltv !== a.ltv) return b.ltv - a.ltv;
        return a.client.name.localeCompare(b.client.name, "pt-BR");
      });
  }, [clients, rows, activeBusinessId]);
}
