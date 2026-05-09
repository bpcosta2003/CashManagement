import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

export interface AuthState {
  configured: boolean;
  loading: boolean;
  user: User | null;
  session: Session | null;
}

export function useAuth() {
  const supabase = getSupabase();
  const configured = isSupabaseConfigured();

  const [state, setState] = useState<AuthState>({
    configured,
    loading: configured,
    user: null,
    session: null,
  });

  useEffect(() => {
    if (!supabase) return;
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setState((s) => ({
        ...s,
        loading: false,
        session: data.session,
        user: data.session?.user ?? null,
      }));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setState((s) => ({
        ...s,
        loading: false,
        session,
        user: session?.user ?? null,
      }));
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithEmail = useCallback(
    async (email: string) => {
      if (!supabase) throw new Error("Supabase not configured");
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, [supabase]);

  return { ...state, signInWithEmail, signOut };
}
