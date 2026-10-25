import { beforeEach, describe, expect, it } from 'vitest';
import {
  abortSession, MIN_ABORT_RECORD_SECONDS, newSession, resetSession, stepSession, type FlightSession, type FrameEnv, type SessionEvent,
} from './flightSession';
import { applyConditions, resetFlight, runtime, setWorld, startFlight, updateFlight, windAt } from './flightController';
import { MOUNTAIN_VALLEY } from './worldDefinitions';
import { GAIN_GOAL } from './missionEngine';
import type { MissionId } from '../types/progress';

const DT = 1 / 60;
let session: FlightSession;
let completed: Set<MissionId>;
let events: SessionEvent[];

const env = (over: Partial<FrameEnv> = {}): FrameEnv => ({
  world: MOUNTAIN_VALLEY,
  timeOfDay: 'noon',
  windSpeed: windAt(runtime.world, runtime.time).strength,
  tracked: null,
  completed,
  cloudMinY: 160,
  balloonName: 'Test Balloon',
  now: new Date('2025-03-01T12:00:00Z'),
  ...over,
});

function frame(over: Partial<FrameEnv> = {}) {
  updateFlight(DT);
  events.push(...stepSession(session, runtime.state, env(over), DT));
}

beforeEach(() => {
  setWorld(MOUNTAIN_VALLEY);
  applyConditions('clear', null, 0); // calm, so tests are not affected by wind
  session = newSession();
  completed = new Set();
  events = [];
});

describe('a scripted real flight', () => {
  it('takes off, climbs, lands softly and is recorded exactly once', () => {
    startFlight();
    // climb until well above the goal
    for (let i = 0; i < 60 * 120 && runtime.state.maxAltitude - MOUNTAIN_VALLEY.launch.height < GAIN_GOAL + 5; i++) {
      runtime.input.ascend = true;
      frame();
    }
    // descend with a gentle pilot
    for (let i = 0; i < 60 * 240 && runtime.state.phase !== 'landed'; i++) {
      runtime.input.ascend = runtime.state.vy < -1.5;
      runtime.input.descend = runtime.state.vy > -0.8 && runtime.state.y - runtime.state.groundHeight > 30;
      frame();
    }
    // keep stepping after landing: nothing new may be reported
    const before = events.length;
    for (let i = 0; i < 120; i++) frame();
    expect(events.length).toBe(before);

    expect(runtime.state.phase).toBe('landed');
    expect(runtime.state.landingResult).toBe('soft');
    expect(events.filter((e) => e.type === 'takeoff')).toHaveLength(1);
    const missions = events.filter((e) => e.type === 'mission').map((e) => (e as { id: string }).id);
    expect(missions).toEqual(expect.arrayContaining(['first-flight', 'sky-explorer']));
    expect(new Set(missions).size).toBe(missions.length);
    expect(missions).not.toContain('cloud-chaser');
    const ended = events.filter((e) => e.type === 'ended');
    expect(ended).toHaveLength(1);
    const rec = (ended[0] as Extract<SessionEvent, { type: 'ended' }>).record;
    expect(rec).toMatchObject({ result: 'soft', worldId: 'mountain-valley', balloon: 'Test Balloon' });
    expect(rec.duration).toBeCloseTo(runtime.state.elapsed, 6);
    expect(rec.distance).toBeCloseTo(runtime.state.distance, 6);
    expect(rec.maxAltitude).toBeCloseTo(runtime.state.maxAltitude, 6);
    expect(rec.maxAltitude).toBeGreaterThan(MOUNTAIN_VALLEY.launch.height + GAIN_GOAL);
    expect(rec.missions).toEqual(expect.arrayContaining(['first-flight', 'sky-explorer']));
  });

  it('does not report missions that are already completed', () => {
    completed.add('first-flight');
    startFlight();
    for (let i = 0; i < 60 * 30; i++) {
      runtime.input.ascend = true;
      frame();
    }
    const ids = events.filter((e) => e.type === 'mission').map((e) => (e as { id: string }).id);
    expect(ids).not.toContain('first-flight');
  });

  it('reports reaching the cloud layer once', () => {
    startFlight();
    for (let i = 0; i < 60 * 200 && !events.some((e) => e.type === 'clouds'); i++) {
      runtime.input.ascend = true;
      frame({ cloudMinY: MOUNTAIN_VALLEY.launch.height + 60 });
    }
    for (let i = 0; i < 300; i++) frame({ cloudMinY: MOUNTAIN_VALLEY.launch.height + 60 });
    expect(events.filter((e) => e.type === 'clouds')).toHaveLength(1);
  });

  it('records a hard landing as hard', () => {
    startFlight();
    for (let i = 0; i < 60 * 12; i++) {
      runtime.input.ascend = true;
      frame();
    }
    runtime.input.ascend = false;
    for (let i = 0; i < 60 * 120 && runtime.state.phase !== 'landed'; i++) frame();
    const ended = events.filter((e) => e.type === 'ended') as Extract<SessionEvent, { type: 'ended' }>[];
    expect(ended).toHaveLength(1);
    expect(ended[0].record.result).toBe(runtime.state.landingResult);
    expect(ended[0].record.result).toBe('hard');
  });
});

describe('abandoned flights', () => {
  it('records an aborted flight only if it really flew for a while', () => {
    startFlight();
    for (let i = 0; i < 60 * 5; i++) frame();
    expect(abortSession(session, runtime.state, env())).toEqual([]); // still inflating/just taking off
    for (let i = 0; i < 60 * 12; i++) {
      runtime.input.ascend = true;
      frame();
    }
    expect(runtime.state.elapsed).toBeGreaterThan(MIN_ABORT_RECORD_SECONDS);
    const out = abortSession(session, runtime.state, env());
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ type: 'ended', record: { result: 'aborted' } });
    expect(abortSession(session, runtime.state, env())).toEqual([]); // never twice
  });

  it('never records a flight that never left the ground', () => {
    for (let i = 0; i < 300; i++) frame();
    expect(abortSession(session, runtime.state, env())).toEqual([]);
    expect(events).toEqual([]);
  });

  it('starts a fresh run after a reset', () => {
    startFlight();
    for (let i = 0; i < 60 * 12; i++) {
      runtime.input.ascend = true;
      frame();
    }
    expect(events.some((e) => e.type === 'takeoff')).toBe(true);
    resetFlight();
    resetSession(session);
    events = [];
    startFlight();
    for (let i = 0; i < 60 * 12; i++) {
      runtime.input.ascend = true;
      frame();
    }
    expect(events.filter((e) => e.type === 'takeoff')).toHaveLength(1);
  });
});
