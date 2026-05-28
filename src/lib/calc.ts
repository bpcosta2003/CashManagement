import type { CalculatedRow, FormaPagamento, Row } from "../types";

export const uid = () => Math.random().toString(36).slice(2, 9);

/** Mordida de uma forma de pagamento sobre uma base R$ (já pós taxa do
 *  negócio). "value" = R$ absoluto, clampado em [0, base]; "percent"
 *  (default) = % da base. Espelha exatamente a regra da taxa única. */
function feeOn(base: number, taxa: number, mode?: "percent" | "value"): number {
  const b = Math.max(0, base);
  if (mode === "value") return Math.min(Math.max(0, taxa), b);
  return (b * Math.max(0, Math.min(100, taxa))) / 100;
}

/** Taxa do cartão de uma parte de pagamento — incide sobre o valor
 *  específico daquela forma (não sobre uma fatia proporcional). Pix e
 *  Dinheiro nunca têm taxa de cartão. */
export function cardFee(p: {
  forma: FormaPagamento;
  valor: number;
  taxa?: number;
  taxaMode?: "percent" | "value";
}): number {
  if (p.forma === "Dinheiro" || p.forma === "Pix") return 0;
  return feeOn(+(p.valor || 0), +(p.taxa ?? 0), p.taxaMode);
}

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
 * Calcula totais e líquido de um lançamento. Cadeia de deduções:
 *
 *   valor (bruto)
 *   − desconto
 *   − custo                          ← novo: custo entra junto com desconto
 *   = valor efetivo (vef)
 *   − taxa do negócio  (% sobre vef OU R$ absoluto)
 *   − taxa do cartão   (% sobre subtotal pós taxa do negócio OU R$ absoluto)
 *   − auxiliar         (% sobre vef OU R$ absoluto)
 *   = líquido
 *
 * Custo agora reduz o vef (como desconto) — modela o caso "não pago
 * imposto/taxa sobre matéria-prima/material consumido". Auxiliar
 * continua com base em vef (sempre).
 *
 * A margem é calculada sobre o bruto (valor), preservando o significado
 * "quanto sobra de cada real vendido". Bruto NÃO muda.
 *
 * Fontes da taxa do negócio (prioridade decrescente):
 *   1. r.taxaNegocio + r.taxaNegocioMode (v3, atual)
 *   2. r.taxaFixaPctSnapshot (v2, legado — sempre %)
 *   3. opts.taxaFixaPct (pré-v2, fallback business config global)
 *   4. 0
 */
export function calcRow(
  r: Row,
  opts?: { taxaFixaPct?: number },
): CalculatedRow {
  const v = +r.valor || 0;
  const d = Math.min(+r.desconto || 0, v);
  const c = +r.custo || 0;
  // vef = valor − desconto − custo. Clamp em 0 pra evitar base
  // negativa quando custo > (valor − desconto).
  const vef = Math.max(0, v - d - c);

  // Taxa do negócio. Prioridade: novos campos → snapshot legado →
  // opts (fallback pré-snapshot) → 0.
  let taxaFixaVal = 0;
  let taxaNegocioMode: "percent" | "value" = "percent";
  if (r.taxaNegocio !== undefined && r.taxaNegocio !== null) {
    taxaNegocioMode = r.taxaNegocioMode === "value" ? "value" : "percent";
    if (taxaNegocioMode === "value") {
      const raw = Math.max(0, +r.taxaNegocio || 0);
      taxaFixaVal = Math.min(raw, vef);
    } else {
      const pct = Math.max(0, Math.min(100, +r.taxaNegocio || 0));
      taxaFixaVal = (vef * pct) / 100;
    }
  } else if (r.taxaFixaPctSnapshot !== undefined) {
    const pct = Math.max(0, Math.min(100, +r.taxaFixaPctSnapshot || 0));
    taxaFixaVal = (vef * pct) / 100;
  } else if (opts?.taxaFixaPct) {
    const pct = Math.max(0, Math.min(100, +opts.taxaFixaPct || 0));
    taxaFixaVal = (vef * pct) / 100;
  }
  const afterTaxaFixa = vef - taxaFixaVal;

  // Taxa do cartão. Três caminhos:
  //   - Múltiplos pagamentos: cada parte tem sua taxa sobre a sua fatia
  //     do subtotal pós taxa do negócio; somamos as mordidas.
  //   - "value": R$ absoluto retido pelo cartão. Clamp em [0, afterTaxaFixa].
  //   - "percent" (default): % sobre subtotal pós taxa do negócio.
  let t = 0;
  if (r.pagamentos && r.pagamentos.length > 0) {
    // A taxa de cada forma incide sobre o valor daquela forma específica
    // (Pix/Dinheiro sem taxa). Somamos as mordidas e limitamos ao subtotal.
    for (const p of r.pagamentos) {
      t += cardFee(p);
    }
    t = Math.min(t, Math.max(0, afterTaxaFixa));
  } else if (r.taxaMode === "value") {
    const raw = Math.max(0, +r.taxa || 0);
    t = Math.min(raw, Math.max(0, afterTaxaFixa));
  } else {
    t = (afterTaxaFixa * (+r.taxa || 0)) / 100;
  }

  // Auxiliar do serviço. Base é sempre vef (o cliente efetivamente pagou
  // isso — auxiliar fica com sua fração disso, não do líquido).
  let auxiliarVal = 0;
  if (r.auxiliarMode === "value") {
    const raw = Math.max(0, +(r.auxiliarPct || 0));
    auxiliarVal = Math.min(raw, vef);
  } else {
    const auxPct = Math.max(0, Math.min(100, +(r.auxiliarPct || 0)));
    auxiliarVal = (vef * auxPct) / 100;
  }

  const liq = vef - taxaFixaVal - t - auxiliarVal;

  return {
    ...r,
    v,
    descontoVal: d,
    vef,
    taxaVal: t,
    // custoVal preserva o valor original do custo pra display.
    // O custo já foi subtraído dentro do vef, não é descontado de novo.
    custoVal: c,
    taxaFixaVal,
    auxiliarVal,
    liq,
    mar: v ? (liq / v) * 100 : 0,
  };
}

export interface RowPart {
  forma: FormaPagamento;
  parc: number;
  bruto: number;
  vef: number;
  taxaVal: number;
  liq: number;
}

/** Decompõe um lançamento calculado nas suas partes de pagamento.
 *  Forma única → uma parte com a Row inteira. Múltiplo → uma parte por
 *  split, com bruto/vef/líquido proporcionais e a taxa real de cada
 *  método. A soma das partes reconstrói exatamente os totais da Row, então
 *  qualquer consumidor (resumo, composição, projeção) pode iterar partes
 *  sem mudar os números do modo de forma única. */
export function rowParts(r: CalculatedRow): RowPart[] {
  const splits = r.pagamentos;
  if (!splits || splits.length === 0) {
    return [
      {
        forma: r.forma,
        parc: Math.max(1, r.parc || 1),
        bruto: r.v,
        vef: r.vef,
        taxaVal: r.taxaVal,
        liq: r.liq,
      },
    ];
  }
  const total = splits.reduce((s, p) => s + (+p.valor || 0), 0) || 1;
  return splits.map((p) => {
    const frac = (+p.valor || 0) / total;
    const vefShare = r.vef * frac;
    const taxaFixaShare = r.taxaFixaVal * frac;
    const auxShare = r.auxiliarVal * frac;
    // Taxa do cartão sobre o valor da própria forma (não proporcional).
    const taxaVal = cardFee(p);
    return {
      forma: p.forma,
      parc: Math.max(1, p.parc || 1),
      bruto: r.v * frac,
      vef: vefShare,
      taxaVal,
      liq: vefShare - taxaFixaShare - taxaVal - auxShare,
    };
  });
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
  // Itera as partes de pagamento: o que não for crédito cai no mês; cada
  // parte no crédito projeta sua fatia pros meses seguintes conforme as
  // próprias parcelas. Forma única reduz exatamente ao comportamento antigo.
  const parts = rowParts(r);
  let thisMonth = 0;
  const future: RecInfo["future"] = [];
  for (const part of parts) {
    if (part.forma !== "Crédito") {
      thisMonth += part.liq;
      continue;
    }
    const n = Math.max(1, part.parc || 1);
    if (n === 1) {
      const { m, y } = addMes(r.mes, r.ano, 1);
      future.push({ m, y, bruto: part.vef, liq: part.liq, label: "Crédito à vista" });
      continue;
    }
    for (let i = 1; i <= n; i++) {
      const { m, y } = addMes(r.mes, r.ano, i);
      future.push({
        m,
        y,
        bruto: part.vef / n,
        liq: part.liq / n,
        label: `Parcela ${i}/${n}`,
      });
    }
  }
  return { thisMonth, future };
}
