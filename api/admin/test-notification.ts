import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getUserFromRequest } from "../_lib/auth";
import { getSupabaseAdmin } from "../_lib/supabaseAdmin";
import {
  todayInBrt,
  lastBusinessDayOfMonth,
  processFirstDayUser,
  processLastDayUser,
  type StateShape,
} from "../_lib/notifications";

/**
 * Endpoint de teste — dispara o email de notificação imediatamente,
 * **só pro próprio usuário autenticado**. Não respeita a flag
 * emailNotifications (a ideia é poder testar antes de ligar).
 *
 * POST /api/admin/test-notification
 * Body: { kind: "firstDay" | "lastBusinessDay" }
 * Headers: Authorization: Bearer <supabase-jwt>
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  // ─── Auth ─────────────────────────────────────────────────────────
  let user;
  try {
    user = await getUserFromRequest(req.headers.authorization);
  } catch (err) {
    console.error("[test-notification] auth error", err);
    return res
      .status(401)
      .json({ error: "unauthorized", message: "Faça login pra testar." });
  }
  if (!user.email) {
    return res.status(400).json({
      error: "no_email",
      message: "Sua conta não tem email associado.",
    });
  }

  // ─── Body ─────────────────────────────────────────────────────────
  const body = (req.body ?? {}) as { kind?: string };
  const kind = body.kind;
  if (kind !== "firstDay" && kind !== "lastBusinessDay") {
    return res.status(400).json({
      error: "invalid_kind",
      message: "kind deve ser 'firstDay' ou 'lastBusinessDay'.",
    });
  }

  // ─── Carrega o state do usuário ───────────────────────────────────
  const supabase = getSupabaseAdmin();
  const { data: row, error: stateErr } = await supabase
    .from("cash_state")
    .select("state")
    .eq("user_id", user.id)
    .maybeSingle();
  if (stateErr) {
    console.error("[test-notification] state query error", stateErr);
    return res
      .status(500)
      .json({ error: "state_query_failed", detail: stateErr.message });
  }
  if (!row?.state) {
    return res.status(400).json({
      error: "no_state",
      message: "Você ainda não tem dados sincronizados. Use o app primeiro.",
    });
  }
  const state = row.state as StateShape;

  // ─── Simula a data correta pra cada modo ─────────────────────────
  const today = todayInBrt();
  let sent = false;
  try {
    if (kind === "firstDay") {
      sent = await processFirstDayUser(
        user.email,
        state,
        { ...today, d: 1 },
      );
    } else {
      const lastDay = lastBusinessDayOfMonth(today.y, today.m);
      sent = await processLastDayUser(
        user.email,
        state,
        { ...today, d: lastDay },
      );
    }
  } catch (err) {
    console.error("[test-notification] send error", err);
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(502).json({
      error: "send_failed",
      message: `Falha ao enviar: ${msg}`,
    });
  }

  return res.status(200).json({
    ok: true,
    sent,
    to: user.email,
    kind,
    skippedReason: sent
      ? null
      : kind === "firstDay"
        ? "Todos os seus empreendimentos já têm meta deste mês — o email seria pulado pelo cron real."
        : "Nenhuma pendência nem insight detectado pra este mês — o email seria pulado pelo cron real.",
  });
}
