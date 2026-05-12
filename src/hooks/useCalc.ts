import { useMemo } from "react";
import type { CalculatedRow, ProjecaoMes, Row, Summary } from "../types";
import { addMes, calcRow } from "../lib/calc";
import { MESES_FULL, MESES_SHORT } from "../constants";

interface MonthLiq {
  m: number;
  y: number;
  label: string;
  liq: number;
  bruto: number;
}

export function useCalc(
  rows: Row[],
  mes: number,
  ano: number,
  activeBusinessId: string,
) {
  // Filtra primeiro pelo empreendimento ativo — todo o resto trabalha
  // só com os lançamentos desse business.
  const scopedRows = useMemo<Row[]>(
    () =>
      activeBusinessId
        ? rows.filter((r) => r.businessId === activeBusinessId)
        : rows,
    [rows, activeBusinessId],
  );

  const allCalc = useMemo<CalculatedRow[]>(
    () => scopedRows.map(calcRow),
    [scopedRows],
  );

  const monthRows = useMemo<CalculatedRow[]>(
    () => allCalc.filter((r) => r.mes === mes && r.ano === ano),
    [allCalc, mes, ano],
  );

  const summary = useMemo<Summary>(() => {
    const valid = monthRows.filter((r) => r.v > 0);
    const bruto = valid.reduce((s, r) => s + r.v, 0);
    const descontos = valid.reduce((s, r) => s + r.descontoVal, 0);
    const taxas = valid.reduce((s, r) => s + r.taxaVal, 0);
    const custos = valid.reduce((s, r) => s + r.custoVal, 0);
    const liq = valid.reduce((s, r) => s + r.liq, 0);
    const margem = bruto ? (liq / bruto) * 100 : 0;

    let estesMes = 0;
    let futuro = 0;
    valid.forEach((r) => {
      if (r.forma !== "Crédito") {
        estesMes += r.liq;
      } else {
        futuro += r.liq;
      }
    });

    return { bruto, descontos, taxas, custos, liq, margem, estesMes, futuro };
  }, [monthRows]);

  /** Líquido do mês anterior — base para a comparação "vs <mês>". */
  const prevMonthLiq = useMemo(() => {
    let pm = mes - 1;
    let py = ano;
    if (pm < 0) {
      pm = 11;
      py -= 1;
    }
    return allCalc
      .filter((r) => r.mes === pm && r.ano === py && r.v > 0)
      .reduce((s, r) => s + r.liq, 0);
  }, [allCalc, mes, ano]);

  const prevMonthLabel = useMemo(() => {
    let pm = mes - 1;
    if (pm < 0) pm = 11;
    return MESES_SHORT[pm].toLowerCase();
  }, [mes]);

  /**
   * Variação % do líquido vs. mês anterior.
   * Retorna null quando a comparação não faz sentido — i.e. um dos meses
   * está sem dados. Evita "↓ 100% vs. mai" confuso quando o usuário
   * abre o mês corrente que ainda está vazio.
   */
  const liqDelta = useMemo<number | null>(() => {
    if (summary.bruto < 0.01) return null;
    if (Math.abs(prevMonthLiq) < 0.01) return null;
    return ((summary.liq - prevMonthLiq) / Math.abs(prevMonthLiq)) * 100;
  }, [summary.bruto, prevMonthLiq, summary.liq]);

  /** Líquido dos últimos 6 meses até o mês corrente — base do sparkline. */
  const sparkline = useMemo<MonthLiq[]>(() => {
    const series: MonthLiq[] = [];
    for (let offset = -5; offset <= 0; offset++) {
      const { m, y } = addMes(mes, ano, offset);
      const monthLiq = allCalc
        .filter((r) => r.mes === m && r.ano === y && r.v > 0)
        .reduce((s, r) => s + r.liq, 0);
      const monthBruto = allCalc
        .filter((r) => r.mes === m && r.ano === y && r.v > 0)
        .reduce((s, r) => s + r.v, 0);
      series.push({
        m,
        y,
        label: MESES_SHORT[m].toLowerCase(),
        liq: monthLiq,
        bruto: monthBruto,
      });
    }
    return series;
  }, [allCalc, mes, ano]);

  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { count: number; bruto: number; liq: number }> = {
      Dinheiro: { count: 0, bruto: 0, liq: 0 },
      Pix: { count: 0, bruto: 0, liq: 0 },
      Débito: { count: 0, bruto: 0, liq: 0 },
      Crédito: { count: 0, bruto: 0, liq: 0 },
    };
    monthRows
      .filter((r) => r.v > 0)
      .forEach((r) => {
        map[r.forma].count++;
        map[r.forma].bruto += r.v;
        map[r.forma].liq += r.liq;
      });
    return map;
  }, [monthRows]);

  const projecao = useMemo<ProjecaoMes[]>(() => {
    const buckets: Record<string, ProjecaoMes> = {};

    allCalc
      .filter((r) => r.forma === "Crédito" && r.v > 0)
      .forEach((r) => {
        const n = Math.max(1, r.parc || 1);
        for (let i = 1; i <= n; i++) {
          const { m, y } = addMes(r.mes, r.ano, i);
          if (y < ano || (y === ano && m < mes)) continue;
          if (y === ano && m === mes) continue;
          const key = `${y}-${String(m).padStart(2, "0")}`;
          if (!buckets[key]) {
            buckets[key] = {
              m,
              y,
              lbl: `${MESES_FULL[m]}/${y}`,
              bruto: 0,
              taxa: 0,
              liq: 0,
              items: [],
            };
          }
          const bucket = buckets[key];
          const bruto = r.vef / n;
          const liq = r.liq / n;
          bucket.bruto += bruto;
          bucket.taxa += r.taxaVal / n;
          bucket.liq += liq;
          bucket.items.push({
            cliente: r.cliente || "—",
            servico: r.servico || "—",
            bruto,
            liq,
            label: n === 1 ? "Crédito à vista" : `Parcela ${i}/${n}`,
          });
        }
      });

    return Object.values(buckets).sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.m - b.m;
    });
  }, [allCalc, mes, ano]);

  return {
    allCalc,
    monthRows,
    summary,
    paymentBreakdown,
    projecao,
    prevMonthLiq,
    prevMonthLabel,
    liqDelta,
    sparkline,
  };
}
