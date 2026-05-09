import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

let client: SupabaseClient | null = null;

if (URL && ANON_KEY) {
  client = createClient(URL, ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: localStorage,
      storageKey: "controle-caixa:auth",
    },
  });
}

/** Returns the Supabase client, or null when env vars are not set. */
export function getSupabase(): SupabaseClient | null {
  return client;
}

export function isSupabaseConfigured(): boolean {
  return client !== null;
}
