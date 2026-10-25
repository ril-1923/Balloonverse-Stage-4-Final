import { slopeAt, type WorldDefinition } from './worldDefinitions';

export interface Checkpoint { x: number; y: number; z: number }
export interface MissionTargets {
  checkpoints: Checkpoint[];
  scenic: { x: number; z: number; ground: number };
  zone: { x: number; z: number; y: number; radius: number };
}

export const CHECKPOINT_COUNT = 5;
export const CHECKPOINT_TRIGGER = 20; // metres
export const SCENIC_TRIGGER = 45; // metres horizontally
export const ZONE_RADIUS = 18;

const cache = new Map<string, MissionTargets>();

function makeCheckpoints(world: WorldDefinition): Checkpoint[] {
  const a0 = world.wind.direction;
  const list: Checkpoint[] = [];
  for (let i = 0; i < CHECKPOINT_COUNT; i++) {
    const angle = a0 + (i - 2) * 0.42;
    const radius = 130 + i * 42;
    const x = world.launch.x + Math.sin(angle) * radius;
    const z = world.launch.z - Math.cos(angle) * radius;
    const want = world.launch.height + 55 + i * 16 + (i % 2) * 12;
    list.push({ x, z, y: Math.max(want, world.groundAt(x, z) + 40) });
  }
  return list;
}

function makeScenic(world: WorldDefinition): MissionTargets['scenic'] {
  let best = { x: 0, z: 0, ground: -Infinity };
  const maxR = world.boundsRadius * 0.75;
  for (let r = 220; r <= 460; r += 40) {
    if (r > maxR) break;
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const x = world.launch.x + Math.sin(a) * r;
      const z = world.launch.z - Math.cos(a) * r;
      if (world.blocked(x, z)) continue;
      const h = world.heightAt(x, z);
      if (h > best.ground) best = { x, z, ground: h };
    }
  }
  return best;
}

function makeZone(world: WorldDefinition): MissionTargets['zone'] {
  let best: { x: number; z: number; score: number } | null = null;
  for (const r of [130, 160, 190, 220, 250]) {
    for (let k = 0; k < 36; k++) {
      const a = (k / 36) * Math.PI * 2;
      const x = world.launch.x + Math.sin(a) * r;
      const z = world.launch.z - Math.cos(a) * r;
      if (world.blocked(x, z)) continue;
      if (world.groundAt(x, z) !== world.heightAt(x, z)) continue;
      let rough = slopeAt(world, x, z, 6);
      for (const [dx, dz] of [[14, 0], [-14, 0], [0, 14], [0, -14]]) rough = Math.max(rough, slopeAt(world, x + dx, z + dz, 6));
      const score = rough + Math.abs(r - 180) / 4000;
      if (!best || score < best.score) best = { x, z, score };
    }
  }
  const spot = best ?? { x: world.launch.x + 180, z: world.launch.z, score: 0 };
  return { x: spot.x, z: spot.z, y: world.groundAt(spot.x, spot.z), radius: ZONE_RADIUS };
}

/** Deterministic mission markers for a world: checkpoint rings, a scenic overlook and a landing zone. */
export function getMissionTargets(world: WorldDefinition): MissionTargets {
  let t = cache.get(world.id);
  if (!t) {
    t = { checkpoints: makeCheckpoints(world), scenic: makeScenic(world), zone: makeZone(world) };
    cache.set(world.id, t);
  }
  return t;
}
