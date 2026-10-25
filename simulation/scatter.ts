import { slopeAt, type WorldDefinition } from './worldDefinitions';
import { clamp, createRng, fbm2 } from '../utils/random';

export type ScatterKind = 'pine' | 'broadleaf' | 'cactus' | 'rock' | 'house' | 'barn';

export interface ScatterSpec {
  kind: ScatterKind;
  seed: number;
  count: number;
  minY: number;
  maxY: number;
  maxSlope: number;
  /** Clumping noise: only place where noise exceeds the threshold. */
  density?: { scale: number; threshold: number };
  /** Keep this many metres clear around the launch pad. */
  launchClear?: number;
  scale: [number, number];
  /** Place in tight groups (villages, cities) around flat spots. */
  cluster?: { centres: number; radius: number; minDistFromLaunch: number };
  /** Multiplies the material colour (used for rocks). */
  color?: string;
}

export interface Placement {
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: number;
  tint: number;
}

/** Deterministic placement of props on a world's terrain. Same world and spec always give the same result. */
export function placeScatter(world: WorldDefinition, spec: ScatterSpec, countScale = 1): Placement[] {
  const max = Math.max(0, Math.round(spec.count * countScale));
  const rng = createRng(spec.seed * 9973 + world.seed);
  const out: Placement[] = [];
  const half = world.size / 2 - 40;
  const clear = spec.launchClear ?? 60;
  const noiseSeed = (spec.seed % 90) + 1;

  const ok = (x: number, z: number): number | null => {
    if (Math.abs(x) > half || Math.abs(z) > half) return null;
    if (Math.hypot(x - world.launch.x, z - world.launch.z) < clear) return null;
    const y = world.heightAt(x, z);
    if (y < spec.minY || y > spec.maxY) return null;
    if (world.blocked(x, z)) return null;
    if (slopeAt(world, x, z) > spec.maxSlope) return null;
    return y;
  };

  // Cluster centres: flat, unblocked spots away from the launch pad.
  const centres: { x: number; z: number; angle: number }[] = [];
  if (spec.cluster) {
    for (let a = 0; a < 4000 && centres.length < spec.cluster.centres; a++) {
      const x = (rng() * 2 - 1) * half;
      const z = (rng() * 2 - 1) * half;
      if (Math.hypot(x, z) < spec.cluster.minDistFromLaunch) continue;
      if (ok(x, z) === null || slopeAt(world, x, z, 12) > 0.14) continue;
      if (centres.some((c) => Math.hypot(c.x - x, c.z - z) < spec.cluster!.radius * 2.5)) continue;
      centres.push({ x, z, angle: rng() * Math.PI });
    }
    if (centres.length === 0) return out;
  }

  for (let attempt = 0; attempt < max * 8 && out.length < max; attempt++) {
    let x: number;
    let z: number;
    let rotation = rng() * Math.PI * 2;
    if (spec.cluster) {
      const c = centres[Math.floor(rng() * centres.length)];
      const r = spec.cluster.radius * Math.sqrt(rng());
      const a = rng() * Math.PI * 2;
      x = c.x + Math.cos(a) * r;
      z = c.z + Math.sin(a) * r;
      rotation = c.angle + (rng() - 0.5) * 0.35 + (rng() < 0.5 ? 0 : Math.PI / 2);
    } else {
      x = (rng() * 2 - 1) * half;
      z = (rng() * 2 - 1) * half;
    }
    const y = ok(x, z);
    if (y === null) continue;
    if (spec.density) {
      const n = fbm2(x * spec.density.scale, z * spec.density.scale, 3, noiseSeed);
      if (n < spec.density.threshold) continue;
      if (rng() > clamp((n - spec.density.threshold + 0.06) * 2.2, 0, 1)) continue;
    }
    out.push({
      x,
      y: y - (spec.kind === 'rock' ? 0.4 : 0.3),
      z,
      scale: spec.scale[0] + rng() * (spec.scale[1] - spec.scale[0]),
      rotation,
      tint: 0.82 + rng() * 0.28,
    });
  }
  return out;
}
