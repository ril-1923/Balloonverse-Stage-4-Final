import { describe, expect, it } from 'vitest';
import {
  COUNTRY_LAUNCH, countryCrossing, countryRiverX, countryRoadZ, DESERT_ADVENTURE, getWorld, GREEN_COUNTRYSIDE,
  LAKE_LEVEL, LAKE_PARADISE, MOUNTAIN_VALLEY, NIGHT_SKY, riverX, slopeAt, SUNSET_HORIZON, WORLDS,
} from './worldDefinitions';
import { placeScatter } from './scatter';
import { buildTerrainGeometry } from '../components/simulator/Terrain';
import { buildRiverGeometry } from '../components/simulator/Water';
import { GEOMETRY_BUILDERS } from '../components/simulator/scatterGeometry';
import { WORLD_VISUALS } from '../components/simulator/worldVisuals';
import { createRng, fbm2 } from '../utils/random';

const w = MOUNTAIN_VALLEY;

describe('all six worlds', () => {
  it('defines six distinct worlds', () => {
    expect(WORLDS).toHaveLength(6);
    expect(new Set(WORLDS.map((x) => x.id)).size).toBe(6);
    expect(new Set(WORLDS.map((x) => x.name)).size).toBe(6);
    expect(getWorld('night-sky')).toBe(NIGHT_SKY);
  });

  for (const world of WORLDS) {
    describe(world.name, () => {
      it('has a flat launch plateau at its launch height', () => {
        for (const [x, z] of [[0, 0], [10, 5], [-20, 15], [25, -25]]) {
          expect(world.heightAt(x, z)).toBeCloseTo(world.launch.height, 4);
        }
        expect(slopeAt(world, 0, 0)).toBeLessThan(0.01);
        expect(world.groundAt(0, 0)).toBeGreaterThanOrEqual(world.launch.height - 1e-6);
      });

      it('gives finite, deterministic heights over the whole map', () => {
        for (let x = -800; x <= 800; x += 100) {
          for (let z = -800; z <= 800; z += 100) {
            const h = world.heightAt(x, z);
            expect(Number.isFinite(h)).toBe(true);
            expect(world.heightAt(x, z)).toBe(h);
            expect(world.groundAt(x, z)).toBeGreaterThanOrEqual(h - 1e-9);
          }
        }
      });

      it('builds a coloured terrain mesh that matches the height function', () => {
        const geo = buildTerrainGeometry(world, 24);
        const pos = geo.getAttribute('position');
        expect(pos.count).toBe(25 * 25);
        for (let i = 0; i < pos.count; i += 29) {
          expect(pos.getY(i)).toBeCloseTo(world.heightAt(pos.getX(i), pos.getZ(i)), 4);
        }
        for (const v of geo.getAttribute('color').array) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
        geo.dispose();
      });

      it('has a launch site ringed by a sensible starting wind and fog', () => {
        expect(world.wind.strength).toBeGreaterThan(0);
        expect(world.wind.strength).toBeLessThan(8);
        expect(world.fog.far).toBeGreaterThan(world.fog.near);
        expect(world.boundsRadius).toBeLessThan(world.size / 2);
        expect([1, 2, 3]).toContain(world.difficulty);
      });

      it('has visuals and every prop kind it uses can be built', () => {
        const v = WORLD_VISUALS[world.id];
        expect(v.scatter.length).toBeGreaterThan(0);
        for (const spec of v.scatter) {
          const geo = GEOMETRY_BUILDERS[spec.kind]();
          expect(geo.getAttribute('color').count).toBe(geo.getAttribute('position').count);
          geo.dispose();
        }
      });

      it('places props deterministically, away from the launch pad and from water', () => {
        for (const spec of WORLD_VISUALS[world.id].scatter) {
          const a = placeScatter(world, spec, 0.2);
          expect(placeScatter(world, spec, 0.2)).toEqual(a);
          expect(a.length).toBeLessThanOrEqual(Math.round(spec.count * 0.2));
          for (const p of a) {
            expect(Math.hypot(p.x - world.launch.x, p.z - world.launch.z)).toBeGreaterThanOrEqual(spec.launchClear ?? 60);
            expect(world.blocked(p.x, p.z)).toBe(false);
            expect(p.y).toBeGreaterThan(spec.minY - 1);
          }
        }
      });
    });
  }
});

describe('world-specific features', () => {
  it('mountain valley rises into mountains and carves its river', () => {
    let valleyMax = 0;
    let ridgeMax = 0;
    for (let a = 0; a < Math.PI * 2; a += 0.2) {
      valleyMax = Math.max(valleyMax, w.heightAt(Math.sin(a) * 150, Math.cos(a) * 150));
      ridgeMax = Math.max(ridgeMax, w.heightAt(Math.sin(a) * 600, Math.cos(a) * 600));
    }
    expect(ridgeMax).toBeGreaterThan(valleyMax + 100);
    expect(w.heightAt(riverX(0), 0)).toBeLessThan(w.heightAt(riverX(0) + 60, 0) - 3);
  });

  it('river water counts as ground so the basket cannot sink into it', () => {
    const x = riverX(0);
    expect(w.groundAt(x, 0)).toBeGreaterThanOrEqual(w.river!.level);
    expect(w.groundAt(x, 0)).toBeGreaterThan(w.heightAt(x, 0));
  });

  it('countryside road crosses the river at a bridge location on both curves', () => {
    const c = countryCrossing();
    expect(Math.abs(c.x - countryRiverX(countryRoadZ(c.x)))).toBeLessThan(0.5);
    expect(c.z).toBeCloseTo(countryRoadZ(c.x), 3);
    expect(GREEN_COUNTRYSIDE.launch.height).toBe(COUNTRY_LAUNCH);
    expect(GREEN_COUNTRYSIDE.blocked(c.x, countryRoadZ(c.x))).toBe(true);
  });

  it('countryside has villages (clustered houses) and farms', () => {
    const [, , houses, barns] = WORLD_VISUALS['green-countryside'].scatter;
    const h = placeScatter(GREEN_COUNTRYSIDE, houses);
    expect(h.length).toBeGreaterThan(12);
    expect(placeScatter(GREEN_COUNTRYSIDE, barns).length).toBeGreaterThan(2);
    // clustered: median distance to the nearest neighbour is small
    const nearest = h.map((p) => Math.min(...h.filter((q) => q !== p).map((q) => Math.hypot(p.x - q.x, p.z - q.z))));
    nearest.sort((a, b) => a - b);
    expect(nearest[Math.floor(nearest.length / 2)]).toBeLessThan(40);
  });

  it('desert has dunes, mesas and rocks', () => {
    let max = 0;
    let min = Infinity;
    for (let x = -700; x <= 700; x += 20) {
      for (let z = -700; z <= 700; z += 20) {
        const h = DESERT_ADVENTURE.heightAt(x, z);
        max = Math.max(max, h);
        min = Math.min(min, h);
      }
    }
    expect(max).toBeGreaterThan(85); // mesa tops
    expect(max - min).toBeGreaterThan(70);
    expect(placeScatter(DESERT_ADVENTURE, WORLD_VISUALS['desert-adventure'].scatter[0]).length).toBeGreaterThan(30);
  });

  it('lake paradise has a real lake the basket can rest on, with shoreline trees', () => {
    const lake = LAKE_PARADISE.lake!;
    expect(lake.level).toBe(LAKE_LEVEL);
    expect(LAKE_PARADISE.heightAt(lake.cx, lake.cz)).toBeLessThan(LAKE_LEVEL - 4);
    expect(LAKE_PARADISE.groundAt(lake.cx, lake.cz)).toBe(LAKE_LEVEL);
    expect(LAKE_PARADISE.heightAt(0, 0)).toBeGreaterThan(LAKE_LEVEL + 10);
    const shore = placeScatter(LAKE_PARADISE, WORLD_VISUALS['lake-paradise'].scatter[1]);
    expect(shore.length).toBeGreaterThan(30);
    for (const p of shore) expect(p.y).toBeGreaterThan(LAKE_LEVEL + 1.5);
    // mountains surround the lake
    let high = 0;
    for (let a = 0; a < Math.PI * 2; a += 0.1) high = Math.max(high, LAKE_PARADISE.heightAt(Math.sin(a) * 650, Math.cos(a) * 650 - 200));
    expect(high).toBeGreaterThan(150);
  });

  it('sunset horizon and night sky default to the matching time of day', () => {
    expect(SUNSET_HORIZON.defaults.timeOfDay).toBe('sunset');
    expect(NIGHT_SKY.defaults.timeOfDay).toBe('night');
    expect(LAKE_PARADISE.defaults.weather).toBe('misty');
  });

  it('night world has flat spots far away for distant city lights', () => {
    const cities = placeScatter(NIGHT_SKY, {
      kind: 'house', seed: 99, count: 1400, minY: 10, maxY: 90, maxSlope: 0.3, scale: [1, 1], launchClear: 300,
      cluster: { centres: 4, radius: 60, minDistFromLaunch: 380 },
    });
    expect(cities.length).toBeGreaterThan(200);
    for (const c of cities) expect(Math.hypot(c.x, c.z)).toBeGreaterThan(300);
  });

  it('builds the river ribbon only for worlds that have a river', () => {
    expect(buildRiverGeometry(w).getAttribute('position').count).toBeGreaterThan(10);
    expect(buildRiverGeometry(DESERT_ADVENTURE).getAttribute('position').count).toBe(0);
  });

  it('every world has a visibly different terrain palette', () => {
    const sample = (id: keyof typeof WORLD_VISUALS) => {
      const geo = buildTerrainGeometry(getWorld(id), 16);
      const c = geo.getAttribute('color');
      let r = 0;
      let g = 0;
      let b = 0;
      for (let i = 0; i < c.count; i++) { r += c.getX(i); g += c.getY(i); b += c.getZ(i); }
      geo.dispose();
      return [r / c.count, g / c.count, b / c.count];
    };
    const avgs = WORLDS.map((x) => sample(x.id));
    for (let i = 0; i < avgs.length; i++) {
      for (let j = i + 1; j < avgs.length; j++) {
        const d = Math.hypot(avgs[i][0] - avgs[j][0], avgs[i][1] - avgs[j][1], avgs[i][2] - avgs[j][2]);
        expect(d).toBeGreaterThan(0.02);
      }
    }
  });
});

describe('random utilities', () => {
  it('createRng is repeatable and in [0, 1)', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('fbm2 stays in [0, 1]', () => {
    for (let i = 0; i < 500; i++) {
      const v = fbm2(i * 0.37, i * 0.91, 4, 3);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
