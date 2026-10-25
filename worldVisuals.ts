import * as THREE from 'three';
import type { WorldId } from '../../types/environment';
import type { ScatterSpec } from '../../simulation/scatter';
import {
  COUNTRY_LAUNCH, countryRoadDistance, desertMesaMask,
} from '../../simulation/worldDefinitions';
import { fbm2, smoothstep } from '../../utils/random';

export interface TerrainColorInput {
  x: number;
  y: number;
  z: number;
  /** 0 flat .. 1 vertical */
  steep: number;
  /** 0..1 low-frequency noise for variation */
  patch: number;
  /** distance from the origin (launch pad) */
  r: number;
}

export interface WorldVisuals {
  terrainColor: (c: TerrainColorInput, out: THREE.Color) => void;
  scatter: ScatterSpec[];
  /** Distant instanced peaks that hide the terrain edge. */
  ring: { color: string; count: number; radius: number; minH: number; maxH: number; seed: number };
  clouds: { minY: number; maxY: number; count: number; seed: number };
  /** Flat colour of the huge ground disc beyond the terrain mesh. */
  horizon: string;
  launchPad: { stone: string; ring: string; inner: string };
}

const C = (hex: string) => new THREE.Color(hex);
const mix = (out: THREE.Color, other: THREE.Color, t: number) => out.lerp(other, Math.min(1, Math.max(0, t)));

/* ---------- Mountain Valley ---------- */
const mv = {
  grassLow: C('#4f9a45'), grassHigh: C('#86a35a'), meadow: C('#6fae4e'), rock: C('#7b7873'),
  rockDark: C('#5d5b59'), snow: C('#f3f7fb'), bank: C('#8f8a62'), plateau: C('#7fb35a'),
};
function mountainColor(c: TerrainColorInput, out: THREE.Color): void {
  out.copy(mv.grassLow);
  mix(out, mv.meadow, c.patch);
  mix(out, mv.grassHigh, smoothstep(40, 150, c.y));
  if (c.y < 13) mix(out, mv.bank, smoothstep(13, 9.5, c.y));
  mix(out, c.patch > 0.5 ? mv.rock : mv.rockDark, Math.max(smoothstep(0.22, 0.45, c.steep), smoothstep(150, 230, c.y) * 0.9));
  mix(out, mv.snow, smoothstep(250, 310, c.y + c.patch * 30) * (1 - smoothstep(0.5, 0.75, c.steep) * 0.6));
  mix(out, mv.plateau, 1 - smoothstep(30, 70, c.r));
}

/* ---------- Green Countryside ---------- */
const FIELD_COLOURS = ['#b9c66a', '#7fb04a', '#a2b955', '#6e9f3f', '#d2c26b', '#8c6d3f', '#93b84f'].map(C);
const cs = { grass: C('#5fa646'), hill: C('#7fae52'), road: C('#b59a6a'), bank: C('#9c9468'), rock: C('#8a8780'), plateau: C('#79b457') };
function fieldIndex(x: number, z: number): number {
  const a = 0.42;
  const u = Math.floor((x * Math.cos(a) - z * Math.sin(a)) / 70);
  const v = Math.floor((x * Math.sin(a) + z * Math.cos(a)) / 70);
  let h = Math.imul(u, 374761393) ^ Math.imul(v, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h >>> 0) % FIELD_COLOURS.length;
}
function countryColor(c: TerrainColorInput, out: THREE.Color): void {
  out.copy(cs.grass);
  mix(out, cs.hill, c.patch);
  const flat = 1 - smoothstep(0.08, 0.2, c.steep);
  mix(out, FIELD_COLOURS[fieldIndex(c.x, c.z)], flat * smoothstep(60, 110, c.r) * 0.85 * (1 - smoothstep(48, 70, c.y)));
  if (c.y < 14) mix(out, cs.bank, smoothstep(14, 11.5, c.y));
  mix(out, cs.rock, smoothstep(0.35, 0.6, c.steep));
  mix(out, cs.road, 1 - smoothstep(3.5, 7.5, countryRoadDistance(c.x, c.z)));
  mix(out, cs.plateau, 1 - smoothstep(30, 70, c.r));
}

/* ---------- Desert ---------- */
const ds = { sand: C('#e3c58a'), sandAlt: C('#d6ac70'), sandDark: C('#c99a5f'), mesa: C('#b0653c'), mesaDark: C('#8c4a2c'), plateau: C('#e8cf98') };
function desertColor(c: TerrainColorInput, out: THREE.Color): void {
  out.copy(ds.sand);
  mix(out, ds.sandAlt, c.patch);
  mix(out, ds.sandDark, smoothstep(0.1, 0.35, c.steep) * 0.7);
  const band = Math.floor(c.y / 7) % 2 === 0 ? ds.mesa : ds.mesaDark;
  mix(out, band, Math.max(desertMesaMask(c.x, c.z) * smoothstep(60, 80, c.y), smoothstep(0.45, 0.7, c.steep)));
  mix(out, ds.plateau, 1 - smoothstep(30, 70, c.r));
}

/* ---------- Lake Paradise ---------- */
const lk = { grass: C('#4f9a52'), grassHigh: C('#7ea65c'), sand: C('#d9cba0'), bed: C('#2f7088'), rock: C('#7b7a78'), snow: C('#eef3f8'), plateau: C('#7ab45c') };
function lakeColor(c: TerrainColorInput, out: THREE.Color): void {
  out.copy(lk.grass);
  mix(out, lk.grassHigh, smoothstep(50, 170, c.y) * 0.8);
  mix(out, lk.sand, smoothstep(10.5, 6.8, c.y));
  mix(out, lk.bed, smoothstep(6.2, 1, c.y));
  mix(out, lk.rock, Math.max(smoothstep(0.25, 0.5, c.steep), smoothstep(160, 240, c.y) * 0.9));
  mix(out, lk.snow, smoothstep(250, 310, c.y + c.patch * 30) * (1 - smoothstep(0.5, 0.75, c.steep) * 0.5));
  mix(out, lk.plateau, 1 - smoothstep(30, 70, c.r));
}

/* ---------- Sunset Horizon ---------- */
const sn = { gold: C('#b9a24a'), dry: C('#8f7b3a'), rock: C('#6e5048'), dark: C('#4d3a3f'), plateau: C('#bfa857') };
function sunsetColor(c: TerrainColorInput, out: THREE.Color): void {
  out.copy(sn.gold);
  mix(out, sn.dry, c.patch);
  mix(out, c.patch > 0.5 ? sn.rock : sn.dark, Math.max(smoothstep(0.25, 0.5, c.steep), smoothstep(80, 130, c.y) * 0.5));
  mix(out, sn.plateau, 1 - smoothstep(30, 70, c.r));
}

/* ---------- Night Sky ---------- */
const nt = { grass: C('#3e6b52'), grassAlt: C('#4a7a5a'), rock: C('#5c6068'), plateau: C('#4c7f60') };
function nightColor(c: TerrainColorInput, out: THREE.Color): void {
  out.copy(nt.grass);
  mix(out, nt.grassAlt, c.patch);
  mix(out, nt.rock, Math.max(smoothstep(0.28, 0.5, c.steep), smoothstep(110, 170, c.y) * 0.8));
  mix(out, nt.plateau, 1 - smoothstep(30, 70, c.r));
}

export const WORLD_VISUALS: Record<WorldId, WorldVisuals> = {
  'mountain-valley': {
    terrainColor: mountainColor,
    scatter: [
      { kind: 'pine', seed: 1, count: 1800, minY: 12, maxY: 200, maxSlope: 0.75, density: { scale: 0.009, threshold: 0.46 }, scale: [0.8, 1.7] },
    ],
    ring: { color: '#8aa3bf', count: 46, radius: 1050, minH: 380, maxH: 760, seed: 4 },
    clouds: { minY: 160, maxY: 340, count: 22, seed: 12 },
    horizon: '#8fa7a0',
    launchPad: { stone: '#9aa0a6', ring: '#ff8a3d', inner: '#ffc857' },
  },
  'green-countryside': {
    terrainColor: countryColor,
    scatter: [
      { kind: 'broadleaf', seed: 2, count: 1100, minY: 14, maxY: 90, maxSlope: 0.6, density: { scale: 0.008, threshold: 0.5 }, scale: [0.8, 1.5] },
      { kind: 'pine', seed: 3, count: 250, minY: 40, maxY: 120, maxSlope: 0.6, density: { scale: 0.01, threshold: 0.52 }, scale: [0.8, 1.4] },
      { kind: 'house', seed: 4, count: 36, minY: 16, maxY: 60, maxSlope: 0.2, scale: [0.9, 1.15], launchClear: 130, cluster: { centres: 3, radius: 48, minDistFromLaunch: 160 } },
      { kind: 'barn', seed: 5, count: 9, minY: 16, maxY: 55, maxSlope: 0.18, scale: [0.95, 1.2], launchClear: 110 },
    ],
    ring: { color: '#86a98f', count: 40, radius: 900, minH: 220, maxH: 380, seed: 5 },
    clouds: { minY: 150, maxY: 300, count: 22, seed: 21 },
    horizon: '#6f9a60',
    launchPad: { stone: '#a7a39a', ring: '#e8590c', inner: '#ffd166' },
  },
  'desert-adventure': {
    terrainColor: desertColor,
    scatter: [
      { kind: 'rock', seed: 6, count: 260, minY: 20, maxY: 110, maxSlope: 0.9, scale: [0.7, 2.2], color: '#a8643d' },
      { kind: 'cactus', seed: 7, count: 170, minY: 20, maxY: 80, maxSlope: 0.35, density: { scale: 0.01, threshold: 0.55 }, scale: [0.8, 1.5] },
    ],
    ring: { color: '#c58a58', count: 44, radius: 1050, minH: 200, maxH: 380, seed: 6 },
    clouds: { minY: 220, maxY: 380, count: 22, seed: 31 },
    horizon: '#d7b27a',
    launchPad: { stone: '#c7b08a', ring: '#a63a2c', inner: '#f5d57a' },
  },
  'lake-paradise': {
    terrainColor: lakeColor,
    scatter: [
      { kind: 'pine', seed: 8, count: 1500, minY: 8.5, maxY: 170, maxSlope: 0.7, density: { scale: 0.009, threshold: 0.44 }, scale: [0.8, 1.7] },
      { kind: 'broadleaf', seed: 9, count: 380, minY: 8.5, maxY: 30, maxSlope: 0.5, density: { scale: 0.014, threshold: 0.42 }, scale: [0.7, 1.3] },
    ],
    ring: { color: '#8fa9c2', count: 46, radius: 1050, minH: 380, maxH: 740, seed: 7 },
    clouds: { minY: 130, maxY: 300, count: 22, seed: 41 },
    horizon: '#7fa0a0',
    launchPad: { stone: '#a3a8ad', ring: '#2fa4d6', inner: '#ffd166' },
  },
  'sunset-horizon': {
    terrainColor: sunsetColor,
    scatter: [
      { kind: 'broadleaf', seed: 10, count: 520, minY: 14, maxY: 110, maxSlope: 0.55, density: { scale: 0.008, threshold: 0.52 }, scale: [0.7, 1.3] },
      { kind: 'rock', seed: 11, count: 140, minY: 14, maxY: 130, maxSlope: 0.9, scale: [0.7, 1.8], color: '#6b4f47' },
    ],
    ring: { color: '#3b2a4c', count: 52, radius: 980, minH: 260, maxH: 520, seed: 8 },
    clouds: { minY: 140, maxY: 320, count: 22, seed: 51 },
    horizon: '#6f5646',
    launchPad: { stone: '#9a9088', ring: '#e8590c', inner: '#ffd166' },
  },
  'night-sky': {
    terrainColor: nightColor,
    scatter: [
      { kind: 'pine', seed: 12, count: 1000, minY: 12, maxY: 170, maxSlope: 0.7, density: { scale: 0.009, threshold: 0.47 }, scale: [0.8, 1.6] },
      { kind: 'rock', seed: 13, count: 90, minY: 12, maxY: 150, maxSlope: 0.9, scale: [0.7, 1.6], color: '#6a6e76' },
    ],
    ring: { color: '#4b5878', count: 46, radius: 1000, minH: 300, maxH: 560, seed: 9 },
    clouds: { minY: 160, maxY: 320, count: 18, seed: 61 },
    horizon: '#33475a',
    launchPad: { stone: '#8d939b', ring: '#5cc8ff', inner: '#ffc857' },
  },
};

export function getVisuals(id: WorldId): WorldVisuals {
  return WORLD_VISUALS[id];
}

/** Low-frequency noise helper shared with the terrain builder. */
export const patchNoise = (x: number, z: number) => fbm2(x * 0.02, z * 0.02, 3, 21);
export { COUNTRY_LAUNCH };
