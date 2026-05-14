import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getUserFromRequest } from "../_lib/auth";
import { getSupabaseAdmin } from "../_lib/supabaseAdmin";
import { generateAnalysis } from "../_lib/anthropic";
import { env } from "../_lib/env";

interface AnalyzeBody {
  businessId: string;
  businessName: string;
  mes: number;
  ano: number;
  monthLabel: string;
  dataHash: string;
  contextXml: string;
  /** Quando true, ignora o cache e força nova chamada (ainda respeita
   *  rate limit e kill switch). */
  force?: boolean;
}

interface AnalyzeResponse {
  content: string;
  model: string;
  cached: boolean;
  generatedAt: string;
  quota: {
    used: number;
    limit: number;
    remaining: number;
  };
}

function isValidBody(body: unknown): body is AnalyzeBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.businessId === "string" &&
    b.businessId.length > 0 &&
    typeof b.businessName === "string" &&
    typeof b.mes === "number" &&
    b.mes >= 0 &&
    b.mes <= 11 &&
    typeof b.ano === "number" &&
    b.ano >= 2000 &&
    b.ano <= 2100 &&
    typeof b.monthLabel === "string" &&
    typeof b.dataHash === "string" &&
    b.dataHash.length > 0 &&
    typeof b.contextXml === "string" &&
    b.contextXml.length > 0 &&
    b.contextXml.length < 60_000
  );
}

function startOfMonthIso(now = new Date()): string {
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  // ─── 1. Auth ──────────────────────────────────────────────────
  let user;
  try {
    user = await getUserFromRequest(req.headers.authorization);
  } catch {
    return res
      .status(401)
      .json({ error: "unauthorized", message: "Sessão inválida ou expirada." });
  }

  // ─── 2. Validação do payload ──────────────────────────────────
  if (!isValidBody(req.body)) {
    return res
      .status(400)
      .json({ error: "invalid_body", message: "Payload inválido." });
  }
  const body = req.body;
  const supabase = getSupabaseAdmin();
  const monthStart = startOfMonthIso();

  // ─── 3. Cache hit? ────────────────────────────────────────────
  if (!body.force) {
    const { data: cached, error: cacheErr } = await supabase
      .from("ai_analysis_cache")
      .select("content, model, data_hash, created_at")
      .eq("user_id", user.id)
      .eq("business_id", body.businessId)
      .eq("mes", body.mes)
      .eq("ano", body.ano)
      .maybeSingle();

    if (cacheErr) {
      console.error("[ai/analyze] cache lookup error", cacheErr);
    } else if (cached && cached.data_hash === body.dataHash) {
      const quota = await getQuota(supabase, user.id, monthStart);
      const response: AnalyzeResponse = {
        content: cached.content,
        model: cached.model,
        cached: true,
        generatedAt: cached.created_at,
        quota,
      };
      return res.status(200).json(response);
    }
  }

  // ─── 4. Rate limit por usuário ────────────────────────────────
  const quota = await getQuota(supabase, user.id, monthStart);
  if (quota.remaining <= 0) {
    return res.status(429).json({
      error: "user_quota_exceeded",
      message: `Você já gerou ${quota.limit} análises este mês. O limite é renovado no dia 1º do próximo mês.`,
      quota,
    });
  }

  // ─── 5. Kill switch global ────────────────────────────────────
  const { data: globalUsage, error: globalErr } = await supabase
    .from("ai_usage")
    .select("cost_cents")
    .gte("created_at", monthStart);
  if (globalErr) {
    console.error("[ai/analyze] global usage lookup error", globalErr);
    return res
      .status(500)
      .json({ error: "internal_error", message: "Erro ao verificar uso." });
  }
  const totalCents = (globalUsage ?? []).reduce(
    (sum, row) => sum + (row.cost_cents ?? 0),
    0,
  );
  if (totalCents >= env.monthlyBudgetCents) {
    return res.status(503).json({
      error: "service_budget_exceeded",
      message:
        "A análise por IA está temporariamente indisponível. Tente novamente no próximo mês.",
    });
  }

  // ─── 6. Chama Anthropic ───────────────────────────────────────
  let result;
  try {
    result = await generateAnalysis({
      contextXml: body.contextXml,
      businessName: body.businessName || "seu empreendimento",
      monthLabel: body.monthLabel,
    });
  } catch (err) {
    console.error("[ai/analyze] anthropic error", err);
    return res.status(502).json({
      error: "ai_provider_error",
      message: "Não foi possível gerar a análise agora. Tente novamente em instantes.",
    });
  }

  // ─── 7. Persiste cache + log de uso ───────────────────────────
  const { error: upsertErr } = await supabase
    .from("ai_analysis_cache")
    .upsert(
      {
        user_id: user.id,
        business_id: body.businessId,
        mes: body.mes,
        ano: body.ano,
        data_hash: body.dataHash,
        content: result.content,
        model: result.model,
        tokens_input: result.tokensInput,
        tokens_output: result.tokensOutput,
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id,business_id,mes,ano" },
    );
  if (upsertErr) {
    console.error("[ai/analyze] cache upsert error", upsertErr);
    // Não falha a request — análise já foi gerada e cobrada.
  }

  const { error: logErr } = await supabase.from("ai_usage").insert({
    user_id: user.id,
    business_id: body.businessId,
    mes: body.mes,
    ano: body.ano,
    model: result.model,
    tokens_input: result.tokensInput,
    tokens_output: result.tokensOutput,
    cost_cents: result.costCents,
  });
  if (logErr) {
    console.error("[ai/analyze] usage log error", logErr);
  }

  const newQuota = await getQuota(supabase, user.id, monthStart);
  const response: AnalyzeResponse = {
    content: result.content,
    model: result.model,
    cached: false,
    generatedAt: new Date().toISOString(),
    quota: newQuota,
  };
  return res.status(200).json(response);
}

/**
 * Quota = quantas análises distintas (mes,ano) o usuário já gerou no
 * mês corrente. Cache hits não entram (não inserem em ai_usage).
 */
async function getQuota(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  monthStartIso: string,
): Promise<AnalyzeResponse["quota"]> {
  const { data, error } = await supabase
    .from("ai_usage")
    .select("mes, ano")
    .eq("user_id", userId)
    .gte("created_at", monthStartIso);
  const limit = env.userMonthlyLimit;
  if (error) {
    console.error("[ai/analyze] quota lookup error", error);
    return { used: 0, limit, remaining: limit };
  }
  const distinct = new Set((data ?? []).map((r) => `${r.ano}-${r.mes}`));
  const used = distinct.size;
  return { used, limit, remaining: Math.max(0, limit - used) };
}
