import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin } from "../_lib/supabaseAdmin";
import { env } from "../_lib/env";
import {
  computeInsights,
  pendingRows,
  type Row,
  type Insight,
} from "../_lib/insights";
import {
  sendEmail,
  renderEmailHtml,
  renderEmailText,
  type EmailBlock,
} from "../_lib/email";

const MES_LABEL = [
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

/** Estrutura mínima do AppState que o cron precisa ler do JSONB. */
interface StateShape {
  rows?: Row[];
  businesses?: { id: string; name: string }[];
  goals?: { businessId: string; mes: number; ano: number; target: number }[];
  settings?: { emailNotifications?: boolean };
}

interface StateRow {
  user_id: string;
  state: StateShape;
}

function todayInBrt(): { y: number; m: number; d: number } {
  // Intl.DateTimeFormat com timeZone garante a data correta no fuso BRT
  // independente do servidor (Vercel roda em UTC).
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

function lastBusinessDayOfMonth(y: number, m: number): number {
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

async function processFirstDayUser(
  email: string,
  state: StateShape,
  today: { y: number; m: number; d: number },
): Promise<boolean> {
  const businesses = state.businesses ?? [];
  if (businesses.length === 0) return false;

  const goals = state.goals ?? [];
  const missingGoal = businesses.filter(
    (b) => !goals.some((g) => g.businessId === b.id && g.mes === today.m && g.ano === today.y),
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

  const html = renderEmailHtml({
    preheader: `Lembrete: defina suas metas de ${monthName}`,
    greeting: "Bom dia",
    intro: `Mês novo, página em branco. Antes de mais nada, vale tirar 2 minutos pra cadastrar a meta de ${monthName}.`,
    blocks,
    cta: { label: "Cadastrar metas", href: env.appUrl },
    footer:
      "Você recebe este email porque ativou notificações em Preferências. Pra cancelar, abra o app e desative em Lembretes → Notificações por email.",
  });
  const text = renderEmailText({
    preheader: "",
    greeting: "Bom dia",
    intro: `Mês novo, página em branco. Antes de mais nada, vale tirar 2 minutos pra cadastrar a meta de ${monthName}.`,
    blocks,
    cta: { label: "Cadastrar metas", href: env.appUrl },
    footer:
      "Você recebe este email porque ativou notificações em Preferências.",
  });

  await sendEmail({
    to: email,
    subject: `🎯 Lembrete: meta de ${monthName}`,
    html,
    text,
  });
  return true;
}

async function processLastDayUser(
  email: string,
  state: StateShape,
  today: { y: number; m: number; d: number },
): Promise<boolean> {
  const allRows = state.rows ?? [];
  const businesses = state.businesses ?? [];
  if (businesses.length === 0 || allRows.length === 0) return false;

  // Agrega por empreendimento — usuário pode ter vários, manda 1 email
  // com todos os blocos.
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
        title: s.pendings.length > 0 ? "Outros pontos de atenção" : "Pontos de atenção",
        items: s.insights.map((i) => `${i.title} — ${i.detail}`),
      });
    }
  }

  const html = renderEmailHtml({
    preheader: `Resumo de ${monthName} — pendências e insights`,
    greeting: "Olá!",
    intro: `Hoje é o último dia útil de ${monthName}. Antes de fechar o mês, dei uma olhada nos seus dados e separei o que pede atenção.`,
    blocks,
    cta: { label: "Abrir resumo do mês", href: env.appUrl },
    footer:
      "Você recebe este email porque ativou notificações em Preferências. Pra cancelar, abra o app e desative em Lembretes → Notificações por email.",
  });
  const text = renderEmailText({
    preheader: "",
    greeting: "Olá!",
    intro: `Hoje é o último dia útil de ${monthName}. Antes de fechar o mês, dei uma olhada nos seus dados e separei o que pede atenção.`,
    blocks,
    cta: { label: "Abrir resumo do mês", href: env.appUrl },
    footer:
      "Você recebe este email porque ativou notificações em Preferências.",
  });

  await sendEmail({
    to: email,
    subject: `📊 Resumo de ${monthName} — pendências e insights`,
    html,
    text,
  });
  return true;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // ─── 1. Auth via CRON_SECRET (Vercel injeta automaticamente) ─────
  const expected = env.cronSecret;
  if (expected) {
    const got = req.headers.authorization;
    if (got !== `Bearer ${expected}`) {
      return res.status(401).json({ error: "unauthorized" });
    }
  }

  // ─── 2. Decide o que disparar hoje ────────────────────────────────
  const today = todayInBrt();
  const isFirstDay = today.d === 1;
  const isLastBusinessDay =
    today.d === lastBusinessDayOfMonth(today.y, today.m);

  if (!isFirstDay && !isLastBusinessDay) {
    return res.status(200).json({
      ok: true,
      skipped: true,
      reason: "not_a_trigger_day",
      today,
    });
  }

  // ─── 3. Busca usuários com notificações ativas ───────────────────
  const supabase = getSupabaseAdmin();
  const { data: states, error } = await supabase
    .from("cash_state")
    .select("user_id, state")
    // Filtro JSONB: settings->emailNotifications === true
    .filter("state->settings->>emailNotifications", "eq", "true");

  if (error) {
    console.error("[cron/notifications] state query error", error);
    return res
      .status(500)
      .json({ error: "state_query_failed", detail: error.message });
  }

  const rows = (states ?? []) as StateRow[];

  // ─── 4. Itera, busca email no auth.users, envia ──────────────────
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const errors: { userId: string; message: string }[] = [];

  for (const row of rows) {
    try {
      const { data: u, error: userErr } =
        await supabase.auth.admin.getUserById(row.user_id);
      if (userErr || !u.user?.email) {
        skipped++;
        continue;
      }

      let didSend = false;
      if (isLastBusinessDay) {
        didSend =
          (await processLastDayUser(u.user.email, row.state, today)) ||
          didSend;
      }
      if (isFirstDay) {
        didSend =
          (await processFirstDayUser(u.user.email, row.state, today)) ||
          didSend;
      }

      if (didSend) sent++;
      else skipped++;
    } catch (err) {
      failed++;
      errors.push({
        userId: row.user_id,
        message: err instanceof Error ? err.message : String(err),
      });
      console.error("[cron/notifications] user error", row.user_id, err);
    }
  }

  return res.status(200).json({
    ok: true,
    today,
    isFirstDay,
    isLastBusinessDay,
    total: rows.length,
    sent,
    skipped,
    failed,
    errors: errors.slice(0, 5),
  });
}
