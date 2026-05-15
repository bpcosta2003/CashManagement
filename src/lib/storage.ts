import type { AppSettings, AppState, CatalogItem } from "../types";
import { uid } from "./calc";

const STORAGE_KEY = "controle-caixa:v1";
const PRE_TOUR_SNAPSHOT_KEY = "controle-caixa:v1-pre-tour";
const LAST_BACKUP_KEY = "controle-caixa:last-backup";
const FIRST_USE_KEY = "controle-caixa:first-use-acked";
const CURRENT_VERSION = 4;

function defaultSettings(): AppSettings {
  return { autoBackupConsent: null };
}

export function loadState(): AppState | null {
  try {
    // Se um tour foi interrompido (browser fechado, crash, etc.), o
    // snapshot do state real estará neste key. Restaura ele e descarta
    // o state "demo" que ficou em STORAGE_KEY.
    const snapshot = localStorage.getItem(PRE_TOUR_SNAPSHOT_KEY);
    if (snapshot) {
      try {
        const parsedSnap = JSON.parse(snapshot) as AppState;
        localStorage.removeItem(PRE_TOUR_SNAPSHOT_KEY);
        localStorage.setItem(STORAGE_KEY, snapshot);
        return migrate(parsedSnap);
      } catch {
        localStorage.removeItem(PRE_TOUR_SNAPSHOT_KEY);
      }
    }

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
  if (!state.catalog) state.catalog = [];
  if (!state.goals) state.goals = [];
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

  if (state.version < 3) {
    // v2 → v3: cria o catálogo a partir das linhas existentes.
    // Para cada (businessId, nome de serviço normalizado), cria um
    // CatalogItem com o nome mais usado e o valor mais recente como
    // sugestão. Linhas com servico vazio são ignoradas.
    const seeded = seedCatalogFromRows(state.rows);
    // Preserva itens já existentes (idempotente) — se o usuário tiver
    // adicionado manualmente algo em v2.5, não derruba.
    const existingKeys = new Set(
      state.catalog.map((c) => catalogKey(c.businessId, c.name)),
    );
    const merged = [
      ...state.catalog,
      ...seeded.filter(
        (c) => !existingKeys.has(catalogKey(c.businessId, c.name)),
      ),
    ];
    state.catalog = merged;
    state.version = 3;
  }

  if (state.version < 4) {
    // v3 → v4: introduz state.goals[]. Default vazio (sem metas).
    state.goals = state.goals ?? [];
    state.version = 4;
  }

  return state;
}

function catalogKey(businessId: string, name: string) {
  return `${businessId}|${name.trim().toLowerCase()}`;
}

/**
 * A partir de uma lista de Row, monta o catálogo inicial:
 * agrupa por (businessId, serviço normalizado), preserva a grafia mais
 * recente, e sugere o último valor lançado como defaultValue.
 */
function seedCatalogFromRows(rows: AppState["rows"]): CatalogItem[] {
  type Agg = {
    businessId: string;
    name: string;
    defaultValue?: number;
    lastUsedAt: string;
    createdAt: string;
  };
  const byKey = new Map<string, Agg>();
  // Ordena do mais antigo pro mais novo pra que o "último valor" sobrescreva.
  const sorted = [...rows].sort((a, b) =>
    a.criadoEm < b.criadoEm ? -1 : 1,
  );
  for (const r of sorted) {
    const name = r.servico.trim();
    if (!name || !r.businessId) continue;
    const key = catalogKey(r.businessId, name);
    const existing = byKey.get(key);
    const value = typeof r.valor === "number" && r.valor > 0 ? r.valor : undefined;
    if (existing) {
      byKey.set(key, {
        ...existing,
        name,
        defaultValue: value ?? existing.defaultValue,
        lastUsedAt: r.criadoEm,
      });
    } else {
      byKey.set(key, {
        businessId: r.businessId,
        name,
        defaultValue: value,
        lastUsedAt: r.criadoEm,
        createdAt: r.criadoEm,
      });
    }
  }
  return Array.from(byKey.values()).map((a) => ({
    id: uid(),
    ...a,
  }));
}

export function initialState(): AppState {
  return {
    version: CURRENT_VERSION,
    rows: [],
    clients: [],
    catalog: [],
    goals: [],
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
