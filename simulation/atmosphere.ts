import type { TimeOfDay, Weather } from '../types/environment';
import { clamp } from '../utils/random';

/** Everything the sky, lights, fog and clouds need for one time of day (before weather is applied). */
export interface TimePreset {
  sunElevation: number; // degrees
  sunAzimuth: number; // degrees
  turbidity: number;
  rayleigh: number;
  mie: number;
  mieG: number;
  sunColor: string;
  sunIntensity: number;
  moonIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  fogColor: string;
  cloudColor: string;
  stars: number; // 0..1 visibility
  exposure: number;
}

export const MOON = { elevation: 38, azimuth: 205 } as const;

export const TIME_PRESETS: Record<TimeOfDay, TimePreset> = {
  sunrise: {
    sunElevation: 6, sunAzimuth: 95, turbidity: 8, rayleigh: 2.2, mie: 0.012, mieG: 0.9,
    sunColor: '#ffb27a', sunIntensity: 1.7, moonIntensity: 0,
    hemiSky: '#f4b894', hemiGround: '#5b5a4a', hemiIntensity: 0.75,
    fogColor: '#f0c2a2', cloudColor: '#ffd3b4', stars: 0.12, exposure: 0.9,
  },
  morning: {
    sunElevation: 38, sunAzimuth: 135, turbidity: 3.2, rayleigh: 1.3, mie: 0.005, mieG: 0.85,
    sunColor: '#fff1d6', sunIntensity: 2.4, moonIntensity: 0,
    hemiSky: '#bcd9ff', hemiGround: '#6d8a4a', hemiIntensity: 1.0,
    fogColor: '#b9d6ee', cloudColor: '#ffffff', stars: 0, exposure: 1,
  },
  noon: {
    sunElevation: 66, sunAzimuth: 160, turbidity: 2, rayleigh: 1, mie: 0.004, mieG: 0.8,
    sunColor: '#ffffff', sunIntensity: 2.7, moonIntensity: 0,
    hemiSky: '#c4e0ff', hemiGround: '#789a55', hemiIntensity: 1.1,
    fogColor: '#c3dcf0', cloudColor: '#ffffff', stars: 0, exposure: 1,
  },
  goldenHour: {
    sunElevation: 13, sunAzimuth: 245, turbidity: 6, rayleigh: 2, mie: 0.01, mieG: 0.9,
    sunColor: '#ffc07a', sunIntensity: 2.1, moonIntensity: 0,
    hemiSky: '#ffd9b0', hemiGround: '#6a6a3c', hemiIntensity: 0.85,
    fogColor: '#efc9a0', cloudColor: '#ffe0b8', stars: 0, exposure: 0.95,
  },
  sunset: {
    sunElevation: 2.5, sunAzimuth: 262, turbidity: 10, rayleigh: 3, mie: 0.02, mieG: 0.93,
    sunColor: '#ff7a3c', sunIntensity: 1.5, moonIntensity: 0,
    hemiSky: '#ff9f7a', hemiGround: '#4a3c4a', hemiIntensity: 0.65,
    fogColor: '#e89a78', cloudColor: '#ff9a72', stars: 0.25, exposure: 0.9,
  },
  night: {
    sunElevation: -22, sunAzimuth: 262, turbidity: 2, rayleigh: 0.4, mie: 0.002, mieG: 0.7,
    sunColor: '#ff7a3c', sunIntensity: 0, moonIntensity: 0.7,
    hemiSky: '#2a3f7a', hemiGround: '#141a2e', hemiIntensity: 0.55,
    fogColor: '#0c1731', cloudColor: '#46567e', stars: 1, exposure: 1.1,
  },
};

export interface WeatherPreset {
  windScale: number;
  gust: number; // gust amplitude as a fraction of wind strength
  fogNear: number; // multiplier
  fogFar: number; // multiplier
  cloudCoverage: number; // 0..1 share of cloud banks shown
  cloudOpacity: number;
  cloudDark: number; // 1 = bright white, lower = greyer
  cloudSpeed: number;
  sunMul: number;
  hemiMul: number;
}

export const WEATHER_PRESETS: Record<Weather, WeatherPreset> = {
  clear: { windScale: 1, gust: 0.2, fogNear: 1, fogFar: 1, cloudCoverage: 0.3, cloudOpacity: 0.93, cloudDark: 1, cloudSpeed: 1, sunMul: 1, hemiMul: 1 },
  cloudy: { windScale: 1.25, gust: 0.25, fogNear: 0.7, fogFar: 0.8, cloudCoverage: 0.9, cloudOpacity: 0.96, cloudDark: 0.72, cloudSpeed: 1.2, sunMul: 0.5, hemiMul: 0.85 },
  misty: { windScale: 0.5, gust: 0.1, fogNear: 0.08, fogFar: 0.27, cloudCoverage: 0.45, cloudOpacity: 0.85, cloudDark: 0.9, cloudSpeed: 0.6, sunMul: 0.6, hemiMul: 1.1 },
  windy: { windScale: 2.4, gust: 0.45, fogNear: 1, fogFar: 1, cloudCoverage: 0.55, cloudOpacity: 0.9, cloudDark: 0.95, cloudSpeed: 2.4, sunMul: 1, hemiMul: 1 },
};

export interface AtmosphereTarget extends Omit<TimePreset, 'sunIntensity' | 'hemiIntensity'> {
  sunIntensity: number;
  hemiIntensity: number;
  fogNear: number;
  fogFar: number;
  cloudOpacity: number;
  cloudCoverage: number;
  cloudDark: number;
  cloudSpeed: number;
  /** 0 (day) .. 1 (full night): drives lanterns, city lights and stars-related effects. */
  night: number;
}

/** Combines a time-of-day preset with a weather preset and the world's base fog distances. */
export function resolveAtmosphere(
  time: TimeOfDay,
  weather: Weather,
  fog: { near: number; far: number },
): AtmosphereTarget {
  const t = TIME_PRESETS[time];
  const w = WEATHER_PRESETS[weather];
  // Clouds hide the stars.
  const stars = t.stars * (weather === 'cloudy' ? 0.35 : weather === 'misty' ? 0.5 : 1);
  return {
    ...t,
    stars,
    sunIntensity: t.sunIntensity * w.sunMul,
    moonIntensity: t.moonIntensity * (weather === 'cloudy' ? 0.7 : 1),
    hemiIntensity: t.hemiIntensity * w.hemiMul,
    fogNear: Math.max(8, fog.near * w.fogNear),
    fogFar: fog.far * w.fogFar,
    cloudOpacity: w.cloudOpacity,
    cloudCoverage: w.cloudCoverage,
    cloudDark: w.cloudDark,
    cloudSpeed: w.cloudSpeed,
    night: clamp((t.stars - 0.2) / 0.8, 0, 1),
  };
}
