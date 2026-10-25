import { create } from 'zustand';
import { BALLOON_PRESETS, SAMPLE_DESIGN_NAMES } from '../simulation/balloonPresets';
import {
  BASKETS, BURNERS, DEFAULT_BALLOON, MATERIALS, PATTERNS,
  type BalloonConfig, type SavedDesign,
} from '../types/balloon';
import { isHexColor, isIsoDate, isRecord, KEYS, readStored, writeStored } from '../utils/storage';

export const MAX_NAME = 28;
const clone = (c: BalloonConfig): BalloonConfig => ({ ...c, colors: [...c.colors] });

/** Trims, collapses whitespace and limits length. Returns null if nothing usable remains. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const n = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME).trim();
  return n.length > 0 ? n : null;
}

/** Makes a name unique among `taken` (case-insensitive) by adding " (2)", " (3)" and so on. */
export function uniqueName(name: string, taken: string[]): string {
  const lower = new Set(taken.map((t) => t.toLowerCase()));
  if (!lower.has(name.toLowerCase())) return name;
  for (let n = 2; n < 1000; n++) {
    const suffix = ` (${n})`;
    const candidate = `${name.slice(0, MAX_NAME - suffix.length).trim()}${suffix}`;
    if (!lower.has(candidate.toLowerCase())) return candidate;
  }
  return `${name.slice(0, 20)} ${Date.now()}`;
}

/** Validates unknown data into a balloon config, replacing anything invalid with defaults. */
export function parseBalloonConfig(raw: unknown): BalloonConfig | null {
  if (!isRecord(raw)) return null;
  const colors = Array.isArray(raw.colors) ? raw.colors.filter(isHexColor) : [];
  while (colors.length < 3) colors.push(DEFAULT_BALLOON.colors[colors.length]);
  const pick = <T extends string>(list: { id: T }[], v: unknown, d: T): T => (list.find((x) => x.id === v)?.id ?? d);
  return {
    name: cleanName(raw.name) ?? DEFAULT_BALLOON.name,
    colors: colors.slice(0, 3),
    pattern: pick(PATTERNS, raw.pattern, DEFAULT_BALLOON.pattern),
    material: pick(MATERIALS, raw.material, DEFAULT_BALLOON.material),
    basket: pick(BASKETS, raw.basket, DEFAULT_BALLOON.basket),
    burner: pick(BURNERS, raw.burner, DEFAULT_BALLOON.burner),
  };
}

export function parseDesigns(raw: unknown): SavedDesign[] | null {
  if (!Array.isArray(raw)) return null;
  const out: SavedDesign[] = [];
  const ids = new Set<string>();
  for (const item of raw) {
    if (!isRecord(item) || typeof item.id !== 'string' || ids.has(item.id)) continue;
    const config = parseBalloonConfig(item.config);
    const name = cleanName(item.name);
    if (!config || !name) continue;
    ids.add(item.id);
    out.push({ id: item.id, name, config: { ...config, name }, createdAt: isIsoDate(item.createdAt) ? item.createdAt : new Date(0).toISOString() });
  }
  return out;
}

let counter = 0;
const newId = () => `d-${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function sampleDesigns(): SavedDesign[] {
  return SAMPLE_DESIGN_NAMES.map((name, i) => {
    const preset = BALLOON_PRESETS.find((p) => p.name === name) as BalloonConfig;
    return { id: `sample-${i + 1}`, name, config: clone(preset), createdAt: new Date(Date.UTC(2024, 0, 1 + i)).toISOString() };
  });
}

export type SaveResult = { ok: true; name: string; renamed: boolean } | { ok: false; error: string };

interface BalloonState {
  current: BalloonConfig;
  designs: SavedDesign[];
  update: (patch: Partial<BalloonConfig>) => void;
  setColor: (slot: number, hex: string) => void;
  applyPreset: (name: string) => void;
  resetCurrent: () => void;
  saveCurrent: () => SaveResult;
  loadDesign: (id: string) => boolean;
  renameDesign: (id: string, name: string) => SaveResult;
  deleteDesign: (id: string) => void;
  restoreSamples: () => number;
  /** Re-reads everything from storage (used on start-up and in tests). */
  hydrate: () => void;
}

function load(): { current: BalloonConfig; designs: SavedDesign[] } {
  return {
    current: readStored(KEYS.currentDesign, parseBalloonConfig, () => clone(DEFAULT_BALLOON)),
    designs: readStored(KEYS.designs, parseDesigns, sampleDesigns),
  };
}

export const useBalloonStore = create<BalloonState>((set, get) => {
  const persistCurrent = () => writeStored(KEYS.currentDesign, get().current);
  const persistDesigns = () => writeStored(KEYS.designs, get().designs);
  const setCurrent = (current: BalloonConfig) => {
    set({ current });
    persistCurrent();
  };

  return {
    ...load(),
    update: (patch) => {
      const next = { ...get().current, ...patch };
      if (patch.name !== undefined) next.name = patch.name.slice(0, MAX_NAME);
      setCurrent(next);
    },
    setColor: (slot, hex) => {
      if (!isHexColor(hex) || slot < 0 || slot > 2) return;
      const colors = [...get().current.colors];
      colors[slot] = hex;
      setCurrent({ ...get().current, colors });
    },
    applyPreset: (name) => {
      const p = BALLOON_PRESETS.find((x) => x.name === name);
      if (p) setCurrent(clone(p));
    },
    resetCurrent: () => setCurrent(clone(DEFAULT_BALLOON)),
    saveCurrent: () => {
      const clean = cleanName(get().current.name);
      if (!clean) return { ok: false, error: 'Give your balloon a name first.' };
      const name = uniqueName(clean, get().designs.map((d) => d.name));
      const config = { ...clone(get().current), name };
      const design: SavedDesign = { id: newId(), name, config, createdAt: new Date().toISOString() };
      set({ designs: [...get().designs, design], current: config });
      persistDesigns();
      persistCurrent();
      return { ok: true, name, renamed: name !== clean };
    },
    loadDesign: (id) => {
      const d = get().designs.find((x) => x.id === id);
      if (!d) return false;
      setCurrent(clone(d.config));
      return true;
    },
    renameDesign: (id, raw) => {
      const clean = cleanName(raw);
      if (!clean) return { ok: false, error: 'A design name cannot be empty.' };
      const target = get().designs.find((d) => d.id === id);
      if (!target) return { ok: false, error: 'That design no longer exists.' };
      const others = get().designs.filter((d) => d.id !== id).map((d) => d.name);
      const name = uniqueName(clean, others);
      set({ designs: get().designs.map((d) => (d.id === id ? { ...d, name, config: { ...d.config, name } } : d)) });
      persistDesigns();
      return { ok: true, name, renamed: name !== clean };
    },
    deleteDesign: (id) => {
      set({ designs: get().designs.filter((d) => d.id !== id) });
      persistDesigns();
    },
    restoreSamples: () => {
      const have = new Set(get().designs.map((d) => d.name.toLowerCase()));
      const missing = sampleDesigns().filter((s) => !have.has(s.name.toLowerCase()));
      if (missing.length === 0) return 0;
      set({ designs: [...get().designs, ...missing.map((m) => ({ ...m, id: newId() }))] });
      persistDesigns();
      return missing.length;
    },
    hydrate: () => set(load()),
  };
});
