import type { FlightState } from '../types/flight';
import type { MissionId } from '../types/progress';
import type { TimeOfDay } from '../types/environment';
import { CHECKPOINT_COUNT, CHECKPOINT_TRIGGER, SCENIC_TRIGGER, type MissionTargets } from './missionTargets';
import type { WorldDefinition } from './worldDefinitions';
import { clamp } from '../utils/random';

export interface MissionDef {
  id: MissionId;
  name: string;
  description: string;
  objective: string;
  reward: { points: number; label: string };
  /** Spatial missions only count while they are the tracked mission (their markers are shown). */
  spatial: boolean;
  /** Goal in metres/seconds where it makes sense, for display. */
  goal?: number;
}

export const GAIN_GOAL = 120;
export const WIND_DISTANCE_GOAL = 600;
export const WIND_ACTIVE_MIN = 2;
export const GOLDEN_MIN_FLIGHT = 60;
export const LONG_DISTANCE_GOAL = 500;
export const LONG_RETURN_RADIUS = 60;

export const MISSIONS: MissionDef[] = [
  { id: 'first-flight', name: 'First Flight', description: 'Every pilot starts on the ground. Fire the burner and leave it.', objective: 'Complete a successful takeoff', reward: { points: 50, label: '50 Sky Points' }, spatial: false },
  { id: 'sky-explorer', name: 'Sky Explorer', description: 'Climb well above the launch pad and look back down.', objective: `Climb ${GAIN_GOAL} m above the launch pad`, reward: { points: 100, label: '100 Sky Points' }, spatial: false, goal: GAIN_GOAL },
  { id: 'cloud-chaser', name: 'Cloud Chaser', description: 'Follow a curving path of glowing rings through the sky.', objective: `Fly through ${CHECKPOINT_COUNT} checkpoint rings in order`, reward: { points: 200, label: '200 Sky Points' }, spatial: true, goal: CHECKPOINT_COUNT },
  { id: 'mountain-explorer', name: 'Mountain Explorer', description: 'Find the highest nearby viewpoint and fly over it.', objective: 'Fly over the scenic beacon', reward: { points: 150, label: '150 Sky Points' }, spatial: true },
  { id: 'wind-rider', name: 'Wind Rider', description: 'Let the breeze carry you. Calm air will not count.', objective: `Travel ${WIND_DISTANCE_GOAL} m while the wind is at least ${WIND_ACTIVE_MIN} m/s`, reward: { points: 150, label: '150 Sky Points' }, spatial: false, goal: WIND_DISTANCE_GOAL },
  { id: 'golden-hour', name: 'Golden Hour', description: 'Fly a whole flight in warm evening light, then land gently.', objective: `Fly at least ${GOLDEN_MIN_FLIGHT} s during golden hour or sunset and land softly`, reward: { points: 200, label: '200 Sky Points' }, spatial: false, goal: GOLDEN_MIN_FLIGHT },
  { id: 'precision-landing', name: 'Precision Landing', description: 'Touch down gently inside the marked landing area.', objective: 'Land softly inside the target ring', reward: { points: 250, label: '250 Sky Points' }, spatial: true },
  { id: 'long-distance', name: 'Long-Distance Adventure', description: 'Go far from the launch pad, then bring the balloon home.', objective: `Reach ${LONG_DISTANCE_GOAL} m from launch, then land softly within ${LONG_RETURN_RADIUS} m of it`, reward: { points: 300, label: '300 Sky Points' }, spatial: false, goal: LONG_DISTANCE_GOAL },
];

export function getMission(id: MissionId): MissionDef {
  return MISSIONS.find((m) => m.id === id) as MissionDef;
}

/** Everything accumulated over one flight. Reset whenever the flight is reset. */
export interface MissionRun {
  worldId: string;
  launchHeight: number;
  flewOff: boolean;
  maxGain: number;
  windDistance: number;
  goldenTime: number;
  maxDisplacement: number;
  checkpointsPassed: number;
  scenicReached: boolean;
  prevDistance: number;
}

export interface MissionContext {
  world: WorldDefinition;
  targets: MissionTargets;
  timeOfDay: TimeOfDay;
  windSpeed: number;
  tracked: MissionId | null;
}

export const createRun = (world: WorldDefinition): MissionRun => ({
  worldId: world.id,
  launchHeight: world.launch.height,
  flewOff: false,
  maxGain: 0,
  windDistance: 0,
  goldenTime: 0,
  maxDisplacement: 0,
  checkpointsPassed: 0,
  scenicReached: false,
  prevDistance: 0,
});

const AIR_PHASES = new Set(['takingOff', 'flying', 'descending', 'landing']);
const FLOWN_PHASES = new Set(['flying', 'descending', 'landing', 'landed']);
const isGolden = (t: TimeOfDay) => t === 'goldenHour' || t === 'sunset';

/** Advances the accumulators for one simulation frame of length dt. Mutates `run`. */
export function updateRun(run: MissionRun, s: FlightState, ctx: MissionContext, dt: number): void {
  const w = ctx.world;
  if (FLOWN_PHASES.has(s.phase) && s.elapsed > 0) run.flewOff = true;
  run.maxGain = Math.max(run.maxGain, s.maxAltitude - run.launchHeight);

  const delta = s.distance - run.prevDistance;
  run.prevDistance = s.distance;
  if (delta > 0 && delta < 50 && ctx.windSpeed >= WIND_ACTIVE_MIN) run.windDistance += delta;

  const airborne = AIR_PHASES.has(s.phase);
  if (airborne && isGolden(ctx.timeOfDay)) run.goldenTime += dt;
  run.maxDisplacement = Math.max(run.maxDisplacement, Math.hypot(s.x - w.launch.x, s.z - w.launch.z));

  if (airborne && ctx.tracked === 'cloud-chaser' && run.checkpointsPassed < CHECKPOINT_COUNT) {
    const c = ctx.targets.checkpoints[run.checkpointsPassed];
    if (Math.hypot(s.x - c.x, s.y + 6 - c.y, s.z - c.z) <= CHECKPOINT_TRIGGER) run.checkpointsPassed++;
  }
  if (airborne && ctx.tracked === 'mountain-explorer' && !run.scenicReached) {
    const sc = ctx.targets.scenic;
    if (Math.hypot(s.x - sc.x, s.z - sc.z) <= SCENIC_TRIGGER && s.y - s.groundHeight >= 8) run.scenicReached = true;
  }
}

export interface MissionStatus {
  progress: number;
  complete: boolean;
}

/** Progress (0..1) and completion for one mission at the current moment. */
export function missionStatus(def: MissionDef, run: MissionRun, s: FlightState, ctx: MissionContext): MissionStatus {
  const landedSoft = s.phase === 'landed' && s.landingResult === 'soft';
  const tracked = ctx.tracked === def.id;
  let progress = 0;
  let complete = false;

  switch (def.id) {
    case 'first-flight':
      complete = run.flewOff;
      progress = complete ? 1 : clamp((s.y - s.groundHeight) / 6, 0, 0.95);
      break;
    case 'sky-explorer':
      complete = run.maxGain >= GAIN_GOAL;
      progress = run.maxGain / GAIN_GOAL;
      break;
    case 'cloud-chaser':
      complete = run.checkpointsPassed >= CHECKPOINT_COUNT;
      progress = run.checkpointsPassed / CHECKPOINT_COUNT;
      break;
    case 'mountain-explorer':
      complete = run.scenicReached;
      progress = complete
        ? 1
        : tracked
          ? clamp(1 - Math.hypot(s.x - ctx.targets.scenic.x, s.z - ctx.targets.scenic.z) / 500, 0, 0.9)
          : 0;
      break;
    case 'wind-rider':
      complete = run.windDistance >= WIND_DISTANCE_GOAL;
      progress = run.windDistance / WIND_DISTANCE_GOAL;
      break;
    case 'golden-hour': {
      const wholeFlight = run.goldenTime >= GOLDEN_MIN_FLIGHT && run.goldenTime >= s.elapsed * 0.9;
      complete = landedSoft && wholeFlight;
      progress = Math.min(run.goldenTime, GOLDEN_MIN_FLIGHT) / GOLDEN_MIN_FLIGHT * 0.85 + (complete ? 0.15 : 0);
      break;
    }
    case 'precision-landing': {
      const d = Math.hypot(s.x - ctx.targets.zone.x, s.z - ctx.targets.zone.z);
      complete = tracked && landedSoft && d <= ctx.targets.zone.radius;
      progress = complete ? 1 : s.phase === 'landed' ? 0.5 : tracked ? clamp(1 - d / 300, 0, 0.5) : 0;
      break;
    }
    case 'long-distance': {
      const home = Math.hypot(s.x - ctx.world.launch.x, s.z - ctx.world.launch.z);
      const reached = run.maxDisplacement >= LONG_DISTANCE_GOAL;
      complete = reached && landedSoft && home <= LONG_RETURN_RADIUS;
      progress = reached
        ? 0.6 + 0.4 * (complete ? 1 : clamp(1 - home / LONG_DISTANCE_GOAL, 0, 0.95))
        : (run.maxDisplacement / LONG_DISTANCE_GOAL) * 0.6;
      break;
    }
  }
  return { progress: clamp(progress, 0, 1), complete };
}

/** The next marker to show for the tracked mission, with distance for the HUD. */
export function nextTarget(
  id: MissionId | null,
  run: MissionRun,
  s: FlightState,
  ctx: MissionContext,
): { label: string; x: number; z: number; distance: number } | null {
  const dist = (x: number, z: number) => Math.hypot(x - s.x, z - s.z);
  const w = ctx.world;
  switch (id) {
    case 'cloud-chaser': {
      if (run.checkpointsPassed >= CHECKPOINT_COUNT) return null;
      const c = ctx.targets.checkpoints[run.checkpointsPassed];
      return { label: `Ring ${run.checkpointsPassed + 1} of ${CHECKPOINT_COUNT}`, x: c.x, z: c.z, distance: dist(c.x, c.z) };
    }
    case 'mountain-explorer': {
      if (run.scenicReached) return null;
      const t = ctx.targets.scenic;
      return { label: 'Scenic beacon', x: t.x, z: t.z, distance: dist(t.x, t.z) };
    }
    case 'precision-landing': {
      const t = ctx.targets.zone;
      return { label: 'Landing zone', x: t.x, z: t.z, distance: dist(t.x, t.z) };
    }
    case 'long-distance': {
      if (run.maxDisplacement >= LONG_DISTANCE_GOAL) return { label: 'Back to the launch pad', x: w.launch.x, z: w.launch.z, distance: dist(w.launch.x, w.launch.z) };
      return null;
    }
    default:
      return null;
  }
}
