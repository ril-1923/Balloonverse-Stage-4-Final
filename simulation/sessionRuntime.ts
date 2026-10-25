import { subscribeReset, runtime, windAt } from './flightController';
import { abortSession, newSession, resetSession, stepSession, type FrameEnv, type SessionEvent } from './flightSession';
import { getMission, missionStatus, nextTarget, type MissionContext } from './missionEngine';
import { getMissionTargets } from './missionTargets';
import { getVisuals } from '../components/simulator/worldVisuals';
import { useBalloonStore } from '../store/useBalloonStore';
import { useEnvironmentStore } from '../store/useEnvironmentStore';
import type { LiveMission } from '../store/useFlightStore';
import { effectiveTracked, useProgressStore } from '../store/useProgressStore';
import type { MissionId } from '../types/progress';

/** The one live flight session shared by the simulation loop, the HUD and the 3D markers. */
export const liveSession = newSession();

function buildEnv(): FrameEnv {
  const progress = useProgressStore.getState();
  return {
    world: runtime.world,
    timeOfDay: useEnvironmentStore.getState().timeOfDay,
    windSpeed: windAt(runtime.world, runtime.time).strength,
    tracked: effectiveTracked(progress),
    completed: new Set(Object.keys(progress.completed) as MissionId[]),
    cloudMinY: getVisuals(runtime.world.id).clouds.minY,
    balloonName: useBalloonStore.getState().current.name,
  };
}

function applyEvents(events: SessionEvent[]): void {
  const progress = useProgressStore.getState();
  for (const e of events) {
    if (e.type === 'takeoff') progress.markTakeoff();
    else if (e.type === 'clouds') progress.markCloudsReached();
    else if (e.type === 'mission') progress.completeMission(e.id);
    else progress.recordFlight(e.record, liveSession.best);
  }
}

/** Run once per simulation frame while not paused. */
export function tickSession(dt: number): void {
  applyEvents(stepSession(liveSession, runtime.state, buildEnv(), dt));
}

/** Records the current flight as aborted if it was a real flight, then clears the session. */
export function abortCurrentFlight(): void {
  applyEvents(abortSession(liveSession, runtime.state, buildEnv()));
  resetSession(liveSession);
}

// A flight that is reset or abandoned mid-air is recorded before it is discarded.
subscribeReset(abortCurrentFlight);

const BEARINGS = (dx: number, dz: number) => Math.atan2(dx, -dz);

/** HUD view of the tracked mission. */
export function getLiveMission(): LiveMission | null {
  const progress = useProgressStore.getState();
  const id = effectiveTracked(progress);
  if (!id || !liveSession.run) {
    if (!id) return null;
    const def = getMission(id);
    return { id, name: def.name, objective: def.objective, progress: 0, complete: false, alreadyDone: !!progress.completed[id], target: null };
  }
  const def = getMission(id);
  const env = buildEnv();
  const ctx: MissionContext = { world: env.world, targets: getMissionTargets(env.world), timeOfDay: env.timeOfDay, windSpeed: env.windSpeed, tracked: id };
  const st = missionStatus(def, liveSession.run, runtime.state, ctx);
  const t = nextTarget(id, liveSession.run, runtime.state, ctx);
  return {
    id,
    name: def.name,
    objective: def.objective,
    progress: st.progress,
    complete: st.complete,
    alreadyDone: !!progress.completed[id],
    target: t ? { label: t.label, distance: t.distance, bearing: BEARINGS(t.x - runtime.state.x, t.z - runtime.state.z) } : null,
  };
}
