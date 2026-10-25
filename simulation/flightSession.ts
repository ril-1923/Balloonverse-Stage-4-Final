import type { FlightState } from '../types/flight';
import type { TimeOfDay } from '../types/environment';
import type { FlightRecord, MissionId } from '../types/progress';
import { createRun, MISSIONS, missionStatus, updateRun, type MissionContext, type MissionRun } from './missionEngine';
import { getMissionTargets } from './missionTargets';
import type { WorldDefinition } from './worldDefinitions';

export const MIN_ABORT_RECORD_SECONDS = 10;

export interface FlightSession {
  run: MissionRun | null;
  recorded: boolean;
  takeoffReported: boolean;
  cloudsReported: boolean;
  completedThisFlight: Set<MissionId>;
  best: Partial<Record<MissionId, number>>;
  balloonName: string;
  /** Live status of every mission for the current flight. */
  live: Partial<Record<MissionId, { progress: number; complete: boolean }>>;
}

export type SessionEvent =
  | { type: 'takeoff' }
  | { type: 'clouds' }
  | { type: 'mission'; id: MissionId }
  | { type: 'ended'; record: Omit<FlightRecord, 'id'> };

export interface FrameEnv {
  world: WorldDefinition;
  timeOfDay: TimeOfDay;
  windSpeed: number;
  tracked: MissionId | null;
  completed: ReadonlySet<MissionId>;
  cloudMinY: number;
  balloonName: string;
  now?: Date;
}

export const newSession = (): FlightSession => ({
  run: null,
  recorded: false,
  takeoffReported: false,
  cloudsReported: false,
  completedThisFlight: new Set(),
  best: {},
  balloonName: '',
  live: {},
});

/** Starts over for a new flight. Best-progress is cleared too (it is flushed when a flight ends). */
export function resetSession(s: FlightSession): void {
  s.run = null;
  s.recorded = false;
  s.takeoffReported = false;
  s.cloudsReported = false;
  s.completedThisFlight = new Set();
  s.best = {};
  s.live = {};
}

const AIR = new Set(['takingOff', 'flying', 'descending', 'landing']);

function buildRecord(s: FlightSession, st: FlightState, env: FrameEnv, result: FlightRecord['result']): Omit<FlightRecord, 'id'> {
  return {
    date: (env.now ?? new Date()).toISOString(),
    worldId: s.run?.worldId ?? env.world.id,
    duration: st.elapsed,
    maxAltitude: st.maxAltitude,
    distance: st.distance,
    result,
    balloon: s.balloonName || env.balloonName,
    missions: [...s.completedThisFlight],
  };
}

/** Called every simulation frame (not while paused). Returns events the app should react to. */
export function stepSession(s: FlightSession, st: FlightState, env: FrameEnv, dt: number): SessionEvent[] {
  const events: SessionEvent[] = [];
  if (s.run && (s.run.worldId !== env.world.id || (st.phase === 'grounded' && s.run.flewOff))) resetSession(s);
  if (!s.run) s.run = createRun(env.world);
  const run = s.run;

  const ctx: MissionContext = {
    world: env.world,
    targets: getMissionTargets(env.world),
    timeOfDay: env.timeOfDay,
    windSpeed: env.windSpeed,
    tracked: env.tracked,
  };
  const wasFlown = run.flewOff;
  updateRun(run, st, ctx, dt);
  if (run.flewOff && !wasFlown) s.balloonName = env.balloonName;

  if (run.flewOff && !s.takeoffReported) {
    s.takeoffReported = true;
    events.push({ type: 'takeoff' });
  }
  if (!s.cloudsReported && AIR.has(st.phase) && st.y >= env.cloudMinY) {
    s.cloudsReported = true;
    events.push({ type: 'clouds' });
  }

  for (const def of MISSIONS) {
    const status = missionStatus(def, run, st, ctx);
    s.live[def.id] = status;
    s.best[def.id] = Math.max(s.best[def.id] ?? 0, status.progress);
    if (status.complete && !s.completedThisFlight.has(def.id)) {
      s.completedThisFlight.add(def.id);
      if (!env.completed.has(def.id)) events.push({ type: 'mission', id: def.id });
    }
  }

  if (st.phase === 'landed' && run.flewOff && !s.recorded) {
    s.recorded = true;
    events.push({ type: 'ended', record: buildRecord(s, st, env, st.landingResult === 'soft' ? 'soft' : 'hard') });
  }
  return events;
}

/** The flight is being abandoned (reset, world change, leaving the page). Records it if it was a real flight. */
export function abortSession(s: FlightSession, st: FlightState, env: FrameEnv): SessionEvent[] {
  if (!s.run?.flewOff || s.recorded || st.elapsed < MIN_ABORT_RECORD_SECONDS) return [];
  s.recorded = true;
  return [{ type: 'ended', record: buildRecord(s, st, env, 'aborted') }];
}
