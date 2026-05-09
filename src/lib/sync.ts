import type { AppState } from "../types";
import { getSupabase } from "./supabase";

const TABLE = "cash_state";

interface RemoteRow {
  user_id: string;
  state: AppState;
  last_modified: string;
}

/** Pull the user's document. Returns null if there is none yet. */
export async function pullState(userId: string): Promise<AppState | null> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from(TABLE)
    .select("user_id, state, last_modified")
    .eq("user_id", userId)
    .maybeSingle<RemoteRow>();

  if (error) throw error;
  if (!data) return null;

  // Server's last_modified is authoritative.
  return { ...data.state, lastModified: data.last_modified };
}

/** Push the user's document (upsert). Returns the server-confirmed timestamp. */
export async function pushState(
  userId: string,
  state: AppState,
): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not configured");

  const last_modified = state.lastModified;
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      {
        user_id: userId,
        state,
        last_modified,
      },
      { onConflict: "user_id" },
    )
    .select("last_modified")
    .single<{ last_modified: string }>();

  if (error) throw error;
  return data.last_modified;
}
