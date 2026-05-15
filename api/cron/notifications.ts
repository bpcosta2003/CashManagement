import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin } from "../_lib/supabaseAdmin";
import { env } from "../_lib/env";
import {
  todayInBrt,
  lastBusinessDayOfMonth,
  processFirstDayUser,
  processLastDayUser,
  type StateShape,
} from "../_lib/notifications";

interface StateRow {
  user_id: string;
  state: StateShape;
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
