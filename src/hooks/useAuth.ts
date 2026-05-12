import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

export interface AuthState {
  configured: boolean;
  loading: boolean;
  user: User | null;
  session: Session | null;
}

/**
 * Traduz mensagens de erro do Supabase Auth para português, mantendo
 * a estrutura original quando não há tradução conhecida.
 */
function translateAuthError(message: string): string {
  // "For security purposes, you can only request this after X seconds."
  const rateLimit = /you can only request this after (\d+) seconds?/i.exec(
    message,
  );
  if (rateLimit) {
    const secs = parseInt(rateLimit[1], 10);
    return `Por segurança, aguarde ${secs} segundo${
      secs === 1 ? "" : "s"
    } antes de pedir outro link mágico.`;
  }

  if (/email rate limit exceeded/i.test(message)) {
    return "Muitas tentativas de envio. Aguarde alguns minutos e tente novamente.";
  }

  if (/invalid email|invalid login/i.test(message)) {
    return "E-mail inválido. Verifique e tente de novo.";
  }

  if (/signups not allowed|signup is disabled/i.test(message)) {
    return "Cadastros novos estão desativados. Fale com o administrador.";
  }

  if (/captcha verification process failed/i.test(message)) {
    return "Falha na verificação anti-robô. Tente novamente.";
  }

  if (/network|fetch|timeout/i.test(message)) {
    return "Sem conexão com o servidor. Verifique sua internet e tente de novo.";
  }

  // Fallback: retorna a mensagem original.
  return message;
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
      if (!supabase) throw new Error("Supabase não configurado");
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        throw new Error(translateAuthError(error.message));
      }
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, [supabase]);

  return { ...state, signInWithEmail, signOut };
}
