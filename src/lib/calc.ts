import type { CalculatedRow, Row } from "../types";

export const uid = () => Math.random().toString(36).slice(2, 9);

export function autoTaxa(forma: string, parc: number | string): number {
  if (!forma || forma === "Dinheiro" || forma === "Pix") return 0;
  if (forma === "Débito") return 1.5;
  if (forma === "Crédito") {
    const p = +parc || 1;
    return p <= 1 ? 2.9 : p <= 6 ? 3.9 : 4.9;
  }
  return 0;
}

export function addMes(m: number, y: number, n: number) {
  let nm = m + n;
  let ny = y;
  while (nm > 11) {
    nm -= 12;
    ny++;
  }
  return { m: nm, y: ny };
}

export function calcRow(r: Row): CalculatedRow {
  const v = +r.valor || 0;
  const d = Math.min(+r.desconto || 0, v);
  const vef = v - d;
  const t = (vef * (+r.taxa || 0)) / 100;
  const c = +r.custo || 0;
  return {
    ...r,
    v,
    descontoVal: d,
    vef,
    taxaVal: t,
    custoVal: c,
    liq: vef - t - c,
    mar: v ? ((vef - t - c) / v) * 100 : 0,
  };
}

export function fmtBRL(n: number): string {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export interface RecInfo {
  thisMonth: number;
  future: { m: number; y: number; bruto: number; liq: number; label: string }[];
}

export function recInfo(r: CalculatedRow): RecInfo {
  if (r.forma !== "Crédito") {
    return { thisMonth: r.liq, future: [] };
  }
  const n = Math.max(1, r.parc || 1);
  if (n === 1) {
    const { m, y } = addMes(r.mes, r.ano, 1);
    return {
      thisMonth: 0,
      future: [{ m, y, bruto: r.vef, liq: r.liq, label: "Crédito à vista" }],
    };
  }
  const future = [];
  for (let i = 1; i <= n; i++) {
    const { m, y } = addMes(r.mes, r.ano, i);
    future.push({
      m,
      y,
      bruto: r.vef / n,
      liq: r.liq / n,
      label: `Parcela ${i}/${n}`,
    });
  }
  return { thisMonth: 0, future };
}
