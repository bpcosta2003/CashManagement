import { useMemo } from "react";
import type { Client, Row } from "../types";
import { calcRow } from "../lib/calc";

export interface ClientStats {
  client: Client;
  /** Total bruto faturado com esse cliente. */
  ltv: number;
  /** Total líquido (após taxa e custo). */
  liq: number;
  /** Quantidade de lançamentos. */
  count: number;
  /** ISO date do último lançamento (não confunde com lastUsedAt — esse
   *  é o lastUsed do cliente, pode ser diferente se o cliente foi
   *  cadastrado mas nunca usado em lançamento). */
  lastEntryAt: string | null;
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
        const related = calced.filter(
          (r) =>
            r.cliente.trim().toLowerCase() === nameLower && r.v > 0,
        );

        let ltv = 0;
        let liq = 0;
        let lastEntryAt: string | null = null;
        for (const r of related) {
          ltv += r.v;
          liq += r.liq;
          if (!lastEntryAt || r.criadoEm > lastEntryAt) {
            lastEntryAt = r.criadoEm;
          }
        }

        return {
          client,
          ltv,
          liq,
          count: related.length,
          lastEntryAt,
        };
      })
      .sort((a, b) => {
        // Sort: mais usados primeiro (LTV desc), depois alfabético
        if (b.ltv !== a.ltv) return b.ltv - a.ltv;
        return a.client.name.localeCompare(b.client.name, "pt-BR");
      });
  }, [clients, rows, activeBusinessId]);
}
