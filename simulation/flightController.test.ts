import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyConditions, getSnapshot, resetFlight, runtime, setWorld, startFlight, toggleReturnToLaunch, updateFlight, windAt,
} from './flightController';
import { LAKE_PARADISE, LAUNCH_HEIGHT, MOUNTAIN_VALLEY, WORLDS } from './worldDefinitions';

const DT = 1 / 60;
function advance(seconds: number) {
  for (let i = 0; i < Math.round(seconds / DT); i++) updateFlight(DT);
}

describe('flight controller on the Mountain Valley world', () => {
  beforeEach(() => {
    setWorld(MOUNTAIN_VALLEY);
    applyConditions('clear', null, null);
  });

  it('starts grounded on the launch pad', () => {
    expect(runtime.state.phase).toBe('grounded');
    expect(runtime.state.y).toBeCloseTo(LAUNCH_HEIGHT, 5);
    advance(3);
    expect(runtime.state.phase).toBe('grounded');
    expect(getSnapshot().elapsed).toBe(0);
  });

  it('takes off from the launch pad and climbs above the terrain', () => {
    startFlight();
    expect(runtime.state.phase).toBe('inflating');
    advance(3.2);
    expect(runtime.state.phase).toBe('takingOff');
    advance(15);
    expect(['flying', 'descending', 'landing']).toContain(runtime.state.phase);
    expect(runtime.state.y).toBeGreaterThan(LAUNCH_HEIGHT + 5);
    expect(getSnapshot().elapsed).toBeGreaterThan(10);
  });

  it('keeps the basket above the real terrain for a whole drifting flight', () => {
    startFlight();
    runtime.input.ascend = true;
    advance(20);
    runtime.input.ascend = false;
    for (let i = 0; i < 60 * 120; i++) {
      // a crude pilot: burn when sinking faster than 1.5 m/s
      runtime.input.ascend = runtime.state.vy < -1.5;
      updateFlight(DT);
      const ground = MOUNTAIN_VALLEY.heightAt(runtime.state.x, runtime.state.z);
      expect(runtime.state.y).toBeGreaterThanOrEqual(ground - 1e-6);
    }
    expect(runtime.state.distance).toBeGreaterThan(0);
  });

  it('reset returns to a clean grounded state', () => {
    startFlight();
    advance(10);
    resetFlight();
    expect(runtime.state.phase).toBe('grounded');
    expect(runtime.state.distance).toBe(0);
    expect(runtime.state.elapsed).toBe(0);
    expect(runtime.input).toEqual({ ascend: false, descend: false, steer: 0 });
  });

  it('return-to-launch toggles in flight and resets when grounded', () => {
    startFlight();
    advance(14);
    toggleReturnToLaunch();
    expect(runtime.state.returning).toBe(true);
    toggleReturnToLaunch();
    expect(runtime.state.returning).toBe(false);
    runtime.state = { ...runtime.state, phase: 'landed' };
    toggleReturnToLaunch();
    expect(runtime.state.phase).toBe('grounded');
  });

  it('gusts stay within a believable band around the base wind', () => {
    const base = MOUNTAIN_VALLEY.wind.strength;
    for (let t = 0; t < 600; t += 0.7) {
      const w = windAt(MOUNTAIN_VALLEY, t);
      expect(w.strength).toBeGreaterThan(base * 0.65);
      expect(w.strength).toBeLessThan(base * 1.35);
    }
  });

  it('snapshot reflects the live state', () => {
    startFlight();
    advance(16);
    const snap = getSnapshot();
    expect(snap.altitude).toBe(runtime.state.y);
    expect(snap.agl).toBeCloseTo(runtime.state.y - runtime.state.groundHeight, 6);
    expect(snap.phase).toBe(runtime.state.phase);
  });
});

describe('wind conditions', () => {
  beforeEach(() => {
    setWorld(MOUNTAIN_VALLEY);
    applyConditions('clear', null, null);
  });
  const mean = (cond: Parameters<typeof windAt>[2]) => {
    let s = 0;
    let n = 0;
    for (let t = 0; t < 300; t += 0.5) { s += windAt(MOUNTAIN_VALLEY, t, cond).strength; n++; }
    return s / n;
  };

  it('weather scales the wind: windy > clear > misty', () => {
    applyConditions('windy', null, null);
    const windy = mean(runtime.conditions);
    applyConditions('clear', null, null);
    const clear = mean(runtime.conditions);
    applyConditions('misty', null, null);
    const misty = mean(runtime.conditions);
    expect(windy).toBeGreaterThan(clear * 1.8);
    expect(misty).toBeLessThan(clear * 0.7);
  });

  it('gusts vary more in windy weather than in clear weather', () => {
    const range = (w: 'clear' | 'windy') => {
      applyConditions(w, null, 5);
      const v = Array.from({ length: 400 }, (_, i) => windAt(MOUNTAIN_VALLEY, i * 0.5).strength);
      return Math.max(...v) - Math.min(...v);
    };
    expect(range('windy')).toBeGreaterThan(range('clear'));
  });

  it('manual direction and strength override the world wind', () => {
    applyConditions('clear', 270, 8);
    const w = windAt(MOUNTAIN_VALLEY, 0);
    expect(w.direction).toBeCloseTo((270 * Math.PI) / 180, 1);
    expect(mean(runtime.conditions)).toBeGreaterThan(7);
    applyConditions('clear', null, 0);
    expect(windAt(MOUNTAIN_VALLEY, 12).strength).toBe(0);
  });

  it('a manual west wind actually carries the balloon west', () => {
    applyConditions('clear', 270, 8);
    startFlight();
    const DT = 1 / 60;
    for (let i = 0; i < 60 * 40; i++) {
      runtime.input.ascend = runtime.state.phase === 'flying' && runtime.state.vy < 1 && runtime.state.y - runtime.state.groundHeight < 60;
      updateFlight(DT);
    }
    expect(runtime.state.x).toBeLessThan(-20);
  });
});

describe('every world is flyable', () => {
  for (const world of WORLDS) {
    it(`${world.name}: takes off from the launch pad`, () => {
      setWorld(world);
      applyConditions(world.defaults.weather, null, null);
      expect(runtime.state.y).toBeCloseTo(world.launch.height, 4);
      startFlight();
      const seen = new Set<string>();
      for (let i = 0; i < 60 * 22; i++) {
        updateFlight(1 / 60);
        seen.add(runtime.state.phase);
      }
      // With no pilot input the balloon lifts off, cools and eventually settles again.
      expect(seen.has('inflating')).toBe(true);
      expect(seen.has('takingOff')).toBe(true);
      expect(seen.has('flying')).toBe(true);
      expect(runtime.state.maxAltitude).toBeGreaterThan(world.launch.height + 5);
    });
  }

  it('switching world resets the flight and adopts the new launch site', () => {
    setWorld(MOUNTAIN_VALLEY);
    startFlight();
    for (let i = 0; i < 60 * 10; i++) updateFlight(1 / 60);
    setWorld(LAKE_PARADISE);
    expect(runtime.state.phase).toBe('grounded');
    expect(runtime.state.y).toBeCloseTo(LAKE_PARADISE.launch.height, 4);
    expect(runtime.state.elapsed).toBe(0);
  });

  it('a balloon descending onto the lake lands on the water surface', () => {
    setWorld(LAKE_PARADISE);
    const lake = LAKE_PARADISE.lake!;
    runtime.state = { ...runtime.state, phase: 'flying', x: lake.cx, z: lake.cz, y: 40, heat: 0.4, vy: 0, inflation: 1 };
    for (let i = 0; i < 60 * 90 && runtime.state.phase !== 'landed'; i++) {
      runtime.input.ascend = runtime.state.vy < -1.5;
      updateFlight(1 / 60);
    }
    expect(runtime.state.phase).toBe('landed');
    expect(runtime.state.y).toBeCloseTo(lake.level, 3);
  });
});
