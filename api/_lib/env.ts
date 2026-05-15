function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v.trim();
}

function optional(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : fallback;
}

function optionalInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const env = {
  get supabaseUrl() {
    return required("SUPABASE_URL");
  },
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get anthropicApiKey() {
    return required("ANTHROPIC_API_KEY");
  },
  get anthropicModel() {
    return optional("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001");
  },
  get monthlyBudgetCents() {
    return optionalInt("AI_MONTHLY_BUDGET_CENTS", 2000);
  },
  get userMonthlyLimit() {
    return optionalInt("AI_USER_MONTHLY_LIMIT", 3);
  },
  get resendApiKey() {
    return required("RESEND_API_KEY");
  },
  /** Remetente das notificações — deve ser um domínio verificado no Resend
   *  (ex.: "Controle de Caixa <noreply@mycashmanagement.app>"). */
  get fromEmail() {
    return optional(
      "FROM_EMAIL",
      "Controle de Caixa <noreply@mycashmanagement.app>",
    );
  },
  /** Origem do link do app — usada nos CTAs do email. */
  get appUrl() {
    return optional("APP_URL", "https://mycashmanagement.app");
  },
  /** Endereço pra contato/feedback exibido nos emails e no app. */
  get supportEmail() {
    return optional("SUPPORT_EMAIL", "contact@mycashmanagement.app");
  },
  /** Secret pra autenticar invocações do cron. Vercel injeta automatica-
   *  mente via `CRON_SECRET` no Authorization header (`Bearer <secret>`).
   *  Definir manualmente em projetos self-hosted. */
  get cronSecret() {
    return optional("CRON_SECRET", "");
  },
};
