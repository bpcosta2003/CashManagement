/**
 * Helpers de envio compartilhados entre o cron diário e o endpoint de
 * teste manual (/api/admin/test-notification). Mantém o template e a
 * lógica de composição num só lugar.
 */
import { env } from "./env";
import {
  computeInsights,
  pendingRows,
  type Row,
  type Insight,
} from "./insights";
import {
  sendEmail,
  renderEmailHtml,
  renderEmailText,
  SUBJECT_PREFIX,
  type EmailBlock,
} from "./email";

export const MES_LABEL = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** Estrutura mínima do AppState que as funções de email leem. */
export interface StateShape {
  rows?: Row[];
  businesses?: { id: string; name: string }[];
  goals?: { businessId: string; mes: number; ano: number; target: number }[];
  settings?: { emailNotifications?: boolean };
}

export interface DayContext {
  y: number;
  /** 0-11 */
  m: number;
  d: number;
}

export function todayInBrt(): DayContext {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? "0");
  return { y: get("year"), m: get("month") - 1, d: get("day") };
}

export function lastBusinessDayOfMonth(y: number, m: number): number {
  const last = new Date(Date.UTC(y, m + 1, 0));
  while (last.getUTCDay() === 0 || last.getUTCDay() === 6) {
    last.setUTCDate(last.getUTCDate() - 1);
  }
  return last.getUTCDate();
}

function fmtBRL(n: number): string {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function processFirstDayUser(
  email: string,
  state: StateShape,
  today: DayContext,
): Promise<boolean> {
  const businesses = state.businesses ?? [];
  if (businesses.length === 0) return false;

  const goals = state.goals ?? [];
  const missingGoal = businesses.filter(
    (b) =>
      !goals.some(
        (g) => g.businessId === b.id && g.mes === today.m && g.ano === today.y,
      ),
  );
  if (missingGoal.length === 0) return false;

  const monthName = MES_LABEL[today.m];
  const blocks: EmailBlock[] = [];

  blocks.push({
    kind: "section",
    title: `Comece ${monthName} com uma meta clara`,
    body: `Definir a meta no início do mês ajuda a tomar decisões melhores e te dá um norte pra acompanhar o progresso. Não precisa ser um número final — comece com uma estimativa e ajuste depois.`,
  });

  if (missingGoal.length === 1) {
    blocks.push({
      kind: "section",
      title: "Empreendimento sem meta",
      body: `${missingGoal[0].name} ainda não tem meta para ${monthName}/${today.y}.`,
    });
  } else {
    blocks.push({
      kind: "list",
      title: `${missingGoal.length} empreendimentos sem meta para ${monthName}`,
      items: missingGoal.map((b) => b.name),
    });
  }

  const params = {
    preheader: `Lembrete: defina suas metas de ${monthName}`,
    eyebrow: `Lembrete de Metas`,
    greeting: "Olá,",
    intro: `Mês novo, página em branco. Antes de mais nada, vale tirar 2 minutos pra cadastrar a meta de ${monthName} — ela vai te guiar nas decisões do mês inteiro.`,
    blocks,
    cta: { label: "Cadastrar metas", href: env.appUrl },
    disclaimer:
      "Você recebe este e-mail porque ativou notificações em Preferências → Lembretes → Notificações por email. Pra cancelar, é só desligar a opção no app.",
  };

  await sendEmail({
    to: email,
    subject: `${SUBJECT_PREFIX}Lembrete: meta de ${monthName}`,
    html: renderEmailHtml(params),
    text: renderEmailText(params),
  });
  return true;
}

export async function processLastDayUser(
  email: string,
  state: StateShape,
  today: DayContext,
): Promise<boolean> {
  const allRows = state.rows ?? [];
  const businesses = state.businesses ?? [];
  if (businesses.length === 0 || allRows.length === 0) return false;

  type PerBiz = {
    name: string;
    pendings: Row[];
    insights: Insight[];
  };
  const summaries: PerBiz[] = [];

  for (const b of businesses) {
    const bizRows = allRows.filter((r) => r.businessId === b.id);
    const pendings = pendingRows(bizRows, today.m, today.y);
    const ins = computeInsights({ rows: bizRows, mes: today.m, ano: today.y });
    if (pendings.length > 0 || ins.length > 0) {
      summaries.push({ name: b.name, pendings, insights: ins });
    }
  }

  if (summaries.length === 0) return false;

  const monthName = MES_LABEL[today.m];
  const blocks: EmailBlock[] = [];

  for (const s of summaries) {
    if (summaries.length > 1) {
      blocks.push({
        kind: "section",
        title: `── ${s.name} ──`,
        body: "",
      });
    }

    if (s.pendings.length > 0) {
      const total = s.pendings.reduce((acc, r) => acc + (+r.valor || 0), 0);
      const items = s.pendings.slice(0, 8).map((r) => {
        const cli = r.cliente || "(sem nome)";
        const serv = r.servico ? ` — ${r.servico}` : "";
        return `${cli}${serv}: ${fmtBRL(+r.valor || 0)}`;
      });
      if (s.pendings.length > 8) {
        items.push(`… e mais ${s.pendings.length - 8}`);
      }
      blocks.push({
        kind: "warning",
        title: `⚠️ ${s.pendings.length} pendente${s.pendings.length === 1 ? "" : "s"} de pagamento — ${fmtBRL(total)}`,
        body: `Esses lançamentos ainda estão como "Pendente". Confira se já foram pagos e atualize o status antes de fechar o mês:\n\n${items.join(" · ")}`,
      });
    }

    if (s.insights.length > 0) {
      blocks.push({
        kind: "list",
        title:
          s.pendings.length > 0 ? "Outros pontos de atenção" : "Pontos de atenção",
        items: s.insights.map((i) => `${i.title} — ${i.detail}`),
      });
    }
  }

  const params = {
    preheader: `Resumo de ${monthName} — pendências e insights`,
    eyebrow: `Resumo do Mês`,
    greeting: "Olá,",
    intro: `Hoje é o último dia útil de ${monthName}. Antes de fechar o mês, dei uma olhada nos seus dados e separei o que pede atenção.`,
    blocks,
    cta: { label: "Abrir resumo do mês", href: env.appUrl },
    disclaimer:
      "Você recebe este e-mail porque ativou notificações em Preferências → Lembretes → Notificações por email. Pra cancelar, é só desligar a opção no app.",
  };

  await sendEmail({
    to: email,
    subject: `${SUBJECT_PREFIX}Resumo de ${monthName}`,
    html: renderEmailHtml(params),
    text: renderEmailText(params),
  });
  return true;
}
