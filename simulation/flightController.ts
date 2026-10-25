import type { ControlInput, FlightSnapshot, FlightState, Wind } from '../types/flight';
import { beginFlight, createInitialState, stepFlight, type PhysicsContext } from './flightPhysics';
import { MOUNTAIN_VALLEY, type WorldDefinition } from './worldDefinitions';
import { WEATHER_PRESETS } from './atmosphere';
import type { Weather } from '../types/environment';
import { sampleGround } from './collisionDetection';

/**
 * Mutable simulation runtime. High-frequency state lives here (not in React
 * state) and is read by the R3F frame loop; the HUD gets throttled snapshots.
 */
export interface Conditions {
  windScale: number;
  gust: number;
  /** User override of wind direction in degrees, or null for the world's own. */
  directionDeg: number | null;
  /** User override of wind strength in m/s, or null for the world's own times the weather scale. */
  strength: number | null;
}

interface Runtime {
  conditions: Conditions;
  world: WorldDefinition;
  state: FlightState;
  input: ControlInput;
  time: number;
}

function makeContext(world: WorldDefinition): PhysicsContext {
  return { groundAt: world.groundAt, launch: world.launch, boundsRadius: world.boundsRadius };
}

function freshState(world: WorldDefinition): FlightState {
  const ground = sampleGround(world.groundAt, world.launch.x, world.launch.z);
  return createInitialState(world.launch, ground);
}

export const runtime: Runtime = {
  conditions: { windScale: 1, gust: 0.2, directionDeg: null, strength: null },
  world: MOUNTAIN_VALLEY,
  state: freshState(MOUNTAIN_VALLEY),
  input: { ascend: false, descend: false, steer: 0 },
  time: 0,
};

const resetListeners = new Set<() => void>();

/** Called just BEFORE a flight is discarded (reset or world change), so it can still be recorded. */
export function subscribeReset(cb: () => void): () => void {
  resetListeners.add(cb);
  return () => resetListeners.delete(cb);
}

function resetState(): void {
  runtime.state = freshState(runtime.world);
  runtime.input.ascend = false;
  runtime.input.descend = false;
  runtime.input.steer = 0;
  runtime.time = 0;
}

export function setWorld(world: WorldDefinition): void {
  resetListeners.forEach((cb) => cb());
  runtime.world = world;
  resetState();
}

export function resetFlight(): void {
  resetListeners.forEach((cb) => cb());
  runtime.state = freshState(runtime.world);
  runtime.input.ascend = false;
  runtime.input.descend = false;
  runtime.input.steer = 0;
  runtime.time = 0;
}

export function startFlight(): void {
  runtime.state = beginFlight(runtime.state);
}

export function toggleReturnToLaunch(): void {
  const s = runtime.state;
  if (s.phase === 'flying' || s.phase === 'descending' || s.phase === 'landing') {
    runtime.state = { ...s, returning: !s.returning };
  } else if (s.phase === 'landed' || s.phase === 'grounded') {
    resetFlight();
  }
}

/** Applies weather and optional user wind overrides to the simulation. */
export function applyConditions(weather: Weather, directionDeg: number | null, strength: number | null): void {
  const w = WEATHER_PRESETS[weather];
  runtime.conditions = { windScale: w.windScale, gust: w.gust, directionDeg, strength };
}

export function windAt(world: WorldDefinition, time: number, cond: Conditions = runtime.conditions): Wind {
  const gust = 1 + cond.gust * Math.sin(time * 0.35) + cond.gust * 0.5 * Math.sin(time * 0.9 + 1.3);
  const swing = 0.12 * Math.sin(time * 0.05);
  const base = cond.strength ?? world.wind.strength * cond.windScale;
  const dir = cond.directionDeg !== null ? (cond.directionDeg * Math.PI) / 180 : world.wind.direction;
  return { direction: dir + swing, strength: Math.max(0, base * gust) };
}

export function updateFlight(dt: number): void {
  runtime.time += dt;
  const wind = windAt(runtime.world, runtime.time);
  runtime.state = stepFlight(runtime.state, runtime.input, wind, dt, makeContext(runtime.world));
}

export function getSnapshot(): FlightSnapshot {
  const s = runtime.state;
  const wind = windAt(runtime.world, runtime.time);
  return {
    phase: s.phase,
    altitude: s.y,
    agl: Math.max(0, s.y - s.groundHeight),
    verticalSpeed: s.vy,
    groundSpeed: Math.hypot(s.vx, s.vz),
    elapsed: s.elapsed,
    distance: s.distance,
    maxAltitude: s.maxAltitude,
    heading: s.heading,
    windSpeed: wind.strength,
    windDirection: wind.direction,
    burnerOn: s.burnerOn,
    heat: s.heat,
    countdown: s.countdown,
    landingResult: s.landingResult,
    returning: s.returning,
  };
}
