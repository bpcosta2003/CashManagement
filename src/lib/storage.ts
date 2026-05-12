import type { AppState, AppSettings, BusinessProfile } from "../types";

const STORAGE_KEY = "controle-caixa:v1";
const LAST_BACKUP_KEY = "controle-caixa:last-backup";
const FIRST_USE_KEY = "controle-caixa:first-use-acked";
const CURRENT_VERSION = 1;

function defaultBusiness(): BusinessProfile {
  return { name: "", type: "salao" };
}

function defaultSettings(): AppSettings {
  return { autoBackupConsent: null };
}

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
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getStorageSize(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? "";
    return Math.round((raw.length / 1024) * 10) / 10;
  } catch {
    return 0;
  }
}

function migrate(state: AppState): AppState {
  if (!state.version) state.version = CURRENT_VERSION;
  // Optional fields added later — fill defaults so the rest of the
  // app doesn't have to deal with undefined.
  if (!state.business) state.business = defaultBusiness();
  if (!state.settings) state.settings = defaultSettings();
  return state;
}

export function initialState(): AppState {
  return {
    version: CURRENT_VERSION,
    rows: [],
    lastModified: new Date().toISOString(),
    business: defaultBusiness(),
    settings: defaultSettings(),
  };
}

/* ────────────────────────────────────────────────────────────────────
 * Persistent storage: ask the browser to keep our data even under
 * disk pressure.
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
 * Backup tracking.
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
 * First-use onboarding flag (legado — mantido para usuários que já
 * passaram pela versão antiga; novo onboarding usa o campo
 * business.name no AppState).
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
