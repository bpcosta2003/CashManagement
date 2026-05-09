import { useMemo } from "react";
import type { CalculatedRow, ProjecaoMes, Row, Summary } from "../types";
import { addMes, calcRow } from "../lib/calc";
import { MESES_FULL } from "../constants";

export function useCalc(rows: Row[], mes: number, ano: number) {
  const allCalc = useMemo<CalculatedRow[]>(() => rows.map(calcRow), [rows]);

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

  // Projeção: somar parcelas futuras geradas a partir de TODAS as linhas de crédito
  const projecao = useMemo<ProjecaoMes[]>(() => {
    const buckets: Record<string, ProjecaoMes> = {};

    allCalc
      .filter((r) => r.forma === "Crédito" && r.v > 0)
      .forEach((r) => {
        const n = Math.max(1, r.parc || 1);
        for (let i = 1; i <= n; i++) {
          const { m, y } = addMes(r.mes, r.ano, i);
          // Apenas projeções >= mês corrente
          if (y < ano || (y === ano && m < mes)) continue;
          // E pula o mês corrente (mostramos isso no card "este mês")
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

  return { allCalc, monthRows, summary, paymentBreakdown, projecao };
}
