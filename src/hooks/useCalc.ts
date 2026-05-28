import { useMemo } from "react";
import type { CalculatedRow, ProjecaoMes, Row, Summary } from "../types";
import { addMes, calcRow, rowParts } from "../lib/calc";
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
  taxaFixaPct = 0,
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
    () => scopedRows.map((r) => calcRow(r, { taxaFixaPct })),
    [scopedRows, taxaFixaPct],
  );

  const monthRows = useMemo<CalculatedRow[]>(
    () => allCalc.filter((r) => r.mes === mes && r.ano === ano),
    [allCalc, mes, ano],
  );

  const summary = useMemo<Summary>(() => {
    const valid = monthRows.filter((r) => r.v > 0);
    const bruto = valid.reduce((s, r) => s + r.v, 0);
    const descontos = valid.reduce((s, r) => s + r.descontoVal, 0);
    // "Taxas" agrega TODAS as deduções percentuais: taxa do cartão +
    // taxa do negócio + auxiliar. Manter separado escondia parte da
    // mordida real — quem olha o resumo precisa ver tudo que saiu via
    // "taxa de algum tipo" num só lugar. Custos ficam à parte por
    // serem categoria diferente (material/insumo, não fee).
    const taxas = valid.reduce(
      (s, r) => s + r.taxaVal + r.taxaFixaVal + r.auxiliarVal,
      0,
    );
    const custos = valid.reduce((s, r) => s + r.custoVal, 0);
    const liq = valid.reduce((s, r) => s + r.liq, 0);
    const margem = bruto ? (liq / bruto) * 100 : 0;

    let estesMes = 0;
    let futuro = 0;
    valid.forEach((r) => {
      // Por parte: a fatia no crédito é futuro; o resto é deste mês.
      rowParts(r).forEach((part) => {
        if (part.forma !== "Crédito") estesMes += part.liq;
        else futuro += part.liq;
      });
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
        rowParts(r).forEach((part) => {
          const bucket = map[part.forma];
          if (!bucket) return;
          bucket.count++;
          bucket.bruto += part.bruto;
          bucket.liq += part.liq;
        });
      });
    return map;
  }, [monthRows]);

  const projecao = useMemo<ProjecaoMes[]>(() => {
    const buckets: Record<string, ProjecaoMes> = {};

    allCalc
      .filter((r) => r.v > 0)
      .forEach((r) => {
        // Só a parte no crédito projeta. Em forma única é a Row inteira;
        // em múltiplo, apenas a fatia paga no crédito (com suas parcelas).
        rowParts(r).forEach((part) => {
          if (part.forma !== "Crédito") return;
          const n = Math.max(1, part.parc || 1);
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
            const bruto = part.vef / n;
            const liq = part.liq / n;
            bucket.bruto += bruto;
            bucket.taxa += part.taxaVal / n;
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
