import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.js";

let admin: SupabaseClient | null = null;

/**
 * Cliente Supabase usando a service-role key — bypassa RLS.
 * NUNCA expor ao frontend. Usado apenas em Vercel Functions.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!admin) {
    admin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}
