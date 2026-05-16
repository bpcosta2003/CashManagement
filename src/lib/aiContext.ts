import type {
  Business,
  CalculatedRow,
  Client,
  MonthGoal,
  Row,
  Summary,
} from "../types";
import { calcRow } from "./calc";
import { MESES_FULL } from "../constants";

export interface AiContextInput {
  business: Business;
  /** Todos os lançamentos do empreendimento (todos os meses).
   *  O builder filtra mês corrente e meses anteriores conforme precisar. */
  allRows: Row[];
  clients: Client[];
  goal: MonthGoal | null;
  mes: number;
  ano: number;
  summary: Summary;
}

export interface AiContextOutput {
  /** XML pronto pra ir no prompt da IA. */
  contextXml: string;
  /** Hash determinístico dos dados — invalida cache quando algo muda. */
  dataHash: string;
  /** Rótulo amigável tipo "Maio/2026" — usado no prompt e na UI. */
  monthLabel: string;
}

const fmtBRL = (n: number): string =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtPct = (n: number, digits = 1): string =>
  `${n.toFixed(digits).replace(".", ",")}%`;

/** Escape mínimo pra XML — evita entidades quebrarem o parser na IA. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Trunca string longa pra evitar inflar o prompt e custar mais tokens. */
function clip(s: string, max = 80): string {
  const trimmed = s.trim();
  return trimmed.length > max ? trimmed.slice(0, max - 1) + "…" : trimmed;
}

interface MonthAggregate {
  mes: number;
  ano: number;
  bruto: number;
  liq: number;
  count: number;
}

function aggregateMonth(
  rows: CalculatedRow[],
  mes: number,
  ano: number,
): MonthAggregate {
  const valid = rows.filter((r) => r.mes === mes && r.ano === ano && r.v > 0);
  return {
    mes,
    ano,
    bruto: valid.reduce((s, r) => s + r.v, 0),
    liq: valid.reduce((s, r) => s + r.liq, 0),
    count: valid.length,
  };
}

function paymentBreakdown(rows: CalculatedRow[]): Array<{
  forma: string;
  count: number;
  bruto: number;
  liq: number;
  pctBruto: number;
}> {
  const map = new Map<string, { count: number; bruto: number; liq: number }>();
  let total = 0;
  for (const r of rows) {
    if (r.v <= 0) continue;
    total += r.v;
    const cur = map.get(r.forma) ?? { count: 0, bruto: 0, liq: 0 };
    cur.count += 1;
    cur.bruto += r.v;
    cur.liq += r.liq;
    map.set(r.forma, cur);
  }
  return Array.from(map.entries())
    .map(([forma, v]) => ({
      forma,
      count: v.count,
      bruto: v.bruto,
      liq: v.liq,
      pctBruto: total > 0 ? (v.bruto / total) * 100 : 0,
    }))
    .sort((a, b) => b.bruto - a.bruto);
}

function topClients(rows: CalculatedRow[], n: number) {
  const map = new Map<string, { count: number; bruto: number }>();
  for (const r of rows) {
    if (r.v <= 0) continue;
    const key = r.cliente.trim() || "—";
    const cur = map.get(key) ?? { count: 0, bruto: 0 };
    cur.count += 1;
    cur.bruto += r.v;
    map.set(key, cur);
  }
  return Array.from(map.entries())
    .map(([cliente, v]) => ({ cliente, ...v }))
    .sort((a, b) => b.bruto - a.bruto)
    .slice(0, n);
}

function topServices(rows: CalculatedRow[], n: number) {
  const map = new Map<string, { count: number; bruto: number }>();
  for (const r of rows) {
    if (r.v <= 0) continue;
    const key = r.servico.trim() || "—";
    const cur = map.get(key) ?? { count: 0, bruto: 0 };
    cur.count += 1;
    cur.bruto += r.v;
    map.set(key, cur);
  }
  return Array.from(map.entries())
    .map(([servico, v]) => ({ servico, ...v }))
    .sort((a, b) => b.bruto - a.bruto)
    .slice(0, n);
}

function topTickets(rows: CalculatedRow[], n: number) {
  return rows
    .filter((r) => r.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, n);
}

function pendentesCount(rows: CalculatedRow[]) {
  const now = Date.now();
  const FOURTEEN = 14 * 24 * 60 * 60 * 1000;
  let pendentes = 0;
  let pendentesValor = 0;
  let antigos = 0;
  for (const r of rows) {
    if (r.status !== "Pendente" || r.v <= 0) continue;
    pendentes += 1;
    pendentesValor += r.v;
    const ts = new Date(r.criadoEm).getTime();
    if (!isNaN(ts) && now - ts > FOURTEEN) antigos += 1;
  }
  return { pendentes, pendentesValor, antigos };
}

function prevMonth(mes: number, ano: number): { mes: number; ano: number } {
  if (mes === 0) return { mes: 11, ano: ano - 1 };
  return { mes: mes - 1, ano };
}

/**
 * Hash FNV-1a 32-bit. Pequeno, rápido, sem deps. Bom o suficiente
 * pra invalidação de cache (não precisa ser criptográfico).
 */
function fnv1aHex(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * Constrói o XML de contexto e o hash de invalidação de cache.
 *
 * O XML cobre:
 *   - Identidade do empreendimento e período
 *   - Resumo do mês (bruto, líquido, margem, taxas, descontos, custos)
 *   - Meta (se definida) com progresso
 *   - Comparativo com mês anterior (bruto, líquido, ticket médio)
 *   - Histórico dos últimos 6 meses (sparkline)
 *   - Mix por forma de pagamento com %
 *   - Top 5 clientes / Top 5 serviços do mês
 *   - 5 maiores tickets do mês
 *   - Pendências (total + valor + quantos há mais de 14 dias)
 *
 * O hash inclui APENAS dados financeiros do mês corrente (lançamentos,
 * meta) — mudanças noutras abas não invalidam o cache.
 */
export function buildAiContext(input: AiContextInput): AiContextOutput {
  const { business, allRows, goal, mes, ano, summary } = input;

  // Filtra linhas do empreendimento ativo
  const businessRows = allRows.filter((r) => r.businessId === business.id);
  const allCalc = businessRows.map(calcRow);

  const monthRows = allCalc.filter(
    (r) => r.mes === mes && r.ano === ano && r.v > 0,
  );

  const monthLabel = `${MESES_FULL[mes]}/${ano}`;

  // ─── Comparativo com mês anterior ──────────────────────────────
  const { mes: pm, ano: py } = prevMonth(mes, ano);
  const prev = aggregateMonth(allCalc, pm, py);
  const cur = {
    mes,
    ano,
    bruto: summary.bruto,
    liq: summary.liq,
    count: monthRows.length,
  };
  const ticketAtual = cur.count > 0 ? cur.bruto / cur.count : 0;
  const ticketPrev = prev.count > 0 ? prev.bruto / prev.count : 0;

  // ─── Histórico de 6 meses ──────────────────────────────────────
  const historico: MonthAggregate[] = [];
  for (let offset = -5; offset <= -1; offset++) {
    let m = mes + offset;
    let y = ano;
    while (m < 0) {
      m += 12;
      y -= 1;
    }
    historico.push(aggregateMonth(allCalc, m, y));
  }

  // ─── Mix de pagamentos ─────────────────────────────────────────
  const mix = paymentBreakdown(monthRows);

  // ─── Top clientes e serviços ───────────────────────────────────
  const tcli = topClients(monthRows, 5);
  const tsrv = topServices(monthRows, 5);
  const ttic = topTickets(monthRows, 5);
  const pend = pendentesCount(monthRows);

  // ─── Monta XML ─────────────────────────────────────────────────
  const lines: string[] = [];
  lines.push(`<empreendimento>`);
  lines.push(`  <nome>${esc(clip(business.name, 60))}</nome>`);
  lines.push(`  <tipo>${esc(business.type)}</tipo>`);
  lines.push(`</empreendimento>`);

  lines.push(`<periodo>`);
  lines.push(`  <mes>${monthLabel}</mes>`);
  lines.push(`</periodo>`);

  lines.push(`<resumo_mes>`);
  lines.push(`  <faturamento_bruto>${fmtBRL(summary.bruto)}</faturamento_bruto>`);
  lines.push(`  <descontos>${fmtBRL(summary.descontos)}</descontos>`);
  lines.push(`  <taxas>${fmtBRL(summary.taxas)}</taxas>`);
  lines.push(`  <custos>${fmtBRL(summary.custos)}</custos>`);
  lines.push(`  <faturamento_liquido>${fmtBRL(summary.liq)}</faturamento_liquido>`);
  lines.push(`  <margem_liquida>${fmtPct(summary.margem)}</margem_liquida>`);
  lines.push(`  <recebido_no_mes>${fmtBRL(summary.estesMes)}</recebido_no_mes>`);
  lines.push(`  <a_receber_futuro>${fmtBRL(summary.futuro)}</a_receber_futuro>`);
  lines.push(`  <total_lancamentos>${cur.count}</total_lancamentos>`);
  lines.push(`  <ticket_medio>${fmtBRL(ticketAtual)}</ticket_medio>`);
  lines.push(`</resumo_mes>`);

  if (goal && goal.target > 0) {
    const pct = (summary.bruto / goal.target) * 100;
    const restante = goal.target - summary.bruto;
    lines.push(`<meta_mes>`);
    lines.push(`  <valor_alvo_bruto>${fmtBRL(goal.target)}</valor_alvo_bruto>`);
    lines.push(`  <progresso>${fmtPct(pct)}</progresso>`);
    lines.push(
      `  <${restante > 0 ? "falta" : "excedente"}>${fmtBRL(Math.abs(restante))}</${restante > 0 ? "falta" : "excedente"}>`,
    );
    lines.push(`</meta_mes>`);
  } else {
    lines.push(`<meta_mes>nao_definida</meta_mes>`);
  }

  lines.push(`<comparativo_mes_anterior>`);
  lines.push(`  <mes_anterior>${MESES_FULL[pm]}/${py}</mes_anterior>`);
  lines.push(`  <bruto_anterior>${fmtBRL(prev.bruto)}</bruto_anterior>`);
  lines.push(`  <liquido_anterior>${fmtBRL(prev.liq)}</liquido_anterior>`);
  lines.push(`  <ticket_medio_anterior>${fmtBRL(ticketPrev)}</ticket_medio_anterior>`);
  if (prev.bruto > 0) {
    const dBruto = ((cur.bruto - prev.bruto) / prev.bruto) * 100;
    lines.push(`  <variacao_bruto>${fmtPct(dBruto)}</variacao_bruto>`);
  }
  if (prev.liq !== 0) {
    const dLiq = ((cur.liq - prev.liq) / Math.abs(prev.liq)) * 100;
    lines.push(`  <variacao_liquido>${fmtPct(dLiq)}</variacao_liquido>`);
  }
  lines.push(`</comparativo_mes_anterior>`);

  if (historico.some((h) => h.bruto > 0)) {
    lines.push(`<historico_6_meses>`);
    for (const h of historico) {
      lines.push(
        `  <mes label="${MESES_FULL[h.mes]}/${h.ano}" bruto="${fmtBRL(h.bruto)}" liquido="${fmtBRL(h.liq)}" lancamentos="${h.count}" />`,
      );
    }
    lines.push(`</historico_6_meses>`);
  }

  if (mix.length > 0) {
    lines.push(`<mix_pagamentos>`);
    for (const m of mix) {
      lines.push(
        `  <forma nome="${esc(m.forma)}" lancamentos="${m.count}" bruto="${fmtBRL(m.bruto)}" liquido="${fmtBRL(m.liq)}" pct_do_mes="${fmtPct(m.pctBruto)}" />`,
      );
    }
    lines.push(`</mix_pagamentos>`);
  }

  if (tcli.length > 0) {
    lines.push(`<top_clientes>`);
    for (const c of tcli) {
      lines.push(
        `  <cliente nome="${esc(clip(c.cliente, 50))}" atendimentos="${c.count}" bruto="${fmtBRL(c.bruto)}" />`,
      );
    }
    lines.push(`</top_clientes>`);
  }

  if (tsrv.length > 0) {
    lines.push(`<top_servicos>`);
    for (const s of tsrv) {
      lines.push(
        `  <servico nome="${esc(clip(s.servico, 50))}" vezes="${s.count}" bruto="${fmtBRL(s.bruto)}" />`,
      );
    }
    lines.push(`</top_servicos>`);
  }

  if (ttic.length > 0) {
    lines.push(`<maiores_tickets>`);
    for (const r of ttic) {
      lines.push(
        `  <ticket cliente="${esc(clip(r.cliente, 40))}" servico="${esc(clip(r.servico, 40))}" forma="${esc(r.forma)}" valor="${fmtBRL(r.v)}" liquido="${fmtBRL(r.liq)}" />`,
      );
    }
    lines.push(`</maiores_tickets>`);
  }

  lines.push(`<pendencias>`);
  lines.push(`  <total>${pend.pendentes}</total>`);
  lines.push(`  <valor_total>${fmtBRL(pend.pendentesValor)}</valor_total>`);
  lines.push(`  <antigas_mais_14_dias>${pend.antigos}</antigas_mais_14_dias>`);
  lines.push(`</pendencias>`);

  const contextXml = lines.join("\n");

  // ─── Hash de invalidação ──────────────────────────────────────
  // Inclui só o que afeta a análise: lançamentos do mês + meta + mês/ano.
  // NÃO inclui businessId nem userId — isso é proposital. Cache global
  // por conteúdo: se dois usuários submetem o mesmo conjunto de dados
  // (típico: importaram o mesmo backup), o segundo recebe o resultado
  // cacheado sem chamar a IA. Mata o ataque "criar N contas pra burlar
  // a quota mensal" — N × mesma análise = 1 × custo na nossa conta.
  const hashSource = JSON.stringify({
    rows: monthRows
      .map((r) => ({
        c: r.cliente,
        s: r.servico,
        v: r.v,
        d: r.descontoVal,
        t: r.taxa,
        u: r.custoVal,
        f: r.forma,
        p: r.parc,
        st: r.status,
      }))
      .sort((a, b) =>
        `${a.c}|${a.s}|${a.v}`.localeCompare(`${b.c}|${b.s}|${b.v}`),
      ),
    goal: goal?.target ?? 0,
    mes,
    ano,
  });
  const dataHash = fnv1aHex(hashSource);

  return { contextXml, dataHash, monthLabel };
}
