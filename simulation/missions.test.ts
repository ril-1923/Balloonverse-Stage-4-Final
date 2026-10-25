import { describe, expect, it } from 'vitest';
import {
  createRun, getMission, GAIN_GOAL, LONG_DISTANCE_GOAL, MISSIONS, missionStatus, nextTarget, updateRun, WIND_DISTANCE_GOAL,
  type MissionContext, type MissionRun,
} from './missionEngine';
import {
  CHECKPOINT_COUNT, getMissionTargets, SCENIC_TRIGGER, ZONE_RADIUS,
} from './missionTargets';
import { ACHIEVEMENTS, satisfiedAchievements } from './achievements';
import { MOUNTAIN_VALLEY, WORLDS } from './worldDefinitions';
import { createInitialState } from './flightPhysics';
import { emptyStats, type MissionId } from '../types/progress';
import type { FlightState } from '../types/flight';
import type { TimeOfDay } from '../types/environment';

const world = MOUNTAIN_VALLEY;
const targets = getMissionTargets(world);
const ctx = (over: Partial<MissionContext> = {}): MissionContext => ({
  world, targets, timeOfDay: 'noon', windSpeed: 4, tracked: null, ...over,
});
const base = (): FlightState => ({ ...createInitialState(world.launch, world.launch.height), phase: 'flying', elapsed: 5, inflation: 1 });
const run = (): MissionRun => createRun(world);
const status = (id: MissionId, r: MissionRun, s: FlightState, c = ctx()) => missionStatus(getMission(id), r, s, c);

describe('mission list', () => {
  it('has the eight required missions, each with all the required fields', () => {
    expect(MISSIONS.map((m) => m.name)).toEqual([
      'First Flight', 'Sky Explorer', 'Cloud Chaser', 'Mountain Explorer', 'Wind Rider',
      'Golden Hour', 'Precision Landing', 'Long-Distance Adventure',
    ]);
    for (const m of MISSIONS) {
      expect(m.description.length).toBeGreaterThan(10);
      expect(m.objective.length).toBeGreaterThan(5);
      expect(m.reward.points).toBeGreaterThan(0);
    }
    expect(new Set(MISSIONS.map((m) => m.id)).size).toBe(8);
  });
});

describe('mission targets', () => {
  for (const w of WORLDS) {
    it(`${w.name}: checkpoints, scenic point and landing zone are valid`, () => {
      const t = getMissionTargets(w);
      expect(getMissionTargets(w)).toBe(t); // cached and deterministic
      expect(t.checkpoints).toHaveLength(CHECKPOINT_COUNT);
      for (const c of t.checkpoints) {
        expect(c.y).toBeGreaterThanOrEqual(w.groundAt(c.x, c.z) + 40 - 1e-6);
        expect(Math.hypot(c.x - w.launch.x, c.z - w.launch.z)).toBeLessThan(w.boundsRadius);
      }
      const sd = Math.hypot(t.scenic.x - w.launch.x, t.scenic.z - w.launch.z);
      expect(sd).toBeGreaterThanOrEqual(220);
      expect(sd).toBeLessThanOrEqual(w.boundsRadius);
      expect(w.blocked(t.scenic.x, t.scenic.z)).toBe(false);
      expect(t.scenic.ground).toBeGreaterThan(w.launch.height - 5);

      const zd = Math.hypot(t.zone.x - w.launch.x, t.zone.z - w.launch.z);
      expect(zd).toBeGreaterThanOrEqual(125);
      expect(zd).toBeLessThanOrEqual(255);
      expect(w.blocked(t.zone.x, t.zone.z)).toBe(false);
      expect(t.zone.y).toBe(w.heightAt(t.zone.x, t.zone.z));
      expect(t.zone.radius).toBe(ZONE_RADIUS);
    });
  }
});

describe('First Flight and Sky Explorer', () => {
  it('first flight needs a real takeoff, not just pressing start', () => {
    const r = run();
    const grounded = { ...base(), phase: 'inflating' as const, elapsed: 0 };
    updateRun(r, grounded, ctx(), 0.016);
    expect(status('first-flight', r, grounded).complete).toBe(false);
    updateRun(r, base(), ctx(), 0.016);
    expect(status('first-flight', r, base())).toEqual({ progress: 1, complete: true });
  });

  it('sky explorer completes only at the goal altitude gain', () => {
    const r = run();
    const high = { ...base(), maxAltitude: world.launch.height + GAIN_GOAL - 1 };
    updateRun(r, high, ctx(), 0.016);
    expect(status('sky-explorer', r, high).complete).toBe(false);
    expect(status('sky-explorer', r, high).progress).toBeGreaterThan(0.95);
    const higher = { ...high, maxAltitude: world.launch.height + GAIN_GOAL };
    updateRun(r, higher, ctx(), 0.016);
    expect(status('sky-explorer', r, higher).complete).toBe(true);
  });
});

describe('Wind Rider', () => {
  const fly = (windSpeed: number, metres: number) => {
    const r = run();
    const s = base();
    for (let i = 0; i < metres; i++) {
      s.distance += 1;
      updateRun(r, s, ctx({ windSpeed }), 0.016);
    }
    return status('wind-rider', r, s);
  };
  it('counts distance only while the wind is active', () => {
    expect(fly(0.5, WIND_DISTANCE_GOAL + 100)).toMatchObject({ complete: false, progress: 0 });
    expect(fly(4, WIND_DISTANCE_GOAL - 1).complete).toBe(false);
    expect(fly(4, WIND_DISTANCE_GOAL).complete).toBe(true);
  });
  it('does not count teleports (e.g. a reset between frames) as distance', () => {
    const r = run();
    const s = base();
    s.distance = 100000;
    updateRun(r, s, ctx(), 0.016);
    expect(r.windDistance).toBe(0);
  });
});

describe('Golden Hour', () => {
  const flight = (time: TimeOfDay, seconds: number, landing: 'soft' | 'hard' | null) => {
    const r = run();
    const s = base();
    for (let t = 0; t < seconds; t += 0.5) {
      s.elapsed = t;
      updateRun(r, s, ctx({ timeOfDay: time }), 0.5);
    }
    if (landing) Object.assign(s, { phase: 'landed', landingResult: landing, elapsed: seconds });
    return status('golden-hour', r, s);
  };
  it('requires golden hour or sunset, a long enough flight and a soft landing', () => {
    expect(flight('goldenHour', 90, 'soft').complete).toBe(true);
    expect(flight('sunset', 90, 'soft').complete).toBe(true);
    expect(flight('noon', 90, 'soft').complete).toBe(false);
    expect(flight('night', 90, 'soft').complete).toBe(false);
    expect(flight('goldenHour', 90, 'hard').complete).toBe(false);
    expect(flight('goldenHour', 90, null).complete).toBe(false);
    expect(flight('goldenHour', 30, 'soft').complete).toBe(false);
  });
  it('shows partial progress while flying in the right light', () => {
    const p = flight('sunset', 30, null).progress;
    expect(p).toBeGreaterThan(0.3);
    expect(p).toBeLessThan(0.6);
  });
});

describe('Cloud Chaser (checkpoints)', () => {
  const at = (c: { x: number; y: number; z: number }): FlightState => ({ ...base(), x: c.x, y: c.y - 6, z: c.z });
  it('passes rings only in order and only while tracked', () => {
    const r = run();
    updateRun(r, at(targets.checkpoints[1]), ctx({ tracked: 'cloud-chaser' }), 0.016);
    expect(r.checkpointsPassed).toBe(0);
    updateRun(r, at(targets.checkpoints[0]), ctx({ tracked: null }), 0.016);
    expect(r.checkpointsPassed).toBe(0);
    updateRun(r, at(targets.checkpoints[0]), ctx({ tracked: 'cloud-chaser' }), 0.016);
    expect(r.checkpointsPassed).toBe(1);
    expect(nextTarget('cloud-chaser', r, base(), ctx())?.label).toBe(`Ring 2 of ${CHECKPOINT_COUNT}`);
  });
  it('completes after all rings and then has no next target', () => {
    const r = run();
    for (const c of targets.checkpoints) updateRun(r, at(c), ctx({ tracked: 'cloud-chaser' }), 0.016);
    expect(status('cloud-chaser', r, base()).complete).toBe(true);
    expect(nextTarget('cloud-chaser', r, base(), ctx())).toBeNull();
  });
  it('close but outside the trigger distance does not count', () => {
    const r = run();
    const c = targets.checkpoints[0];
    updateRun(r, { ...at(c), x: c.x + 25 }, ctx({ tracked: 'cloud-chaser' }), 0.016);
    expect(r.checkpointsPassed).toBe(0);
  });
});

describe('Mountain Explorer', () => {
  it('needs the tracked mission, being airborne and being near the beacon', () => {
    const sc = targets.scenic;
    const over: FlightState = { ...base(), x: sc.x + SCENIC_TRIGGER - 5, z: sc.z, y: sc.ground + 30, groundHeight: sc.ground };
    const r1 = run();
    updateRun(r1, over, ctx({ tracked: null }), 0.016);
    expect(r1.scenicReached).toBe(false);
    const r2 = run();
    updateRun(r2, { ...over, x: sc.x + SCENIC_TRIGGER + 20 }, ctx({ tracked: 'mountain-explorer' }), 0.016);
    expect(r2.scenicReached).toBe(false);
    updateRun(r2, over, ctx({ tracked: 'mountain-explorer' }), 0.016);
    expect(status('mountain-explorer', r2, over).complete).toBe(true);
  });
});

describe('Precision Landing', () => {
  const landed = (dx: number, result: 'soft' | 'hard', tracked: MissionId | null = 'precision-landing') => {
    const z = targets.zone;
    const s: FlightState = { ...base(), phase: 'landed', landingResult: result, x: z.x + dx, z: z.z };
    return status('precision-landing', run(), s, ctx({ tracked }));
  };
  it('requires a soft landing inside the marked ring while tracked', () => {
    expect(landed(ZONE_RADIUS - 1, 'soft').complete).toBe(true);
    expect(landed(ZONE_RADIUS + 3, 'soft').complete).toBe(false);
    expect(landed(2, 'hard').complete).toBe(false);
    expect(landed(2, 'soft', null).complete).toBe(false);
  });
});

describe('Long-Distance Adventure', () => {
  const trip = (maxOut: number, endAt: number, result: 'soft' | 'hard' | 'flying') => {
    const r = run();
    r.maxDisplacement = maxOut;
    const s: FlightState = { ...base(), x: world.launch.x + endAt, z: world.launch.z };
    if (result !== 'flying') Object.assign(s, { phase: 'landed', landingResult: result });
    return status('long-distance', r, s);
  };
  it('needs the far point and a soft landing back home', () => {
    expect(trip(LONG_DISTANCE_GOAL, 30, 'soft').complete).toBe(true);
    expect(trip(LONG_DISTANCE_GOAL - 50, 30, 'soft').complete).toBe(false);
    expect(trip(LONG_DISTANCE_GOAL, 300, 'soft').complete).toBe(false);
    expect(trip(LONG_DISTANCE_GOAL, 30, 'hard').complete).toBe(false);
    expect(trip(LONG_DISTANCE_GOAL, 30, 'flying').complete).toBe(false);
  });
  it('progress rises on the way out and again on the way home', () => {
    const out = trip(250, 250, 'flying').progress;
    const far = trip(LONG_DISTANCE_GOAL, 480, 'flying').progress;
    const homeward = trip(LONG_DISTANCE_GOAL, 100, 'flying').progress;
    expect(out).toBeGreaterThan(0.25);
    expect(far).toBeGreaterThanOrEqual(0.6);
    expect(homeward).toBeGreaterThan(far);
    expect(homeward).toBeLessThan(1);
  });
  it('points the HUD back at the launch pad once the far point is reached', () => {
    const r = run();
    expect(nextTarget('long-distance', r, base(), ctx())).toBeNull();
    r.maxDisplacement = LONG_DISTANCE_GOAL;
    expect(nextTarget('long-distance', r, base(), ctx())?.label).toMatch(/launch/i);
  });
});

describe('achievements', () => {
  const none = new Set<MissionId>();
  it('has at least eight, each with a name, description, icon and condition', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(8);
    for (const a of ACHIEVEMENTS) {
      expect(a.name && a.description && a.icon && a.condition).toBeTruthy();
    }
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  it('unlocks nothing for a brand new pilot', () => {
    expect(satisfiedAchievements({ stats: emptyStats(), completed: none })).toEqual([]);
  });

  it('unlocks each achievement only when its own condition is met', () => {
    const check = (patch: Partial<ReturnType<typeof emptyStats>>, done: MissionId[] = []) =>
      satisfiedAchievements({ stats: { ...emptyStats(), ...patch }, completed: new Set(done) });
    expect(check({ takeoffs: 1 })).toEqual(['first-takeoff']);
    expect(check({ successfulLandings: 1 })).toEqual(['first-landing']);
    expect(check({ hardLandings: 4 })).toEqual([]);
    expect(check({ maxAltitudeGain: 249 })).toEqual([]);
    expect(check({ maxAltitudeGain: 250 })).toEqual(['high-flyer']);
    expect(check({ cloudsReached: true })).toEqual(['cloud-explorer']);
    expect(check({}, ['mountain-explorer'])).toEqual(['mountain-adventurer']);
    expect(check({}, ['golden-hour'])).toEqual(['sunset-traveler']);
    expect(check({ successfulLandings: 5 })).toEqual(expect.arrayContaining(['gentle-touch']));
    expect(check({ totalDistance: 5000 })).toEqual(['marathon']);
    expect(check({ flightsByWorld: { a: 1, b: 1, c: 1, d: 1, e: 1 } })).toEqual([]);
    expect(check({ flightsByWorld: { a: 1, b: 1, c: 1, d: 1, e: 1, f: 1 } })).toEqual(['world-explorer']);
    expect(check({}, MISSIONS.slice(0, 7).map((m) => m.id))).not.toContain('mission-master');
    expect(check({}, MISSIONS.map((m) => m.id))).toContain('mission-master');
  });
});
