import type { FormaPagamento, Row } from "../types";
import { calcRow } from "./calc";

export type InsightSeverity = "warning" | "info" | "positive";

export interface Insight {
  id: string;
  severity: InsightSeverity;
  /** Curto, máx 60 chars. */
  title: string;
  /** Descrição completa com call-to-action. */
  detail: string;
}

const FORMAS: FormaPagamento[] = ["Dinheiro", "Pix", "Débito", "Crédito"];
const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

interface Params {
  rows: Row[];
  mes: number;
  ano: number;
  /** Pra testes — permite congelar "agora" e tornar a função determinística. */
  now?: number;
}

/**
 * Calcula insights determinísticos baseados em padrões dos lançamentos.
 * Ordenados por severidade (warning > positive > info), sem limite — o
 * caller decide quantos mostrar.
 *
 * **Keep in sync com api/_lib/insights.ts** (backend usa cópia equivalente
 * pra rodar dentro de funções Vercel sem cruzar a fronteira ESM/CJS).
 */
export function computeInsights({ rows, mes, ano, now }: Params): Insight[] {
  const nowTs = now ?? Date.now();
  const insights: Insight[] = [];

  const cur = rows.filter((r) => r.mes === mes && r.ano === ano && +r.valor > 0);
  if (cur.length === 0) return [];

  const curCalc = cur.map(calcRow);
  const curBruto = curCalc.reduce((s, r) => s + r.v, 0);

  const prevMes = mes === 0 ? 11 : mes - 1;
  const prevAno = mes === 0 ? ano - 1 : ano;
  const prev = rows
    .filter((r) => r.mes === prevMes && r.ano === prevAno && +r.valor > 0)
    .map(calcRow);
  const prevBruto = prev.reduce((s, r) => s + r.v, 0);

  const oldPending = cur.filter((r) => {
    if (r.status !== "Pendente") return false;
    const ts = new Date(r.criadoEm).getTime();
    return !isNaN(ts) && nowTs - ts > FOURTEEN_DAYS;
  });
  if (oldPending.length > 0) {
    insights.push({
      id: "old-pending",
      severity: "warning",
      title: `${oldPending.length} pendente${oldPending.length === 1 ? "" : "s"} há mais de 14 dias`,
      detail:
        'Lançamentos marcados como "Pendente" há bastante tempo. Cobre os clientes ou ajuste o status pra refletir a realidade.',
    });
  }

  if (curBruto > 0) {
    for (const f of FORMAS) {
      const sub = curCalc
        .filter((r) => r.forma === f)
        .reduce((s, r) => s + r.v, 0);
      const pct = (sub / curBruto) * 100;
      if (pct >= 80 && cur.length >= 4) {
        insights.push({
          id: `concentr-${f}`,
          severity: "info",
          title: `${Math.round(pct)}% das suas vendas estão em ${f}`,
          detail:
            "Alta concentração em uma única forma de pagamento te deixa vulnerável a falhas do app/banco. Vale incentivar a diversificação.",
        });
        break;
      }
    }
  }

  if (prevBruto > 0 && curBruto > 0) {
    for (const f of FORMAS) {
      const curSub = curCalc
        .filter((r) => r.forma === f)
        .reduce((s, r) => s + r.v, 0);
      const prevSub = prev
        .filter((r) => r.forma === f)
        .reduce((s, r) => s + r.v, 0);
      if (prevSub < 50) continue;
      const delta = ((curSub - prevSub) / prevSub) * 100;
      if (Math.abs(delta) >= 30) {
        const up = delta > 0;
        insights.push({
          id: `delta-${f}`,
          severity: up ? "positive" : "info",
          title: `${f} ${up ? "subiu" : "caiu"} ${Math.abs(Math.round(delta))}% vs. mês passado`,
          detail: up
            ? "Bom sinal de adoção. Considere reforçar essa forma de pagamento na sua comunicação."
            : "Vale investigar o motivo da queda — taxa nova, problema técnico, ou simples preferência do cliente?",
        });
        break;
      }
    }
  }

  if (prev.length >= 3 && cur.length >= 3) {
    const curTicket = curBruto / cur.length;
    const prevTicket = prevBruto / prev.length;
    const delta = ((curTicket - prevTicket) / prevTicket) * 100;
    if (Math.abs(delta) >= 20) {
      const up = delta > 0;
      insights.push({
        id: "ticket",
        severity: up ? "positive" : "info",
        title: `Ticket médio ${up ? "subiu" : "caiu"} ${Math.abs(Math.round(delta))}% no mês`,
        detail: up
          ? "Você está cobrando mais por atendimento. Vale entender o que mudou: serviços novos, reajuste, ou cliente mais premium?"
          : "Atendimentos menores em média. Pode ser sazonal, ou oportunidade pra oferecer combos/upsell.",
      });
    }
  }

  const byClient = new Map<string, number>();
  cur.forEach((r) => {
    const k = r.cliente.trim().toLowerCase();
    if (!k) return;
    byClient.set(k, (byClient.get(k) ?? 0) + 1);
  });
  const recorrentes = Array.from(byClient.entries()).filter(([, c]) => c >= 2);
  if (recorrentes.length >= 2) {
    insights.push({
      id: "recorrentes",
      severity: "positive",
      title: `${recorrentes.length} clientes voltaram este mês`,
      detail:
        "Clientes que vieram mais de uma vez. Eles são seu LTV — vale recompensar com bônus, lembrete de retorno, ou desconto na próxima.",
    });
  }

  if (cur.length > 0) {
    const lastTs = Math.max(
      ...cur.map((r) => new Date(r.criadoEm).getTime() || 0),
    );
    const daysSinceLast = Math.floor((nowTs - lastTs) / (24 * 60 * 60 * 1000));
    const today = new Date(nowTs);
    const isCurrentMonth =
      today.getFullYear() === ano && today.getMonth() === mes;
    if (isCurrentMonth && daysSinceLast >= 7) {
      insights.push({
        id: "inatividade",
        severity: "warning",
        title: `Sem lançamentos há ${daysSinceLast} dias`,
        detail:
          "Esqueceu de registrar? Lance agora pra manter o histórico atualizado e os relatórios precisos.",
      });
    }
  }

  const order: Record<InsightSeverity, number> = {
    warning: 0,
    positive: 1,
    info: 2,
  };
  return insights.sort((a, b) => order[a.severity] - order[b.severity]);
}
