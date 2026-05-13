import { useMemo } from "react";
import type { FormaPagamento, Row } from "../types";
import { calcRow } from "../lib/calc";

export type InsightSeverity = "warning" | "info" | "positive";

export interface Insight {
  id: string;
  severity: InsightSeverity;
  /** Curto, máx 60 chars. */
  title: string;
  /** Descrição completa com call-to-action. */
  detail: string;
}

interface Params {
  /** Lançamentos do empreendimento ativo (todos os meses). */
  rows: Row[];
  /** Mês atualmente em foco. */
  mes: number;
  ano: number;
}

const FORMAS: FormaPagamento[] = ["Dinheiro", "Pix", "Débito", "Crédito"];

/**
 * Calcula insights determinísticos baseados em padrões dos lançamentos.
 * Ordenados por severidade (warning > positive > info), limitado a 6.
 *
 * Regras atuais:
 *   1. Pendentes antigos: status "Pendente" criado há >14 dias.
 *   2. Concentração: uma forma de pagamento ≥80% do bruto do mês.
 *   3. Variação de forma: forma X subiu/desceu ≥30% vs. mês anterior.
 *   4. Ticket médio: variação ≥20% vs. mês anterior.
 *   5. Cliente recorrente: ≥2 atendimentos do mesmo cliente neste mês.
 *   6. Inatividade: nenhum lançamento nos últimos 7 dias.
 */
export function useInsights({ rows, mes, ano }: Params): Insight[] {
  return useMemo(() => {
    const insights: Insight[] = [];

    // Mês atual
    const cur = rows.filter((r) => r.mes === mes && r.ano === ano && +r.valor > 0);
    if (cur.length === 0) return [];

    const curCalc = cur.map(calcRow);
    const curBruto = curCalc.reduce((s, r) => s + r.v, 0);

    // Mês anterior (handling jan)
    const prevMes = mes === 0 ? 11 : mes - 1;
    const prevAno = mes === 0 ? ano - 1 : ano;
    const prev = rows
      .filter((r) => r.mes === prevMes && r.ano === prevAno && +r.valor > 0)
      .map(calcRow);
    const prevBruto = prev.reduce((s, r) => s + r.v, 0);

    /* ── 1. Pendentes antigos ─────────────────────────────────────── */
    const now = Date.now();
    const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
    const oldPending = cur.filter((r) => {
      if (r.status !== "Pendente") return false;
      const ts = new Date(r.criadoEm).getTime();
      return !isNaN(ts) && now - ts > FOURTEEN_DAYS;
    });
    if (oldPending.length > 0) {
      insights.push({
        id: "old-pending",
        severity: "warning",
        title: `${oldPending.length} pendente${oldPending.length === 1 ? "" : "s"} há mais de 14 dias`,
        detail: `Lançamentos marcados como "Pendente" há bastante tempo. Cobre os clientes ou ajuste o status pra refletir a realidade.`,
      });
    }

    /* ── 2. Concentração de forma de pagamento ───────────────────── */
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
            detail: `Alta concentração em uma única forma de pagamento te deixa vulnerável a falhas do app/banco. Vale incentivar a diversificação.`,
          });
          break;
        }
      }
    }

    /* ── 3. Variação de forma vs. mês anterior ───────────────────── */
    if (prevBruto > 0 && curBruto > 0) {
      for (const f of FORMAS) {
        const curSub = curCalc
          .filter((r) => r.forma === f)
          .reduce((s, r) => s + r.v, 0);
        const prevSub = prev
          .filter((r) => r.forma === f)
          .reduce((s, r) => s + r.v, 0);
        if (prevSub < 50) continue; // valores pequenos geram ruído
        const delta = ((curSub - prevSub) / prevSub) * 100;
        if (Math.abs(delta) >= 30) {
          const up = delta > 0;
          insights.push({
            id: `delta-${f}`,
            severity: up ? "positive" : "info",
            title: `${f} ${up ? "subiu" : "caiu"} ${Math.abs(Math.round(delta))}% vs. mês passado`,
            detail: up
              ? `Bom sinal de adoção. Considere reforçar essa forma de pagamento na sua comunicação.`
              : `Vale investigar o motivo da queda — taxa nova, problema técnico, ou simples preferência do cliente?`,
          });
          break; // só mostra a maior variação
        }
      }
    }

    /* ── 4. Ticket médio vs. mês anterior ─────────────────────────── */
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
            ? `Você está cobrando mais por atendimento. Vale entender o que mudou: serviços novos, reajuste, ou cliente mais premium?`
            : `Atendimentos menores em média. Pode ser sazonal, ou oportunidade pra oferecer combos/upsell.`,
        });
      }
    }

    /* ── 5. Cliente recorrente ───────────────────────────────────── */
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
        detail: `Clientes que vieram mais de uma vez. Eles são seu LTV — vale recompensar com bônus, lembrete de retorno, ou desconto na próxima.`,
      });
    }

    /* ── 6. Inatividade recente ──────────────────────────────────── */
    if (cur.length > 0) {
      const lastTs = Math.max(
        ...cur.map((r) => new Date(r.criadoEm).getTime() || 0),
      );
      const daysSinceLast = Math.floor((now - lastTs) / (24 * 60 * 60 * 1000));
      // Só alerta se faz >7 dias E o mês em foco é o atual
      const today = new Date();
      const isCurrentMonth =
        today.getFullYear() === ano && today.getMonth() === mes;
      if (isCurrentMonth && daysSinceLast >= 7) {
        insights.push({
          id: "inatividade",
          severity: "warning",
          title: `Sem lançamentos há ${daysSinceLast} dias`,
          detail: `Esqueceu de registrar? Lance agora pra manter o histórico atualizado e os relatórios precisos.`,
        });
      }
    }

    // Ordena por severidade: warning > positive > info
    const order: Record<InsightSeverity, number> = {
      warning: 0,
      positive: 1,
      info: 2,
    };
    return insights.sort((a, b) => order[a.severity] - order[b.severity]);
  }, [rows, mes, ano]);
}
