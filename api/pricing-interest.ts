import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin } from "./_lib/supabaseAdmin.js";
import { env } from "./_lib/env.js";

/**
 * POST /api/pricing-interest
 *
 * Coleta interesse em planos pagos pra Fase 0 da monetização. Não exige
 * autenticação — é deliberadamente público pra que visitantes anônimos
 * (vindos do LinkedIn, WhatsApp, etc.) consigam marcar interesse antes
 * de criar conta.
 *
 * Proteções contra abuso:
 *  - Validação estrita de email + tier (sem isso, qualquer bot enche)
 *  - Unique constraint (email, tier) no banco — re-submit é no-op
 *  - Captura IP/UA pra eventual investigação manual
 *  - Sem retorno do conteúdo da tabela (não vira oráculo de "esse email
 *    existe?")
 */

interface Body {
  email?: unknown;
  tier?: unknown;
  source?: unknown;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIER_VALUES = new Set(["pro", "ultra"]);
const MAX_EMAIL = 120;
const MAX_SOURCE = 40;

function sanitize(input: unknown, max: number): string {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, max);
}

function getClientIp(req: VercelRequest): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0].trim();
  if (Array.isArray(fwd) && fwd.length > 0) return fwd[0].split(",")[0].trim();
  return req.socket?.remoteAddress ?? "";
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  // Garante env vars antes de qualquer outra validação.
  try {
    void env.supabaseUrl;
    void env.supabaseServiceRoleKey;
  } catch (envErr) {
    console.error("[pricing-interest] missing env var", envErr);
    return res.status(500).json({
      error: "server_misconfigured",
      message: "Configuração do servidor incompleta.",
    });
  }

  const body = (req.body ?? {}) as Body;
  const email = sanitize(body.email, MAX_EMAIL).toLowerCase();
  const tier = sanitize(body.tier, 16);
  const source = sanitize(body.source, MAX_SOURCE);

  if (!email || !EMAIL_RE.test(email)) {
    return res
      .status(400)
      .json({ error: "invalid_email", message: "E-mail inválido." });
  }
  if (!TIER_VALUES.has(tier)) {
    return res
      .status(400)
      .json({ error: "invalid_tier", message: "Plano inválido." });
  }

  const supabase = getSupabaseAdmin();
  const ip = getClientIp(req);
  const ua = sanitize(req.headers["user-agent"], 250);

  // upsert com onConflict pra que re-submit do mesmo email+tier não
  // retorne erro — UX melhor que mostrar "já cadastrado".
  const { error } = await supabase.from("pricing_interest").upsert(
    {
      email,
      tier,
      source: source || null,
      user_agent: ua || null,
      ip_address: ip || null,
    },
    { onConflict: "email,tier", ignoreDuplicates: true },
  );

  if (error) {
    console.error("[pricing-interest] db error", error);
    return res.status(500).json({
      error: "internal_error",
      message: "Não foi possível registrar agora. Tente novamente em instantes.",
    });
  }

  return res.status(200).json({ ok: true });
}
