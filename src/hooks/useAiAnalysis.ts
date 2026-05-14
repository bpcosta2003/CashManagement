import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";

export interface AiQuota {
  used: number;
  limit: number;
  remaining: number;
}

export interface AiAnalysisResult {
  content: string;
  model: string;
  cached: boolean;
  generatedAt: string;
  quota: AiQuota;
}

export interface AiAnalysisError {
  /** "user_quota_exceeded" | "service_budget_exceeded" | "ai_provider_error" | "unauthorized" | "network" | "unknown" */
  code: string;
  message: string;
  quota?: AiQuota;
}

interface AnalyzePayload {
  businessId: string;
  businessName: string;
  mes: number;
  ano: number;
  monthLabel: string;
  dataHash: string;
  contextXml: string;
  force?: boolean;
}

const AI_ENABLED =
  String(import.meta.env.VITE_AI_ENABLED ?? "").toLowerCase() === "true";

/**
 * Hook que chama POST /api/ai/analyze com o JWT do Supabase no header.
 * Requer usuário logado (a auth do app já cuida disso).
 *
 * Estados:
 *   loading: true durante a request
 *   result:  resposta bem sucedida (cache hit ou geração nova)
 *   error:   payload de erro estruturado pra UI tratar 429/503 diferente
 */
export function useAiAnalysis() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [error, setError] = useState<AiAnalysisError | null>(null);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const analyze = useCallback(async (payload: AnalyzePayload) => {
    if (!AI_ENABLED) {
      setError({
        code: "feature_disabled",
        message: "Análise IA desativada nesta instalação.",
      });
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setError({
        code: "supabase_not_configured",
        message: "Sincronização não configurada. Faça login pra usar a IA.",
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError({
          code: "unauthorized",
          message: "Faça login pra gerar a análise.",
        });
        return;
      }

      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = (await response.json().catch(() => null)) as
        | Record<string, unknown>
        | null;

      if (!response.ok || !json || typeof json.error === "string") {
        const errCode =
          typeof json?.error === "string" ? json.error : `http_${response.status}`;
        const errMessage =
          typeof json?.message === "string"
            ? json.message
            : "Não foi possível gerar a análise. Tente novamente.";
        setError({
          code: errCode,
          message: errMessage,
          quota: (json?.quota as AiQuota | undefined) ?? undefined,
        });
        return;
      }

      setResult(json as unknown as AiAnalysisResult);
    } catch (err) {
      console.error("[useAiAnalysis] network error", err);
      setError({
        code: "network",
        message: "Falha de rede ao chamar a IA. Verifique sua conexão.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  return { enabled: AI_ENABLED, loading, result, error, analyze, reset };
}

/**
 * Helper pra exibir condicionalmente a feature na UI sem precisar
 * instanciar o hook.
 */
export function isAiEnabled(): boolean {
  return AI_ENABLED;
}

/**
 * Reset automático do estado quando muda o mês/ano/business em foco —
 * pra não mostrar análise stale de outro contexto.
 */
export function useAiReset(
  reset: () => void,
  deps: ReadonlyArray<unknown>,
) {
  useEffect(reset, deps); // eslint-disable-line react-hooks/exhaustive-deps
}
