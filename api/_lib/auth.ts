import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export interface AuthedUser {
  id: string;
  email: string | null;
}

/**
 * Valida o JWT do Supabase enviado no header Authorization e retorna
 * o usuário. Lança Error em caso de falha (caller transforma em 401).
 *
 * Implementação: usamos um client efêmero e chamamos auth.getUser(token),
 * que valida assinatura + expiração via API do Supabase. Mais robusto
 * que decodificar o JWT manualmente.
 */
export async function getUserFromRequest(
  authHeader: string | null | undefined,
): Promise<AuthedUser> {
  if (!authHeader) {
    throw new Error("missing_authorization");
  }
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!match) {
    throw new Error("invalid_authorization");
  }
  const token = match[1].trim();
  if (!token) throw new Error("invalid_authorization");

  const client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    throw new Error("invalid_token");
  }

  return { id: data.user.id, email: data.user.email ?? null };
}
