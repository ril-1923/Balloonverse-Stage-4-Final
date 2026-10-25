import type { TimeOfDay, Weather, WorldId } from '../types/environment';
import { clamp, fbm2, lerp, smoothstep, valueNoise2 } from '../utils/random';

export interface RiverSpec {
  centerX: (z: number) => number;
  halfWidth: number;
  level: number;
  /** River fades out beyond this distance from the origin. */
  maxRadius: number;
}
export interface LakeSpec {
  cx: number;
  cz: number;
  level: number;
  /** Radius of the water disc that covers the whole basin. */
  discRadius: number;
}

export interface WorldDefinition {
  id: WorldId;
  name: string;
  description: string;
  seed: number;
  launch: { x: number; z: number; height: number };
  /** Terrain mesh edge length in metres. */
  size: number;
  /** Playable radius around the origin, metres. */
  boundsRadius: number;
  fog: { near: number; far: number };
  wind: { direction: number; strength: number };
  windNote: string;
  defaults: { timeOfDay: TimeOfDay; weather: Weather };
  difficulty: 1 | 2 | 3;
  river?: RiverSpec;
  lake?: LakeSpec;
  /** Raw terrain height. */
  heightAt: (x: number, z: number) => number;
  /** Height the basket can rest on: terrain, or the water surface where there is water. */
  groundAt: (x: number, z: number) => number;
  /** True where props must not be placed (water, banks, roads). */
  blocked: (x: number, z: number) => boolean;
}

const deg = (d: number) => (d * Math.PI) / 180;
const plateau = (r: number) => 1 - smoothstep(38, 80, r);

type Base = Omit<WorldDefinition, 'groundAt' | 'blocked'> & { extraBlocked?: (x: number, z: number) => boolean };

function finish(base: Base): WorldDefinition {
  const { extraBlocked, ...w } = base;
  const riverHit = (x: number, z: number, pad: number) =>
    !!w.river &&
    Math.abs(x - w.river.centerX(z)) < w.river.halfWidth + pad &&
    Math.hypot(w.river.centerX(z), z) < w.river.maxRadius + 40;
  return {
    ...w,
    groundAt: (x, z) => {
      let h = w.heightAt(x, z);
      if (w.lake) h = Math.max(h, w.lake.level);
      if (w.river && riverHit(x, z, 0) && Math.hypot(x, z) < w.river.maxRadius) h = Math.max(h, w.river.level);
      return h;
    },
    blocked: (x, z) => {
      if (riverHit(x, z, 9)) return true;
      if (w.lake && w.heightAt(x, z) < w.lake.level + 2.5) return true;
      return extraBlocked ? extraBlocked(x, z) : false;
    },
  };
}

/* ------------------------------------------------------------------ */
/* World 1: Mountain Valley                                            */
/* ------------------------------------------------------------------ */
export const LAUNCH_HEIGHT = 20;
const RIVER_FLOOR = 9;
export const WORLD_WATER_LEVEL = RIVER_FLOOR + 1.2;

/** Centre-line x of the Mountain Valley river for a given z. */
export function riverX(z: number): number {
  return 95 + 140 * Math.sin(z * 0.006 + 1) + 40 * Math.sin(z * 0.017);
}

export function mountainValleyHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const rolling = fbm2(x * 0.006, z * 0.006, 4, 3);
  const valley = LAUNCH_HEIGHT - 4 + rolling * 26;
  const ridgeNoise = fbm2(x * 0.0045 + 40, z * 0.0045 - 12, 5, 11);
  const ridged = 1 - Math.abs(ridgeNoise * 2 - 1);
  const mountains = smoothstep(230, 560, r) * (70 + ridged * ridged * 330 + ridgeNoise * 60);
  let h = valley + mountains;
  const bank = smoothstep(42, 8, Math.abs(x - riverX(z))) * (1 - smoothstep(420, 520, r));
  h = lerp(h, RIVER_FLOOR, bank);
  return lerp(h, LAUNCH_HEIGHT, plateau(r));
}

export const MOUNTAIN_VALLEY: WorldDefinition = finish({
  id: 'mountain-valley',
  name: 'Mountain Valley',
  description: 'Pine forests, a winding river and tall peaks around a grassy launch platform.',
  seed: 7,
  launch: { x: 0, z: 0, height: LAUNCH_HEIGHT },
  size: 1600,
  boundsRadius: 680,
  fog: { near: 220, far: 1500 },
  wind: { direction: deg(60), strength: 3 },
  windNote: 'Light wind that strengthens in the high valley',
  defaults: { timeOfDay: 'morning', weather: 'clear' },
  difficulty: 3,
  river: { centerX: riverX, halfWidth: 9, level: WORLD_WATER_LEVEL, maxRadius: 480 },
  heightAt: mountainValleyHeight,
});

/* ------------------------------------------------------------------ */
/* World 2: Green Countryside                                          */
/* ------------------------------------------------------------------ */
export const COUNTRY_LAUNCH = 24;
const COUNTRY_RIVER_FLOOR = 11;

export function countryRiverX(z: number): number {
  return -210 + 80 * Math.sin(z * 0.008 + 0.8) + 25 * Math.sin(z * 0.021);
}
/** z of the east-west road for a given x. */
export function countryRoadZ(x: number): number {
  return -170 + 30 * Math.sin(x * 0.009);
}
export function countryRoadDistance(x: number, z: number): number {
  return Math.abs(z - countryRoadZ(x));
}

/** Where the road crosses the river: found by fixed-point iteration. */
export function countryCrossing(): { x: number; z: number; angle: number } {
  let x = -200;
  for (let i = 0; i < 40; i++) x = countryRiverX(countryRoadZ(x));
  const slope = (countryRoadZ(x + 1) - countryRoadZ(x - 1)) / 2;
  return { x, z: countryRoadZ(x), angle: Math.atan2(slope, 1) };
}

export function countrysideHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const n = fbm2(x * 0.0032, z * 0.0032, 4, 31);
  const m = fbm2(x * 0.012 + 5, z * 0.012 - 3, 3, 33);
  let h = 26 + (n - 0.5) * 80 + (m - 0.5) * 10;
  if (h < 16) h = 16 - (16 - h) * 0.15;
  const bank = smoothstep(34, 7, Math.abs(x - countryRiverX(z)));
  h = lerp(h, COUNTRY_RIVER_FLOOR, bank);
  return lerp(h, COUNTRY_LAUNCH, plateau(r));
}

export const GREEN_COUNTRYSIDE: WorldDefinition = finish({
  id: 'green-countryside',
  name: 'Green Countryside',
  description: 'Rolling hills, patchwork farms, small villages and a river crossed by an old road bridge.',
  seed: 31,
  launch: { x: 0, z: 0, height: COUNTRY_LAUNCH },
  size: 1500,
  boundsRadius: 640,
  fog: { near: 260, far: 1500 },
  wind: { direction: deg(100), strength: 3.5 },
  windNote: 'Gentle breeze, easy to read',
  defaults: { timeOfDay: 'morning', weather: 'clear' },
  difficulty: 1,
  river: { centerX: countryRiverX, halfWidth: 9, level: COUNTRY_RIVER_FLOOR + 1.2, maxRadius: 700 },
  extraBlocked: (x, z) => countryRoadDistance(x, z) < 9,
  heightAt: countrysideHeight,
});

/* ------------------------------------------------------------------ */
/* World 3: Desert Adventure                                           */
/* ------------------------------------------------------------------ */
export const DESERT_LAUNCH = 34;

export function desertMesaMask(x: number, z: number): number {
  return smoothstep(0.585, 0.615, fbm2(x * 0.0027 - 30, z * 0.0027 + 11, 3, 43));
}

export function desertHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const n = fbm2(x * 0.0024 + 7, z * 0.0024, 4, 41);
  const phase = (x * 0.8 + z * 0.6) * 0.012 + n * 8;
  const dune = Math.pow(Math.sin(phase) * 0.5 + 0.5, 1.7) * 34;
  const base = 32 + (n - 0.5) * 60 + dune;
  const top = 92 + fbm2(x * 0.01, z * 0.01, 2, 47) * 16;
  const h = lerp(base, Math.max(base, top), desertMesaMask(x, z));
  return lerp(h, DESERT_LAUNCH, plateau(r));
}

export const DESERT_ADVENTURE: WorldDefinition = finish({
  id: 'desert-adventure',
  name: 'Desert Adventure',
  description: 'Rippling sand dunes, red mesas and scattered rocks under a hot, hazy sky.',
  seed: 41,
  launch: { x: 0, z: 0, height: DESERT_LAUNCH },
  size: 1600,
  boundsRadius: 680,
  fog: { near: 260, far: 1400 },
  wind: { direction: deg(135), strength: 4.5 },
  windNote: 'Steady warm wind, a little stronger aloft',
  defaults: { timeOfDay: 'noon', weather: 'clear' },
  difficulty: 2,
  heightAt: desertHeight,
});

/* ------------------------------------------------------------------ */
/* World 4: Lake Paradise                                              */
/* ------------------------------------------------------------------ */
export const LAKE_LAUNCH = 24;
export const LAKE_LEVEL = 6;
export const LAKE_CENTRE = { cx: 40, cz: -400 } as const;

/** 0 at the lake centre, 1 at the (irregular) shoreline. */
export function lakeT(x: number, z: number): number {
  const dx = x - LAKE_CENTRE.cx;
  const dz = z - LAKE_CENTRE.cz;
  const a = Math.atan2(dz, dx);
  const rl = 360 * (0.82 + 0.34 * valueNoise2(Math.cos(a) * 1.5 + 2, Math.sin(a) * 1.5 + 2, 53));
  return Math.hypot(dx, dz) / rl;
}

export function lakeHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const basin = 1 - smoothstep(0.7, 1.02, lakeT(x, z));
  const base = 24 + (fbm2(x * 0.004, z * 0.004, 4, 55) - 0.5) * 50;
  const ridgeNoise = fbm2(x * 0.0045 + 9, z * 0.0045 + 21, 5, 57);
  const ridged = 1 - Math.abs(ridgeNoise * 2 - 1);
  const mountains = smoothstep(380, 720, r) * (1 - basin) * (80 + ridged * ridged * 300);
  const h = lerp(base + mountains, -10, basin);
  return lerp(h, LAKE_LAUNCH, plateau(r));
}

export const LAKE_PARADISE: WorldDefinition = finish({
  id: 'lake-paradise',
  name: 'Lake Paradise',
  description: 'A huge calm lake ringed by mountains, with shoreline forest and soft morning fog.',
  seed: 51,
  launch: { x: 0, z: 0, height: LAKE_LAUNCH },
  size: 1600,
  boundsRadius: 680,
  fog: { near: 120, far: 1200 },
  wind: { direction: deg(200), strength: 2.2 },
  windNote: 'Very light, perfect for slow sightseeing',
  defaults: { timeOfDay: 'sunrise', weather: 'misty' },
  difficulty: 2,
  lake: { cx: LAKE_CENTRE.cx, cz: LAKE_CENTRE.cz, level: LAKE_LEVEL, discRadius: 480 },
  heightAt: lakeHeight,
});

/* ------------------------------------------------------------------ */
/* World 5: Sunset Horizon                                             */
/* ------------------------------------------------------------------ */
export const SUNSET_LAUNCH = 30;

export function sunsetHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const long = fbm2(x * 0.0028, z * 0.0016, 4, 61);
  const ridge = Math.sin(z * 0.006 + fbm2(x * 0.002, z * 0.002, 2, 63) * 6) * 0.5 + 0.5;
  const h = 30 + (long - 0.5) * 90 + ridge * 26 + smoothstep(300, 650, r) * 60;
  return lerp(h, SUNSET_LAUNCH, plateau(r));
}

export const SUNSET_HORIZON: WorldDefinition = finish({
  id: 'sunset-horizon',
  name: 'Sunset Horizon',
  description: 'Long golden ridges and distant dark silhouettes under a pink and orange sky.',
  seed: 61,
  launch: { x: 0, z: 0, height: SUNSET_LAUNCH },
  size: 1600,
  boundsRadius: 680,
  fog: { near: 200, far: 1500 },
  wind: { direction: deg(80), strength: 3 },
  windNote: 'Calm evening air with light gusts',
  defaults: { timeOfDay: 'sunset', weather: 'clear' },
  difficulty: 2,
  heightAt: sunsetHeight,
});

/* ------------------------------------------------------------------ */
/* World 6: Night Sky                                                  */
/* ------------------------------------------------------------------ */
export const NIGHT_LAUNCH = 28;

export function nightHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const n = fbm2(x * 0.0035, z * 0.0035, 4, 71);
  const h = 28 + (n - 0.5) * 70 + smoothstep(420, 700, r) * 120 * fbm2(x * 0.004 + 3, z * 0.004, 3, 73);
  return lerp(h, NIGHT_LAUNCH, plateau(r));
}

export const NIGHT_SKY: WorldDefinition = finish({
  id: 'night-sky',
  name: 'Night Sky',
  description: 'Moonlit hills under a field of stars, with the glow of distant cities on the horizon.',
  seed: 71,
  launch: { x: 0, z: 0, height: NIGHT_LAUNCH },
  size: 1600,
  boundsRadius: 680,
  fog: { near: 160, far: 1400 },
  wind: { direction: deg(30), strength: 2.5 },
  windNote: 'Cool, light and steady',
  defaults: { timeOfDay: 'night', weather: 'clear' },
  difficulty: 3,
  heightAt: nightHeight,
});

export const WORLDS: WorldDefinition[] = [
  MOUNTAIN_VALLEY,
  GREEN_COUNTRYSIDE,
  DESERT_ADVENTURE,
  LAKE_PARADISE,
  SUNSET_HORIZON,
  NIGHT_SKY,
];

export function getWorld(id: WorldId): WorldDefinition {
  return WORLDS.find((w) => w.id === id) ?? MOUNTAIN_VALLEY;
}

export function slopeAt(def: WorldDefinition, x: number, z: number, d = 3): number {
  const dx = def.heightAt(x + d, z) - def.heightAt(x - d, z);
  const dz = def.heightAt(x, z + d) - def.heightAt(x, z - d);
  return clamp(Math.hypot(dx, dz) / (2 * d), 0, 10);
}
