import { describe, expect, it } from 'vitest';
import { resolveAtmosphere, TIME_PRESETS, WEATHER_PRESETS } from './atmosphere';
import { TIMES_OF_DAY, WEATHERS } from '../types/environment';

const fog = { near: 220, far: 1500 };

describe('atmosphere presets', () => {
  it('defines every time of day and weather with sane values', () => {
    for (const { id } of TIMES_OF_DAY) {
      const p = TIME_PRESETS[id];
      expect(p.exposure).toBeGreaterThan(0);
      expect(p.stars).toBeGreaterThanOrEqual(0);
      expect(p.stars).toBeLessThanOrEqual(1);
      expect(p.fogColor).toMatch(/^#[0-9a-f]{6}$/i);
    }
    for (const { id } of WEATHERS) expect(WEATHER_PRESETS[id].windScale).toBeGreaterThan(0);
  });

  it('is bright at noon, warm and low at sunset, and dark with stars at night', () => {
    const noon = resolveAtmosphere('noon', 'clear', fog);
    const sunset = resolveAtmosphere('sunset', 'clear', fog);
    const night = resolveAtmosphere('night', 'clear', fog);
    expect(noon.sunElevation).toBeGreaterThan(sunset.sunElevation);
    expect(noon.sunIntensity).toBeGreaterThan(sunset.sunIntensity);
    expect(night.sunIntensity).toBe(0);
    expect(night.moonIntensity).toBeGreaterThan(0);
    expect(night.stars).toBe(1);
    expect(noon.stars).toBe(0);
    expect(night.hemiIntensity).toBeLessThan(noon.hemiIntensity);
    expect(night.night).toBe(1);
    expect(noon.night).toBe(0);
  });

  it('changes the actual sky and lighting colours between presets', () => {
    const colours = new Set(TIMES_OF_DAY.map(({ id }) => resolveAtmosphere(id, 'clear', fog).fogColor));
    expect(colours.size).toBe(TIMES_OF_DAY.length);
  });

  it('weather changes fog distance, cloud cover and sun strength', () => {
    const clear = resolveAtmosphere('noon', 'clear', fog);
    const misty = resolveAtmosphere('noon', 'misty', fog);
    const cloudy = resolveAtmosphere('noon', 'cloudy', fog);
    expect(misty.fogFar).toBeLessThan(clear.fogFar / 3);
    expect(misty.fogNear).toBeLessThan(clear.fogNear);
    expect(cloudy.cloudCoverage).toBeGreaterThan(clear.cloudCoverage);
    expect(cloudy.sunIntensity).toBeLessThan(clear.sunIntensity);
    expect(cloudy.cloudDark).toBeLessThan(clear.cloudDark);
  });

  it('cloud cover hides stars at night', () => {
    expect(resolveAtmosphere('night', 'cloudy', fog).stars).toBeLessThan(resolveAtmosphere('night', 'clear', fog).stars);
  });

  it('windy weather scales wind and gusts up, misty scales it down', () => {
    expect(WEATHER_PRESETS.windy.windScale).toBeGreaterThan(WEATHER_PRESETS.clear.windScale);
    expect(WEATHER_PRESETS.windy.gust).toBeGreaterThan(WEATHER_PRESETS.clear.gust);
    expect(WEATHER_PRESETS.misty.windScale).toBeLessThan(WEATHER_PRESETS.clear.windScale);
  });
});
