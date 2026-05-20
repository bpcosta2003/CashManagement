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
  while (nm < 0) {
    nm += 12;
    ny--;
  }
  return { m: nm, y: ny };
}

/**
 * Calcula totais e líquido de um lançamento, considerando:
 *   1. Valor bruto (preço)
 *   2. Desconto → valor efetivo (vef)
 *   3. Taxa do cartão (% sobre vef)
 *   4. Custo absoluto do serviço
 *   5. Taxa fixa do negócio (% sobre subtotal após custo) — passa por opts
 *   6. Auxiliar do serviço (% sobre subtotal após taxa fixa) — vem do row
 *
 * Líquido final = vef − taxaVal − custo − taxaFixaVal − auxiliarVal.
 * A margem é calculada sobre o bruto (valor), preservando o significado
 * histórico ("quanto sobra de cada real vendido"). Bruto NÃO muda — taxa
 * fixa e auxiliar reduzem o que sobra, não o que entrou.
 */
export function calcRow(
  r: Row,
  opts?: { taxaFixaPct?: number },
): CalculatedRow {
  const v = +r.valor || 0;
  const d = Math.min(+r.desconto || 0, v);
  const vef = v - d;
  const t = (vef * (+r.taxa || 0)) / 100;
  const c = +r.custo || 0;
  const afterCost = vef - t - c;

  // Preferência: snapshot carimbado no Row (preserva histórico) →
  // fallback pra taxa fixa atual do negócio (lançamentos pré-feature).
  const rawPct =
    r.taxaFixaPctSnapshot !== undefined
      ? r.taxaFixaPctSnapshot
      : (opts?.taxaFixaPct ?? 0);
  const taxaFixaPct = Math.max(0, Math.min(100, +rawPct || 0));
  const taxaFixaVal = (afterCost * taxaFixaPct) / 100;
  const afterTaxaFixa = afterCost - taxaFixaVal;

  const auxPct = Math.max(0, Math.min(100, +(r.auxiliarPct || 0)));
  const auxiliarVal = (afterTaxaFixa * auxPct) / 100;
  const liq = afterTaxaFixa - auxiliarVal;

  return {
    ...r,
    v,
    descontoVal: d,
    vef,
    taxaVal: t,
    custoVal: c,
    taxaFixaVal,
    auxiliarVal,
    liq,
    mar: v ? (liq / v) * 100 : 0,
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
