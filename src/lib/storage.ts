import type { AppState } from "../types";

const STORAGE_KEY = "controle-caixa:v1";
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
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        lastModified: new Date().toISOString(),
      }),
    );
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
