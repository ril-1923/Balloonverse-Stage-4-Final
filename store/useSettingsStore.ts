import { create } from 'zustand';
import { DEFAULT_SETTINGS, SENSITIVITY_RANGE, type Settings } from '../types/settings';
import { finiteNumber, isRecord, KEYS, readStored, removeStored, writeStored } from '../utils/storage';

const QUALITIES = ['low', 'medium', 'high'] as const;
const CAMERAS = ['chase', 'basket', 'side', 'cinematic'] as const;
const TIMES = ['auto', 'sunrise', 'morning', 'noon', 'goldenHour', 'sunset', 'night'] as const;
const MOTION = ['system', 'on', 'off'] as const;

function oneOf<T extends string>(list: readonly T[], v: unknown, fallback: T): T {
  return list.find((x) => x === v) ?? fallback;
}

/** Cleans stored settings. Every field is validated on its own; bad fields take their default. */
export function parseSettings(raw: unknown): Settings | null {
  if (!isRecord(raw)) return null;
  const d = DEFAULT_SETTINGS;
  return {
    quality: oneOf(QUALITIES, raw.quality, d.quality),
    soundOn: typeof raw.soundOn === 'boolean' ? raw.soundOn : d.soundOn,
    volume: finiteNumber(raw.volume, d.volume, 0, 1),
    sensitivity: finiteNumber(raw.sensitivity, d.sensitivity, SENSITIVITY_RANGE.min, SENSITIVITY_RANGE.max),
    hudVisible: typeof raw.hudVisible === 'boolean' ? raw.hudVisible : d.hudVisible,
    cameraPreference: oneOf(CAMERAS, raw.cameraPreference, d.cameraPreference),
    timeOfDay: oneOf(TIMES, raw.timeOfDay, d.timeOfDay),
    reducedMotion: oneOf(MOTION, raw.reducedMotion, d.reducedMotion),
  };
}

const load = (): Settings => readStored(KEYS.settings, parseSettings, () => ({ ...DEFAULT_SETTINGS }));

interface SettingsState extends Settings {
  set: (patch: Partial<Settings>) => void;
  toggleSound: () => void;
  toggleHud: () => void;
  resetSettings: () => void;
  hydrate: () => void;
}

const pick = (s: SettingsState): Settings => ({
  quality: s.quality, soundOn: s.soundOn, volume: s.volume, sensitivity: s.sensitivity, hudVisible: s.hudVisible,
  cameraPreference: s.cameraPreference, timeOfDay: s.timeOfDay, reducedMotion: s.reducedMotion,
});

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...load(),
  set: (patch) => {
    const merged = parseSettings({ ...pick(get()), ...patch }) as Settings;
    set(merged);
    writeStored(KEYS.settings, merged);
  },
  toggleSound: () => get().set({ soundOn: !get().soundOn }),
  toggleHud: () => get().set({ hudVisible: !get().hudVisible }),
  resetSettings: () => {
    removeStored(KEYS.settings);
    set({ ...DEFAULT_SETTINGS });
  },
  hydrate: () => set(load()),
}));
