import { create } from 'zustand';
import { getWorld, WORLDS } from '../simulation/worldDefinitions';
import { TIMES_OF_DAY, WEATHERS, type TimeOfDay, type Weather, type WorldId } from '../types/environment';
import { useSettingsStore } from './useSettingsStore';
import { finiteNumber, isRecord, KEYS, readStored, writeStored } from '../utils/storage';

interface EnvironmentState {
  worldId: WorldId;
  timeOfDay: TimeOfDay;
  weather: Weather;
  /** User wind overrides. null means "automatic" (world wind scaled by weather). */
  windDirectionDeg: number | null;
  windStrength: number | null;
  /** Switches world and adopts that world's suggested time of day and weather. */
  selectWorld: (id: WorldId) => void;
  setTimeOfDay: (t: TimeOfDay) => void;
  setWeather: (w: Weather) => void;
  setWindDirection: (deg: number | null) => void;
  setWindStrength: (v: number | null) => void;
  hydrate: () => void;
}

type Persisted = Pick<EnvironmentState, 'worldId' | 'timeOfDay' | 'weather' | 'windDirectionDeg' | 'windStrength'>;

const startWorld = getWorld('mountain-valley');
const defaults = (): Persisted => ({
  worldId: startWorld.id,
  timeOfDay: startWorld.defaults.timeOfDay,
  weather: startWorld.defaults.weather,
  windDirectionDeg: null,
  windStrength: null,
});

/** Validates stored environment settings; invalid fields fall back to the defaults. */
export function parseEnvironment(raw: unknown): Persisted | null {
  if (!isRecord(raw)) return null;
  const d = defaults();
  const world = WORLDS.find((w) => w.id === raw.worldId);
  const dirOk = typeof raw.windDirectionDeg === 'number' && Number.isFinite(raw.windDirectionDeg);
  const strOk = typeof raw.windStrength === 'number' && Number.isFinite(raw.windStrength);
  return {
    worldId: world?.id ?? d.worldId,
    timeOfDay: TIMES_OF_DAY.find((t) => t.id === raw.timeOfDay)?.id ?? (world ? world.defaults.timeOfDay : d.timeOfDay),
    weather: WEATHERS.find((w) => w.id === raw.weather)?.id ?? (world ? world.defaults.weather : d.weather),
    windDirectionDeg: dirOk ? ((finiteNumber(raw.windDirectionDeg, 0, -1e6, 1e6) % 360) + 360) % 360 : null,
    windStrength: strOk ? finiteNumber(raw.windStrength, 0, 0, 12) : null,
  };
}

const loadEnvironment = (): Persisted => readStored(KEYS.environment, parseEnvironment, defaults);

export const useEnvironmentStore = create<EnvironmentState>((set) => ({
  ...loadEnvironment(),
  hydrate: () => set(loadEnvironment()),
  selectWorld: (id) => {
    const w = getWorld(id);
    const pref = useSettingsStore.getState().timeOfDay;
    set({ worldId: w.id, timeOfDay: pref === 'auto' ? w.defaults.timeOfDay : pref, weather: w.defaults.weather, windDirectionDeg: null, windStrength: null });
  },
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  setWeather: (weather) => set({ weather }),
  setWindDirection: (windDirectionDeg) => set({ windDirectionDeg }),
  setWindStrength: (windStrength) => set({ windStrength }),
}));

useEnvironmentStore.subscribe((s) =>
  writeStored(KEYS.environment, {
    worldId: s.worldId, timeOfDay: s.timeOfDay, weather: s.weather, windDirectionDeg: s.windDirectionDeg, windStrength: s.windStrength,
  }),
);
