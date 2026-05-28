import { useMemo } from "react";
import type { CalculatedRow, Row } from "../types";
import { MESES_SHORT } from "../constants";
import { calcRow, rowParts } from "../lib/calc";

export interface MonthBucket {
  m: number;
  label: string;
  rows: CalculatedRow[];
  bruto: number;
  liq: number;
  taxas: number;
  custos: number;
  count: number;
}

export interface AnnualBreakdown {
  count: number;
  bruto: number;
  liq: number;
}

export interface ServiceStat {
  name: string;
  count: number;
  bruto: number;
}

export interface ClientStat {
  name: string;
  /** Quantidade de lançamentos do cliente no ano. */
  count: number;
  /** Total bruto faturado com o cliente no ano (LTV do ano). */
  ltv: number;
  /** Ticket médio = ltv / count. */
  ticketMedio: number;
}

export interface AnnualSummary {
  year: number;
  total: {
    bruto: number;
    descontos: number;
    taxas: number;
    custos: number;
    liq: number;
    margem: number;
    count: number;
  };
  monthly: MonthBucket[];
  paymentBreakdown: Record<string, AnnualBreakdown>;
  best: MonthBucket | null;
  worst: MonthBucket | null;
  /** Líquido do ano anterior (mesmo business). null se sem dados. */
  prevYearLiq: number | null;
  liqDelta: number | null;
  /** Top serviços do ano por bruto, agrupados case-insensitive. */
  topServicos: ServiceStat[];
  /** Top clientes do ano por bruto faturado, agrupados case-insensitive. */
  topClientes: ClientStat[];
}

export function useAnnual(
  rows: Row[],
  ano: number,
  activeBusinessId: string,
  taxaFixaPct = 0,
): AnnualSummary {
  return useMemo(() => {
    const scoped = activeBusinessId
      ? rows.filter((r) => r.businessId === activeBusinessId)
      : rows;

    const calc = scoped.map((r) => calcRow(r, { taxaFixaPct }));

    // 12 buckets vazios
    const monthly: MonthBucket[] = Array.from({ length: 12 }, (_, m) => ({
      m,
      label: MESES_SHORT[m],
      rows: [],
      bruto: 0,
      liq: 0,
      taxas: 0,
      custos: 0,
      count: 0,
    }));

    let totalBruto = 0;
    let totalDesc = 0;
    let totalTaxas = 0;
    let totalCustos = 0;
    let totalLiq = 0;
    let totalCount = 0;

    const paymentBreakdown: Record<string, AnnualBreakdown> = {
      Dinheiro: { count: 0, bruto: 0, liq: 0 },
      Pix: { count: 0, bruto: 0, liq: 0 },
      Débito: { count: 0, bruto: 0, liq: 0 },
      Crédito: { count: 0, bruto: 0, liq: 0 },
    };

    // Top serviços (case-insensitive, mantém o casing mais usado)
    const servicosMap = new Map<
      string,
      { name: string; count: number; bruto: number }
    >();

    // Top clientes (case-insensitive). Ignora lançamentos sem cliente.
    const clientesMap = new Map<
      string,
      { name: string; count: number; bruto: number }
    >();

    calc
      .filter((r) => r.ano === ano && r.v > 0)
      .forEach((r) => {
        // "taxas" agrega todas as deduções percentuais (cartão + negócio
        // + auxiliar), espelhando o resumo mensal. Custo é categoria à
        // parte (material/insumo, não fee).
        const taxasRow = r.taxaVal + r.taxaFixaVal + r.auxiliarVal;
        const bucket = monthly[r.mes];
        bucket.rows.push(r);
        bucket.bruto += r.v;
        bucket.liq += r.liq;
        bucket.taxas += taxasRow;
        bucket.custos += r.custoVal;
        bucket.count += 1;

        totalBruto += r.v;
        totalDesc += r.descontoVal;
        totalTaxas += taxasRow;
        totalCustos += r.custoVal;
        totalLiq += r.liq;
        totalCount += 1;

        // Top clientes: 1 lançamento = 1 atendimento contável, bruto
        // somado por cliente. Multi-item não desmembra (o cliente é o
        // mesmo pro lançamento inteiro).
        const cliNome = r.cliente.trim();
        if (cliNome) {
          const key = cliNome.toLowerCase();
          const c = clientesMap.get(key);
          if (c) {
            c.count += 1;
            c.bruto += r.v;
          } else {
            clientesMap.set(key, { name: cliNome, count: 1, bruto: r.v });
          }
        }

        // Por parte de pagamento: split distribui bruto/líquido entre as
        // formas; forma única conta a Row inteira numa só.
        rowParts(r).forEach((part) => {
          const bd = paymentBreakdown[part.forma];
          if (!bd) return;
          bd.count += 1;
          bd.bruto += part.bruto;
          bd.liq += part.liq;
        });

        // Top serviços: em multi-mode, cada item entra separado (count
        // por item, não por lançamento) pra refletir o mix real.
        const entriesForRanking: Array<{ name: string; valor: number }> =
          r.items && r.items.length > 0
            ? r.items.map((it) => ({
                name: it.name.trim(),
                valor: +it.valor || 0,
              }))
            : [{ name: r.servico.trim(), valor: r.v }];
        for (const e of entriesForRanking) {
          if (!e.name) continue;
          const key = e.name.toLowerCase();
          const entry = servicosMap.get(key);
          if (entry) {
            entry.count += 1;
            entry.bruto += e.valor;
          } else {
            servicosMap.set(key, { name: e.name, count: 1, bruto: e.valor });
          }
        }
      });

    const topServicos: ServiceStat[] = Array.from(servicosMap.values())
      .sort((a, b) => b.bruto - a.bruto)
      .slice(0, 5);

    const topClientes: ClientStat[] = Array.from(clientesMap.values())
      .sort((a, b) => b.bruto - a.bruto)
      .slice(0, 5)
      .map((c) => ({
        name: c.name,
        count: c.count,
        ltv: c.bruto,
        ticketMedio: c.count > 0 ? c.bruto / c.count : 0,
      }));

    // Best/worst — só meses com lançamentos
    const withData = monthly.filter((b) => b.count > 0);
    let best: MonthBucket | null = null;
    let worst: MonthBucket | null = null;
    for (const b of withData) {
      if (!best || b.liq > best.liq) best = b;
      if (!worst || b.liq < worst.liq) worst = b;
    }
    if (withData.length < 2) worst = null; // só faz sentido com 2+ meses

    // Comparação com ano anterior
    const prevRows = calc.filter((r) => r.ano === ano - 1 && r.v > 0);
    const prevYearLiq = prevRows.length > 0
      ? prevRows.reduce((s, r) => s + r.liq, 0)
      : null;

    const liqDelta =
      prevYearLiq !== null && Math.abs(prevYearLiq) > 0.01 && totalBruto > 0
        ? ((totalLiq - prevYearLiq) / Math.abs(prevYearLiq)) * 100
        : null;

    return {
      year: ano,
      total: {
        bruto: totalBruto,
        descontos: totalDesc,
        taxas: totalTaxas,
        custos: totalCustos,
        liq: totalLiq,
        margem: totalBruto > 0 ? (totalLiq / totalBruto) * 100 : 0,
        count: totalCount,
      },
      monthly,
      paymentBreakdown,
      best,
      worst,
      prevYearLiq,
      liqDelta,
      topServicos,
      topClientes,
    };
  }, [rows, ano, activeBusinessId, taxaFixaPct]);
}
