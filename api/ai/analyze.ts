import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getUserFromRequest } from "../_lib/auth";
import { getSupabaseAdmin } from "../_lib/supabaseAdmin";
import { generateAnalysis } from "../_lib/anthropic";
import { env } from "../_lib/env";
import {
  validateAndBuildContext,
  ValidationError,
  type AnalyzeBody as BuildBody,
} from "../_lib/aiContextServer";

interface AnalyzeBody extends BuildBody {
  // Mantido por compat com o cliente; o servidor sobrescreve o monthLabel
  // a partir do mes/ano validados.
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
  // Validate env vars first so a misconfigured deployment returns 500, not 401.
  let supabaseOk = true;
  try {
    void env.supabaseUrl;
    void env.supabaseServiceRoleKey;
  } catch (envErr) {
    console.error("[ai/analyze] missing env var", envErr);
    supabaseOk = false;
  }
  if (!supabaseOk) {
    return res.status(500).json({
      error: "server_misconfigured",
      message: "Configuração do servidor incompleta. Contate o suporte.",
    });
  }

  let user;
  try {
    user = await getUserFromRequest(req.headers.authorization);
  } catch (authErr) {
    console.error("[ai/analyze] auth error", authErr);
    return res
      .status(401)
      .json({ error: "unauthorized", message: "Sessão inválida ou expirada." });
  }

  // ─── 2. Validação + construção server-side do XML ─────────────
  // O cliente envia só os dados brutos (business + rows + goal). Tudo o
  // que vai pro Claude é montado aqui, em cima de campos validados —
  // qualquer `contextXml` enviado pelo cliente é IGNORADO. Esse é o
  // bloqueio anti prompt-injection.
  let context;
  try {
    context = validateAndBuildContext(req.body as AnalyzeBody);
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.code, message: err.message });
    }
    console.error("[ai/analyze] context build error", err);
    return res
      .status(400)
      .json({ error: "invalid_body", message: "Payload inválido." });
  }

  const body = req.body as AnalyzeBody;
  const supabase = getSupabaseAdmin();
  const monthStart = startOfMonthIso();

  // ─── 3. Cache hit? ────────────────────────────────────────────
  // Chave: (user_id, business_id, mes, ano). Comparamos data_hash
  // (calculado server-side) pra detectar mudanças nos lançamentos.
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
    } else if (cached && cached.data_hash === context.dataHash) {
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
      contextXml: context.contextXml,
      businessName: context.businessName,
      monthLabel: context.monthLabel,
    });
  } catch (err) {
    console.error("[ai/analyze] anthropic error", err);
    const mapped = mapAnthropicError(err);
    return res.status(mapped.status).json({
      error: mapped.code,
      message: mapped.message,
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
        data_hash: context.dataHash,
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

/**
 * Traduz erros do SDK da Anthropic em respostas HTTP úteis. Foca em
 * casos operacionais comuns (sem crédito, chave inválida, rate limit)
 * pra que a UI possa exibir mensagem clara em vez de "tente de novo".
 */
function mapAnthropicError(err: unknown): {
  status: number;
  code: string;
  message: string;
} {
  const e = err as { status?: number; message?: string } | null;
  const status = typeof e?.status === "number" ? e.status : 0;
  const msg = typeof e?.message === "string" ? e.message.toLowerCase() : "";

  if (status === 400 && msg.includes("credit balance")) {
    return {
      status: 503,
      code: "ai_provider_no_credit",
      message:
        "A análise por IA está temporariamente indisponível (sem crédito no provedor). Avise o administrador.",
    };
  }
  if (status === 401) {
    return {
      status: 503,
      code: "ai_provider_unauthorized",
      message:
        "A análise por IA está temporariamente indisponível (chave do provedor inválida).",
    };
  }
  if (status === 429) {
    return {
      status: 429,
      code: "ai_provider_rate_limited",
      message:
        "O provedor de IA está com muitas requisições. Tente de novo em alguns minutos.",
    };
  }
  if (status === 529 || status === 503) {
    return {
      status: 503,
      code: "ai_provider_overloaded",
      message:
        "O provedor de IA está sobrecarregado. Tente novamente em instantes.",
    };
  }
  return {
    status: 502,
    code: "ai_provider_error",
    message: "Não foi possível gerar a análise agora. Tente novamente em instantes.",
  };
}
