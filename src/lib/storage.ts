import type { AppState } from "../types";

const STORAGE_KEY = "controle-caixa:v1";
const LAST_BACKUP_KEY = "controle-caixa:last-backup";
const FIRST_USE_KEY = "controle-caixa:first-use-acked";
const CURRENT_VERSION = 1;

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    return migrate(parsed);
  } catch {
    return null;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      window.dispatchEvent(new CustomEvent("storage-quota-exceeded"));
    }
    console.error("Erro ao salvar no localStorage:", e);
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getStorageSize(): number {
  const raw = localStorage.getItem(STORAGE_KEY) ?? "";
  return Math.round((raw.length / 1024) * 10) / 10;
}

function migrate(state: AppState): AppState {
  if (!state.version) state.version = CURRENT_VERSION;
  return state;
}

export function initialState(): AppState {
  return {
    version: CURRENT_VERSION,
    rows: [],
    lastModified: new Date().toISOString(),
  };
}

/* ────────────────────────────────────────────────────────────────────
 * Persistent storage: ask the browser to keep our data even under
 * disk pressure. PWAs installed on home screen typically get this
 * automatically; on regular tabs it depends on browser heuristics.
 * ──────────────────────────────────────────────────────────────────── */
export async function requestPersistentStorage(): Promise<{
  supported: boolean;
  persisted: boolean;
}> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) {
    return { supported: false, persisted: false };
  }
  try {
    const already = await navigator.storage.persisted();
    if (already) return { supported: true, persisted: true };
    const granted = await navigator.storage.persist();
    return { supported: true, persisted: granted };
  } catch {
    return { supported: true, persisted: false };
  }
}

export async function isStoragePersisted(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persisted) return false;
  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}

/* ────────────────────────────────────────────────────────────────────
 * Backup tracking — separate key so it survives a "reset all data"
 * (we want to know when the user *actually* exported, even after a
 * fresh import).
 * ──────────────────────────────────────────────────────────────────── */
export function getLastBackup(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

export function setLastBackup(iso = new Date().toISOString()): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, iso);
  } catch {
    /* ignore */
  }
}

export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}

/* ────────────────────────────────────────────────────────────────────
 * First-use onboarding flag.
 * ──────────────────────────────────────────────────────────────────── */
export function getFirstUseAcked(): boolean {
  try {
    return localStorage.getItem(FIRST_USE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setFirstUseAcked(): void {
  try {
    localStorage.setItem(FIRST_USE_KEY, "1");
  } catch {
    /* ignore */
  }
}
