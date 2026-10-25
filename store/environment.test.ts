import { beforeEach, describe, expect, it } from 'vitest';
import { parseEnvironment, useEnvironmentStore } from './useEnvironmentStore';
import { createMemoryStorage, KEYS, setStorageBackend } from '../utils/storage';
import { getWorld, WORLDS } from '../simulation/worldDefinitions';

describe('environment store', () => {
  beforeEach(() => useEnvironmentStore.getState().selectWorld('mountain-valley'));

  it('selecting a world adopts its suggested time of day and weather', () => {
    for (const w of WORLDS) {
      useEnvironmentStore.getState().selectWorld(w.id);
      const s = useEnvironmentStore.getState();
      expect(s.worldId).toBe(w.id);
      expect(s.timeOfDay).toBe(getWorld(w.id).defaults.timeOfDay);
      expect(s.weather).toBe(getWorld(w.id).defaults.weather);
    }
  });

  it('time of day, weather and wind can be changed independently of the world', () => {
    const st = useEnvironmentStore.getState();
    st.selectWorld('desert-adventure');
    st.setTimeOfDay('sunset');
    st.setWeather('windy');
    st.setWindDirection(90);
    st.setWindStrength(6);
    const s = useEnvironmentStore.getState();
    expect(s).toMatchObject({ worldId: 'desert-adventure', timeOfDay: 'sunset', weather: 'windy', windDirectionDeg: 90, windStrength: 6 });
  });

  it('switching world clears manual wind overrides', () => {
    const st = useEnvironmentStore.getState();
    st.setWindDirection(10);
    st.setWindStrength(9);
    st.selectWorld('night-sky');
    expect(useEnvironmentStore.getState().windDirectionDeg).toBeNull();
    expect(useEnvironmentStore.getState().windStrength).toBeNull();
  });

  it('keeps the selection when other code reads it later (explorer to simulator)', () => {
    useEnvironmentStore.getState().selectWorld('lake-paradise');
    expect(useEnvironmentStore.getState().worldId).toBe('lake-paradise');
  });
});

describe('environment persistence', () => {
  it('saves every change and restores it after a reload', () => {
    const mem = createMemoryStorage();
    setStorageBackend(mem);
    const st = useEnvironmentStore.getState();
    st.selectWorld('lake-paradise');
    st.setTimeOfDay('goldenHour');
    st.setWeather('windy');
    st.setWindDirection(200);
    st.setWindStrength(7.5);
    expect(JSON.parse(mem.dump()[KEYS.environment])).toMatchObject({
      worldId: 'lake-paradise', timeOfDay: 'goldenHour', weather: 'windy', windDirectionDeg: 200, windStrength: 7.5,
    });
    st.selectWorld('mountain-valley'); // change away, then reload from storage
    mem.setItem(KEYS.environment, JSON.stringify({ worldId: 'lake-paradise', timeOfDay: 'goldenHour', weather: 'windy', windDirectionDeg: 200, windStrength: 7.5 }));
    useEnvironmentStore.getState().hydrate();
    expect(useEnvironmentStore.getState()).toMatchObject({ worldId: 'lake-paradise', timeOfDay: 'goldenHour', weather: 'windy', windStrength: 7.5 });
    setStorageBackend(null);
  });

  it('repairs invalid stored values', () => {
    expect(parseEnvironment('x')).toBeNull();
    expect(parseEnvironment({ worldId: 'atlantis', timeOfDay: 'teatime', weather: 'snow', windStrength: 99, windDirectionDeg: -90 })).toEqual({
      worldId: 'mountain-valley', timeOfDay: 'morning', weather: 'clear', windDirectionDeg: 270, windStrength: 12,
    });
    // a valid world with a bad time falls back to that world's own default time
    expect(parseEnvironment({ worldId: 'night-sky', timeOfDay: 'nope' })).toMatchObject({ worldId: 'night-sky', timeOfDay: 'night' });
    expect(parseEnvironment({ worldId: 'desert-adventure', windStrength: 'strong' })).toMatchObject({ windStrength: null });
  });

  it('falls back to defaults when storage is corrupt', () => {
    const mem = createMemoryStorage();
    mem.setItem(KEYS.environment, '<<<');
    setStorageBackend(mem);
    useEnvironmentStore.getState().hydrate();
    expect(useEnvironmentStore.getState().worldId).toBe('mountain-valley');
    setStorageBackend(null);
  });
});
