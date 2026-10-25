import { describe, expect, it } from 'vitest';
import {
  PHYSICS,
  beginFlight,
  createInitialState,
  stepFlight,
  type PhysicsContext,
} from './flightPhysics';
import { classifyLanding, resolveGround, sampleGround } from './collisionDetection';
import type { ControlInput, FlightState, Wind } from '../types/flight';

const flat: PhysicsContext = { groundAt: () => 0, launch: { x: 0, z: 0 } };
const calm: Wind = { direction: 0, strength: 0 };
const idle: ControlInput = { ascend: false, descend: false, steer: 0 };
const burn: ControlInput = { ascend: true, descend: false, steer: 0 };
const DT = 1 / 60;

function run(state: FlightState, input: ControlInput, seconds: number, wind = calm, ctx = flat) {
  let s = state;
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) s = stepFlight(s, input, wind, DT, ctx);
  return s;
}

/** Descends with a simple pilot that feathers the burner to keep the sink rate gentle. */
function pilotedDescent(state: FlightState, maxSeconds = 120): FlightState {
  let s = state;
  for (let i = 0; i < 60 * maxSeconds && s.phase !== 'landed'; i++) {
    s = stepFlight(s, { ascend: s.vy < -1.5, descend: false, steer: 0 }, calm, DT, flat);
  }
  return s;
}

/** A balloon already flying at the given altitude. */
function airborne(overrides: Partial<FlightState> = {}): FlightState {
  return {
    ...createInitialState({ x: 0, z: 0 }, 0),
    phase: 'flying',
    y: 100,
    heat: 0.5,
    inflation: 1,
    maxAltitude: 100,
    ...overrides,
  };
}

describe('takeoff sequence', () => {
  it('stays on the ground until the flight is started', () => {
    const s = run(createInitialState({ x: 0, z: 0 }, 0), burn, 5);
    expect(s.phase).toBe('grounded');
    expect(s.y).toBe(0);
    expect(s.elapsed).toBe(0);
  });

  it('runs inflating -> takingOff -> flying and gains altitude', () => {
    let s = beginFlight(createInitialState({ x: 0, z: 0 }, 0));
    expect(s.phase).toBe('inflating');
    s = run(s, idle, PHYSICS.inflateTime + 0.1);
    expect(s.phase).toBe('takingOff');
    expect(s.inflation).toBeCloseTo(1, 1);
    for (let i = 0; i < 60 * 30 && s.phase === 'takingOff'; i++) {
      s = stepFlight(s, idle, calm, DT, flat);
    }
    expect(s.phase).toBe('flying');
    expect(s.y).toBeGreaterThanOrEqual(PHYSICS.takeoffAgl);
    expect(s.elapsed).toBeGreaterThan(0);
  });

  it('does not count inflation time as flight time', () => {
    let s = beginFlight(createInitialState({ x: 0, z: 0 }, 0));
    s = run(s, idle, PHYSICS.inflateTime - 0.5);
    expect(s.elapsed).toBe(0);
  });

  it('ignores a second beginFlight call mid-flight', () => {
    const s = airborne();
    expect(beginFlight(s)).toBe(s);
  });
});

describe('ascending and descending', () => {
  it('climbs while the burner is on', () => {
    const s = run(airborne(), burn, 4);
    expect(s.y).toBeGreaterThan(100);
    expect(s.vy).toBeGreaterThan(0);
    expect(s.burnerOn).toBe(true);
  });

  it('sinks when the burner is off and the air cools', () => {
    const s = run(airborne({ heat: 0.4 }), idle, 6);
    expect(s.y).toBeLessThan(100);
    expect(s.vy).toBeLessThan(0);
  });

  it('venting makes the balloon descend faster than coasting', () => {
    const coast = run(airborne(), idle, 6);
    const vent = run(airborne(), { ...idle, descend: true }, 6);
    expect(vent.y).toBeLessThan(coast.y);
  });

  it('holds roughly level at neutral heat', () => {
    const s = run(airborne({ heat: 0.5 }), idle, 1);
    expect(Math.abs(s.y - 100)).toBeLessThan(0.5);
  });
});

describe('limits', () => {
  it('clamps ascent speed', () => {
    const s = run(airborne({ heat: 1 }), burn, 20);
    expect(s.vy).toBeLessThanOrEqual(PHYSICS.maxAscent + 1e-9);
  });

  it('clamps descent speed', () => {
    const s = run(airborne({ y: 600, heat: 0 }), { ...idle, descend: true }, 8);
    expect(s.vy).toBeGreaterThanOrEqual(-PHYSICS.maxDescent - 1e-9);
  });

  it('never exceeds the maximum altitude', () => {
    const s = run(airborne({ y: 690, heat: 1 }), burn, 60);
    expect(s.y).toBeLessThanOrEqual(PHYSICS.maxAltitude);
    expect(s.y).toBeLessThan(PHYSICS.ceiling + 40);
  });

  it('caps horizontal speed', () => {
    const s = run(airborne(), { ...idle, steer: 1 }, 30, { direction: 0, strength: 40 });
    expect(Math.hypot(s.vx, s.vz)).toBeLessThanOrEqual(PHYSICS.maxHorizontalSpeed + 1e-9);
  });

  it('clamps huge frame deltas so movement stays stable', () => {
    const slow = stepFlight(airborne({ heat: 1 }), burn, calm, 5, flat);
    const capped = stepFlight(airborne({ heat: 1 }), burn, calm, PHYSICS.maxDt, flat);
    expect(slow.y).toBeCloseTo(capped.y, 9);
  });

  it('gives the same result at 30 and 120 fps (frame-rate independence)', () => {
    const a = (() => {
      let s = airborne({ heat: 0.7 });
      for (let i = 0; i < 30 * 4; i++) s = stepFlight(s, burn, calm, 1 / 30, flat);
      return s;
    })();
    const b = (() => {
      let s = airborne({ heat: 0.7 });
      for (let i = 0; i < 120 * 4; i++) s = stepFlight(s, burn, calm, 1 / 120, flat);
      return s;
    })();
    expect(Math.abs(a.y - b.y)).toBeLessThan(0.5);
  });
});

describe('ground collision and landing', () => {
  it('resolveGround stops the basket at the surface', () => {
    expect(resolveGround(-3, -5, 0)).toEqual({ y: 0, vy: 0, touched: true, impactSpeed: 5 });
    expect(resolveGround(4, -5, 0).touched).toBe(false);
  });

  it('sampleGround returns the highest point under the footprint', () => {
    const ramp = (x: number) => x;
    expect(sampleGround(ramp, 10, 0, 2)).toBe(12);
  });

  it('never lets the balloon pass through terrain', () => {
    const hill: PhysicsContext = { groundAt: (x) => Math.max(0, 40 - Math.abs(x)), launch: { x: 0, z: 0 } };
    let s = airborne({ x: -60, y: 8, heat: 0.5 });
    for (let i = 0; i < 60 * 40; i++) {
      s = stepFlight(s, idle, { direction: Math.PI / 2, strength: 8 }, DT, hill);
      expect(s.y).toBeGreaterThanOrEqual(hill.groundAt(s.x, s.z) - 1e-9);
    }
  });

  it('detects a soft landing', () => {
    const s = pilotedDescent(airborne({ y: 40, heat: 0.4 }));
    expect(s.phase).toBe('landed');
    expect(s.landingResult).toBe('soft');
    expect(s.y).toBe(0);
    expect(s.vy).toBe(0);
  });

  it('detects a hard landing when descending too fast', () => {
    const s = run(airborne({ y: 40, vy: -6, heat: 0, phase: 'descending' }), { ...idle, descend: true }, 15);
    expect(s.phase).toBe('landed');
    expect(s.landingResult).toBe('hard');
  });

  it('lands hard if the pilot never uses the burner on the way down', () => {
    const s = run(airborne({ y: 60, heat: 0.4 }), idle, 60);
    expect(s.phase).toBe('landed');
    expect(s.landingResult).toBe('hard');
  });

  it('classifies landings by impact and ground speed', () => {
    expect(classifyLanding(1, 2)).toBe('soft');
    expect(classifyLanding(2.5, 6)).toBe('soft');
    expect(classifyLanding(3, 2)).toBe('hard');
    expect(classifyLanding(1, 9)).toBe('hard');
  });

  it('stops moving and stops the timer after landing', () => {
    const landed = pilotedDescent(airborne({ y: 40, heat: 0.4 }));
    const later = run(landed, burn, 5);
    expect(later.phase).toBe('landed');
    expect(later.elapsed).toBe(landed.elapsed);
    expect(later.y).toBe(0);
  });

  it('passes through the landing phase on the way down', () => {
    let s = airborne({ y: 30, heat: 0.4 });
    const seen = new Set<string>();
    for (let i = 0; i < 60 * 40 && s.phase !== 'landed'; i++) {
      s = stepFlight(s, idle, calm, DT, flat);
      seen.add(s.phase);
    }
    expect(seen.has('landing')).toBe(true);
    expect(s.phase).toBe('landed');
  });
});

describe('horizontal movement, distance and timer', () => {
  it('drifts downwind', () => {
    // Direction pi/2 blows toward +x.
    const s = run(airborne(), idle, 20, { direction: Math.PI / 2, strength: 6 });
    expect(s.x).toBeGreaterThan(20);
    expect(Math.abs(s.z)).toBeLessThan(1);
  });

  it('wind has less effect near the ground than at altitude', () => {
    const wind = { direction: Math.PI / 2, strength: 6 };
    const low = run(airborne({ y: 3, heat: 0.5 }), idle, 5, wind);
    const high = run(airborne({ y: 150, heat: 0.5 }), idle, 5, wind);
    expect(high.x).toBeGreaterThan(low.x);
  });

  it('steering right moves the balloon to the right of its heading', () => {
    const s = run(airborne({ heading: 0 }), { ...idle, steer: 1 }, 3);
    expect(s.x).toBeGreaterThan(0);
    const l = run(airborne({ heading: 0 }), { ...idle, steer: -1 }, 3);
    expect(l.x).toBeLessThan(0);
  });

  it('accumulates path length that matches the movement', () => {
    const s = run(airborne(), idle, 30, { direction: Math.PI / 2, strength: 6 });
    expect(s.distance).toBeGreaterThan(0);
    expect(s.distance).toBeGreaterThanOrEqual(Math.hypot(s.x, s.z) - 1e-6);
    expect(s.distance).toBeLessThan(Math.hypot(s.x, s.z) + 1);
  });

  it('adds no distance when nothing moves', () => {
    expect(run(airborne(), idle, 10).distance).toBeCloseTo(0, 6);
  });

  it('counts flight time only while airborne', () => {
    const s = run(airborne(), idle, 2);
    expect(s.elapsed).toBeCloseTo(2, 1);
  });

  it('tracks the maximum altitude reached', () => {
    let s = run(airborne({ heat: 0.8 }), burn, 5);
    const peak = s.y;
    s = run(s, { ...idle, descend: true }, 8);
    expect(s.maxAltitude).toBeGreaterThanOrEqual(peak - 1e-9);
    expect(s.maxAltitude).toBeGreaterThan(s.y);
  });
});

describe('world boundary', () => {
  it('keeps the balloon inside the playable radius against a strong wind', () => {
    const ctx: PhysicsContext = { ...flat, boundsRadius: 400 };
    let s = airborne({ x: 350, z: 0, y: 200 });
    for (let i = 0; i < 60 * 120; i++) {
      s = stepFlight(s, idle, { direction: Math.PI / 2, strength: 12 }, DT, ctx);
      expect(Math.hypot(s.x, s.z)).toBeLessThanOrEqual(400 + 1e-6);
    }
  });

  it('does not affect movement well inside the boundary', () => {
    const a = run(airborne(), idle, 10, { direction: Math.PI / 2, strength: 6 }, { ...flat, boundsRadius: 5000 });
    const b = run(airborne(), idle, 10, { direction: Math.PI / 2, strength: 6 });
    expect(a.x).toBeCloseTo(b.x, 6);
  });
});

describe('return to launch', () => {
  it('flies back toward the launch site and lands there', () => {
    const start = airborne({ x: 300, z: -200, y: 60, returning: true, heat: 0.5 });
    const startDist = Math.hypot(start.x, start.z);
    let s = start;
    for (let i = 0; i < 60 * 240 && s.phase !== 'landed'; i++) {
      s = stepFlight(s, idle, calm, DT, flat);
    }
    expect(startDist).toBeGreaterThan(300);
    expect(s.phase).toBe('landed');
    expect(Math.hypot(s.x, s.z)).toBeLessThan(60);
  });

  it('is cancelled by strong steering input', () => {
    const s = stepFlight(airborne({ returning: true }), { ...idle, steer: 1 }, calm, DT, flat);
    expect(s.returning).toBe(false);
  });
});
