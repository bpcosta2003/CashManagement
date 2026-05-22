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
 *   3. Taxa fixa do negócio (% sobre vef) — passa por opts ou snapshot do row
 *   4. Taxa do cartão (% sobre o subtotal pós taxa do negócio)
 *   5. Custo absoluto do serviço
 *   6. Auxiliar do serviço (% sobre vef — base sempre o valor efetivo,
 *      independente das outras deduções na cadeia)
 *
 * Líquido = vef − taxaFixaVal − taxaVal − custo − auxiliarVal.
 *
 * A margem é calculada sobre o bruto (valor), preservando o significado
 * histórico ("quanto sobra de cada real vendido"). Bruto NÃO muda — todas
 * as deduções reduzem o que sobra, não o que entrou.
 */
export function calcRow(
  r: Row,
  opts?: { taxaFixaPct?: number },
): CalculatedRow {
  const v = +r.valor || 0;
  const d = Math.min(+r.desconto || 0, v);
  const vef = v - d;

  // 1. Taxa fixa do negócio sobre vef.
  //    Preferência: snapshot carimbado no Row (preserva histórico) →
  //    fallback pra taxa fixa atual do negócio (lançamentos pré-feature).
  const rawPct =
    r.taxaFixaPctSnapshot !== undefined
      ? r.taxaFixaPctSnapshot
      : (opts?.taxaFixaPct ?? 0);
  const taxaFixaPct = Math.max(0, Math.min(100, +rawPct || 0));
  const taxaFixaVal = (vef * taxaFixaPct) / 100;
  const afterTaxaFixa = vef - taxaFixaVal;

  // 2. Taxa do cartão. Dois modos:
  //    - "value": o usuário digitou o R$ absoluto retido pelo cartão.
  //      Usamos direto, clamp em [0, afterTaxaFixa] pra nunca virar líq.
  //      negativo só pela taxa.
  //    - "percent" (default): aplica o % sobre o subtotal pós taxa do
  //      negócio.
  let t = 0;
  if (r.taxaMode === "value") {
    const raw = Math.max(0, +r.taxa || 0);
    t = Math.min(raw, Math.max(0, afterTaxaFixa));
  } else {
    t = (afterTaxaFixa * (+r.taxa || 0)) / 100;
  }

  // 3. Custo absoluto.
  const c = +r.custo || 0;

  // 4. Auxiliar do serviço — % SEMPRE sobre vef, independente da cadeia
  //    de descontos acima. Modela o caso onde o auxiliar é pago como
  //    fração do que o cliente realmente pagou (o "valor efetivo"),
  //    não do que sobra pro dono depois das taxas/custo.
  const auxPct = Math.max(0, Math.min(100, +(r.auxiliarPct || 0)));
  const auxiliarVal = (vef * auxPct) / 100;

  const liq = vef - taxaFixaVal - t - c - auxiliarVal;

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

/** Soma os valores dos items[] de um Row. Retorna 0 se `items` ausente
 *  ou vazio — caller deve cair pro `valor` singular nesse caso. */
export function sumItems(items?: { valor: number }[]): number {
  if (!items || items.length === 0) return 0;
  return items.reduce((s, i) => s + (+i.valor || 0), 0);
}

/** Display do serviço quando há múltiplos items. Junta os nomes com " + ".
 *  Filtra strings vazias pra não imprimir " +  + ". */
export function joinItemNames(items?: { name: string }[]): string {
  if (!items || items.length === 0) return "";
  return items
    .map((i) => i.name.trim())
    .filter(Boolean)
    .join(" + ");
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
