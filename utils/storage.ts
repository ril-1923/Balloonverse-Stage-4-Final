/**
 * Safe, versioned LocalStorage access. Never throws: unavailable storage, quota errors and corrupt
 * JSON all fall back to in-memory values / defaults.
 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const STORAGE_VERSION = 1;
export const KEYS = {
  designs: `balloonverse:v${STORAGE_VERSION}:designs`,
  currentDesign: `balloonverse:v${STORAGE_VERSION}:currentDesign`,
  progress: `balloonverse:v${STORAGE_VERSION}:progress`,
  environment: `balloonverse:v${STORAGE_VERSION}:environment`,
  settings: `balloonverse:v${STORAGE_VERSION}:settings`,
} as const;

export function createMemoryStorage(): StorageLike & { dump(): Record<string, string> } {
  const data = new Map<string, string>();
  return {
    getItem: (k) => (data.has(k) ? (data.get(k) as string) : null),
    setItem: (k, v) => void data.set(k, String(v)),
    removeItem: (k) => void data.delete(k),
    dump: () => Object.fromEntries(data),
  };
}

let override: StorageLike | null = null;
let fallback: StorageLike | null = null;

/** Tests (and unusual hosts) can replace the backend. Pass null to restore the default. */
export function setStorageBackend(backend: StorageLike | null): void {
  override = backend;
}

function backend(): StorageLike {
  if (override) return override;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const probe = '__bv_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return window.localStorage;
    }
  } catch {
    /* private mode, blocked storage, quota: use memory */
  }
  fallback ??= createMemoryStorage();
  return fallback;
}

/**
 * Reads and validates a stored JSON value. `validate` returns a cleaned value or null if the data
 * is unusable; in that case (or when the key is missing or the JSON is corrupt) `fallback()` is used.
 */
export function readStored<T>(key: string, validate: (raw: unknown) => T | null, fallbackValue: () => T): T {
  try {
    const text = backend().getItem(key);
    if (text === null) return fallbackValue();
    const cleaned = validate(JSON.parse(text));
    return cleaned === null ? fallbackValue() : cleaned;
  } catch {
    return fallbackValue();
  }
}

export function writeStored(key: string, value: unknown): boolean {
  try {
    backend().setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStored(key: string): void {
  try {
    backend().removeItem(key);
  } catch {
    /* ignore */
  }
}

/* ---- small validators shared by the stores ---- */
export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
export const isHexColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
export const finiteNumber = (v: unknown, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
export const isIsoDate = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));
