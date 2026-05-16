import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { AppState } from "../types";
import { pullState, pushState } from "../lib/sync";
import { isTourActive } from "../lib/tour";

export type SyncStatus =
  | "disabled"
  | "offline"
  | "idle"
  | "syncing"
  | "synced"
  | "error";

interface Args {
  user: User | null;
  state: AppState;
  replaceState: (next: AppState) => void;
  onError?: (msg: string) => void;
}

const PUSH_DEBOUNCE_MS = 3000;

export function useSync({ user, state, replaceState, onError }: Args) {
  const [status, setStatus] = useState<SyncStatus>(
    user ? "idle" : "disabled",
  );
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  /** Most recent lastModified that has been confirmed in sync (either pulled
   *  from server or pushed to it). Lets us skip pushes that would echo a
   *  pull, and detect "local newer than server" correctly. */
  const syncedLM = useRef<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const pushingRef = useRef(false);

  /* ── Initial sync on login ───────────────────────────────────────── */
  useEffect(() => {
    if (!user) {
      setStatus("disabled");
      syncedLM.current = null;
      return;
    }
    let cancelled = false;

    (async () => {
      setStatus("syncing");
      try {
        const remote = await pullState(user.id);
        if (cancelled) return;

        const localLM = new Date(state.lastModified).getTime();
        const remoteLM = remote ? new Date(remote.lastModified).getTime() : 0;

        if (!remote) {
          // Brand-new account: seed with whatever we have locally (if any).
          if (state.rows.length > 0) {
            const confirmed = await pushState(user.id, state);
            syncedLM.current = confirmed;
          } else {
            syncedLM.current = state.lastModified;
          }
        } else if (remoteLM > localLM) {
          replaceState(remote);
          syncedLM.current = remote.lastModified;
        } else if (localLM > remoteLM) {
          const confirmed = await pushState(user.id, state);
          syncedLM.current = confirmed;
        } else {
          syncedLM.current = state.lastModified;
        }

        setLastSyncAt(new Date().toISOString());
        setStatus(navigator.onLine ? "synced" : "offline");
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        onError?.(`Falha ao sincronizar: ${(e as Error).message}`);
      }
    })();

    return () => {
      cancelled = true;
    };
    // We deliberately depend ONLY on user.id — re-running this on every
    // local state change would clobber edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /* ── Debounced push on local mutation ────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    // Durante o tour o state é demo — nunca subir pra nuvem.
    if (isTourActive()) return;
    if (state.lastModified === syncedLM.current) return;
    if (!navigator.onLine) {
      setStatus("offline");
      return;
    }
    if (pushingRef.current) return;

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      pushingRef.current = true;
      setStatus("syncing");
      try {
        const confirmed = await pushState(user.id, state);
        syncedLM.current = confirmed;
        setLastSyncAt(new Date().toISOString());
        setStatus("synced");
      } catch (e) {
        setStatus("error");
        onError?.(`Falha ao salvar na nuvem: ${(e as Error).message}`);
      } finally {
        pushingRef.current = false;
      }
    }, PUSH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastModified, user?.id]);

  /* ── React to connectivity changes ───────────────────────────────── */
  useEffect(() => {
    const goOnline = () => {
      if (!user) return;
      // If we have un-pushed local changes, the push effect will fire
      // because state.lastModified !== syncedLM. But we still want to
      // pull-then-push if we just regained connectivity.
      setStatus("syncing");
      (async () => {
        try {
          const remote = await pullState(user.id);
          const localLM = new Date(state.lastModified).getTime();
          const remoteLM = remote
            ? new Date(remote.lastModified).getTime()
            : 0;
          if (remote && remoteLM > localLM) {
            replaceState(remote);
            syncedLM.current = remote.lastModified;
          } else if (localLM > remoteLM) {
            const confirmed = await pushState(user.id, state);
            syncedLM.current = confirmed;
          }
          setLastSyncAt(new Date().toISOString());
          setStatus("synced");
        } catch (e) {
          setStatus("error");
          onError?.(`Falha ao reconectar: ${(e as Error).message}`);
        }
      })();
    };
    const goOffline = () => setStatus(user ? "offline" : "disabled");

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    if (user && !navigator.onLine) setStatus("offline");

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return { status, lastSyncAt };
}
