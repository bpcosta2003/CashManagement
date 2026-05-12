import { useMemo } from "react";
import type { Client, Row } from "../types";
import { MESES_FULL } from "../constants";
import { calcRow } from "../lib/calc";

export interface MonthActivity {
  m: number;
  y: number;
  label: string;
  entries: number;
  bruto: number;
  liq: number;
  newClients: string[];
  bestDay: { date: string; bruto: number } | null;
}

/**
 * Deriva uma "timeline" de atividade por mês a partir dos lançamentos
 * e clientes do empreendimento ativo. Não armazena nada — só agrega.
 */
export function useActivity(
  rows: Row[],
  clients: Client[],
  ano: number,
  activeBusinessId: string,
): MonthActivity[] {
  return useMemo(() => {
    if (!activeBusinessId) return [];

    const scopedRows = rows.filter(
      (r) => r.businessId === activeBusinessId,
    );
    const scopedClients = clients.filter(
      (c) => c.businessId === activeBusinessId,
    );
    const calced = scopedRows.map(calcRow);

    // Inicializa 12 meses
    const buckets: MonthActivity[] = Array.from({ length: 12 }, (_, m) => ({
      m,
      y: ano,
      label: `${MESES_FULL[m]} ${ano}`,
      entries: 0,
      bruto: 0,
      liq: 0,
      newClients: [],
      bestDay: null,
    }));

    // Agrega lançamentos do ano + melhor dia
    const dayBruto = new Map<string, number>(); // key: "YYYY-MM-DD"

    for (const r of calced) {
      if (r.ano !== ano || r.v <= 0) continue;
      const bucket = buckets[r.mes];
      bucket.entries += 1;
      bucket.bruto += r.v;
      bucket.liq += r.liq;

      // Dia (YYYY-MM-DD do criadoEm)
      const date = new Date(r.criadoEm);
      if (!Number.isNaN(date.getTime())) {
        const key = `${r.mes}-${String(date.getDate()).padStart(2, "0")}`;
        dayBruto.set(key, (dayBruto.get(key) ?? 0) + r.v);
      }
    }

    // Resolve melhor dia por mês
    for (const [key, bruto] of dayBruto.entries()) {
      const [m, day] = key.split("-");
      const mi = Number(m);
      const bucket = buckets[mi];
      if (!bucket) continue;
      if (!bucket.bestDay || bruto > bucket.bestDay.bruto) {
        bucket.bestDay = {
          date: `${day}/${String(mi + 1).padStart(2, "0")}`,
          bruto,
        };
      }
    }

    // Clientes novos do ano (createdAt dentro do ano)
    for (const c of scopedClients) {
      const dt = new Date(c.createdAt);
      if (Number.isNaN(dt.getTime())) continue;
      if (dt.getFullYear() !== ano) continue;
      const m = dt.getMonth();
      buckets[m].newClients.push(c.name);
    }

    // Só retorna meses com atividade — em ordem cronológica reversa
    // (mês mais recente em cima)
    return buckets
      .filter((b) => b.entries > 0 || b.newClients.length > 0)
      .sort((a, b) => b.m - a.m);
  }, [rows, clients, ano, activeBusinessId]);
}
