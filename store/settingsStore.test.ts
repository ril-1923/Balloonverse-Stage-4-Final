import { beforeEach, describe, expect, it } from 'vitest';
import { parseSettings, useSettingsStore } from './useSettingsStore';
import { useEnvironmentStore } from './useEnvironmentStore';
import { DEFAULT_SETTINGS, SENSITIVITY_RANGE } from '../types/settings';
import { createMemoryStorage, KEYS, setStorageBackend } from '../utils/storage';
import { getWorld, WORLDS } from '../simulation/worldDefinitions';

const s = () => useSettingsStore.getState();
let mem: ReturnType<typeof createMemoryStorage>;

beforeEach(() => {
  mem = createMemoryStorage();
  setStorageBackend(mem);
  s().resetSettings();
});

describe('settings', () => {
  it('starts with the documented defaults', () => {
    expect(parseSettings({})).toEqual(DEFAULT_SETTINGS);
    expect(s()).toMatchObject(DEFAULT_SETTINGS);
  });

  it('saves every change and restores it after a reload', () => {
    s().set({ quality: 'low', soundOn: false, volume: 0.25, sensitivity: 1.8, hudVisible: false, cameraPreference: 'cinematic', timeOfDay: 'sunset', reducedMotion: 'on' });
    expect(JSON.parse(mem.dump()[KEYS.settings])).toMatchObject({ quality: 'low', volume: 0.25, timeOfDay: 'sunset' });
    useSettingsStore.setState({ ...DEFAULT_SETTINGS }); // simulate a fresh page
    s().hydrate();
    expect(s()).toMatchObject({
      quality: 'low', soundOn: false, volume: 0.25, sensitivity: 1.8, hudVisible: false,
      cameraPreference: 'cinematic', timeOfDay: 'sunset', reducedMotion: 'on',
    });
  });

  it('clamps volume and sensitivity to their ranges', () => {
    s().set({ volume: 7, sensitivity: 99 });
    expect(s().volume).toBe(1);
    expect(s().sensitivity).toBe(SENSITIVITY_RANGE.max);
    s().set({ volume: -1, sensitivity: -5 });
    expect(s().volume).toBe(0);
    expect(s().sensitivity).toBe(SENSITIVITY_RANGE.min);
  });

  it('rejects invalid values field by field and keeps the good ones', () => {
    expect(parseSettings({ quality: 'ultra', soundOn: 'yes', volume: 'loud', sensitivity: NaN, hudVisible: false, cameraPreference: 'top', timeOfDay: 'teatime', reducedMotion: 'maybe' }))
      .toEqual({ ...DEFAULT_SETTINGS, hudVisible: false });
    expect(parseSettings('nope')).toBeNull();
    expect(parseSettings([])).toBeNull();
  });

  it('recovers from corrupt storage', () => {
    mem.setItem(KEYS.settings, '{{{');
    s().hydrate();
    expect(s()).toMatchObject(DEFAULT_SETTINGS);
  });

  it('toggles sound and HUD', () => {
    s().toggleSound();
    expect(s().soundOn).toBe(false);
    s().toggleSound();
    expect(s().soundOn).toBe(true);
    s().toggleHud();
    expect(s().hudVisible).toBe(false);
  });

  it('reset restores defaults and clears the stored copy', () => {
    s().set({ quality: 'low', volume: 0.1 });
    s().resetSettings();
    expect(s()).toMatchObject(DEFAULT_SETTINGS);
    expect(mem.dump()[KEYS.settings]).toBeUndefined();
  });

  it('the time-of-day preference is used when choosing a world, "auto" uses the world suggestion', () => {
    s().set({ timeOfDay: 'auto' });
    for (const w of WORLDS) {
      useEnvironmentStore.getState().selectWorld(w.id);
      expect(useEnvironmentStore.getState().timeOfDay).toBe(getWorld(w.id).defaults.timeOfDay);
    }
    s().set({ timeOfDay: 'noon' });
    for (const w of WORLDS) {
      useEnvironmentStore.getState().selectWorld(w.id);
      expect(useEnvironmentStore.getState().timeOfDay).toBe('noon');
      expect(useEnvironmentStore.getState().weather).toBe(w.defaults.weather);
    }
  });
});
