import type { AppSettings, AppState } from "../types";
import { uid } from "./calc";

const STORAGE_KEY = "controle-caixa:v1";
const LAST_BACKUP_KEY = "controle-caixa:last-backup";
const FIRST_USE_KEY = "controle-caixa:first-use-acked";
const CURRENT_VERSION = 2;

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

/**
 * Migra estados antigos pra o shape atual.
 *
 * v0/v1 → v2:
 *  - Antes: state.business (singular) + state.rows[]
 *  - Depois: state.businesses[] (lista) + state.activeBusinessId + cada row
 *    com businessId. state.business é mantido somente pra clientes velhos
 *    que ainda não atualizaram (ignorado por código novo).
 */
function migrate(state: AppState): AppState {
  if (!state.version) state.version = 1;

  // Defaults seguros (não bagunçam migração)
  if (!state.settings) state.settings = defaultSettings();
  if (!state.clients) state.clients = [];
  if (!state.businesses) state.businesses = [];
  if (typeof state.activeBusinessId !== "string") state.activeBusinessId = "";

  if (state.version < 2) {
    // Converte o business legado em um item de businesses[]
    if (
      state.businesses.length === 0 &&
      state.business &&
      state.business.name &&
      state.business.name.trim()
    ) {
      const newId = uid();
      state.businesses.push({
        id: newId,
        name: state.business.name.trim(),
        type: state.business.type ?? "salao",
        createdAt: new Date().toISOString(),
      });
      state.activeBusinessId = newId;
    }

    // Atribui businessId às linhas que ainda não tinham
    const fallbackId = state.businesses[0]?.id ?? "";
    state.rows = state.rows.map((r) => ({
      ...r,
      businessId: r.businessId || fallbackId,
    }));

    state.version = 2;
  }

  return state;
}

export function initialState(): AppState {
  return {
    version: CURRENT_VERSION,
    rows: [],
    clients: [],
    businesses: [],
    activeBusinessId: "",
    lastModified: new Date().toISOString(),
    settings: defaultSettings(),
  };
}

/* ────────────────────────────────────────────────────────────────────
 * Persistent storage.
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
 * First-use legado (mantido por compat — onboarding novo usa business).
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
