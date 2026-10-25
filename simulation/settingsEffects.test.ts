import { describe, expect, it } from 'vitest';
import { QUALITY, QUALITY_NOTES, getQuality } from './quality';
import { dragLook, easeLookBack, LOOK_LIMITS } from './cameraLook';
import { audioAllowed, loopTargets, masterGain, soundForPhaseChange } from '../audio/audioMixing';
import { audio } from '../audio/audioEngine';
import { resolveReducedMotion } from '../hooks/useReducedMotion';
import { buildTerrainGeometry } from '../components/simulator/Terrain';
import { placeScatter } from './scatter';
import { WORLD_VISUALS } from '../components/simulator/worldVisuals';
import { MOUNTAIN_VALLEY } from './worldDefinitions';

describe('graphics quality', () => {
  const order = ['low', 'medium', 'high'] as const;
  it('every setting gets strictly more demanding from low to high', () => {
    for (const key of ['maxDpr', 'terrainSegments', 'props', 'clouds', 'ring'] as const) {
      expect(QUALITY.low[key]).toBeLessThan(QUALITY.medium[key]);
      expect(QUALITY.medium[key]).toBeLessThan(QUALITY.high[key]);
    }
    expect(QUALITY.low.antialias).toBe(false);
    expect(QUALITY.medium.antialias && QUALITY.high.antialias).toBe(true);
    expect(QUALITY.high.props).toBe(1);
    order.forEach((q) => expect(QUALITY_NOTES[q].length).toBeGreaterThan(20));
    expect(getQuality('medium')).toBe(QUALITY.medium);
  });

  it('lower quality really produces fewer vertices and fewer props', () => {
    const verts = (q: (typeof order)[number]) => {
      const g = buildTerrainGeometry(MOUNTAIN_VALLEY, QUALITY[q].terrainSegments);
      const n = g.getAttribute('position').count;
      g.dispose();
      return n;
    };
    expect(verts('low')).toBeLessThan(verts('medium'));
    expect(verts('medium')).toBeLessThan(verts('high'));
    const spec = WORLD_VISUALS['mountain-valley'].scatter[0];
    const trees = (q: (typeof order)[number]) => placeScatter(MOUNTAIN_VALLEY, spec, QUALITY[q].props).length;
    expect(trees('low')).toBeLessThan(trees('medium'));
    expect(trees('medium')).toBeLessThan(trees('high'));
  });
});

describe('drag-to-look (mouse sensitivity)', () => {
  it('turns the view in proportion to the sensitivity setting', () => {
    const a = dragLook({ yaw: 0, pitch: 0 }, 100, 0, 1);
    const b = dragLook({ yaw: 0, pitch: 0 }, 100, 0, 2);
    expect(Math.abs(b.yaw)).toBeCloseTo(Math.abs(a.yaw) * 2, 9);
    expect(a.yaw).toBeLessThan(0); // dragging right swings the view the other way, like grabbing the scene
    expect(dragLook({ yaw: 0, pitch: 0 }, 0, 0, 1)).toEqual({ yaw: 0, pitch: 0 });
  });

  it('limits how far up and down you can look', () => {
    expect(dragLook({ yaw: 0, pitch: 0 }, 0, 100000, 2.5).pitch).toBe(LOOK_LIMITS.maxPitch);
    expect(dragLook({ yaw: 0, pitch: 0 }, 0, -100000, 2.5).pitch).toBe(LOOK_LIMITS.minPitch);
  });

  it('eases back to the normal view after release and then stops exactly at zero', () => {
    let l = { yaw: 1.2, pitch: 0.5 };
    for (let i = 0; i < 600; i++) {
      const next = easeLookBack(l, 1 / 60);
      expect(Math.abs(next.yaw)).toBeLessThanOrEqual(Math.abs(l.yaw));
      l = next;
    }
    expect(l).toEqual({ yaw: 0, pitch: 0 });
  });
});

describe('audio mixing', () => {
  it('only makes sound when enabled and after a user gesture', () => {
    expect(audioAllowed(true, true)).toBe(true);
    expect(audioAllowed(true, false)).toBe(false);
    expect(audioAllowed(false, true)).toBe(false);
  });

  it('master volume is silent when sound is off and rises monotonically with the slider', () => {
    expect(masterGain(1, false)).toBe(0);
    expect(masterGain(0, true)).toBe(0);
    expect(masterGain(1, true)).toBe(1);
    expect(masterGain(0.5, true)).toBeGreaterThan(0);
    expect(masterGain(0.5, true)).toBeLessThan(masterGain(0.8, true));
    expect(masterGain(5, true)).toBe(1);
    expect(masterGain(-1, true)).toBe(0);
  });

  it('plays takeoff and landing sounds on the right phase changes only', () => {
    expect(soundForPhaseChange('inflating', 'takingOff', 'none')).toBe('takeoff');
    expect(soundForPhaseChange('landing', 'landed', 'soft')).toBe('landSoft');
    expect(soundForPhaseChange('landing', 'landed', 'hard')).toBe('landHard');
    expect(soundForPhaseChange('flying', 'landed', 'hard')).toBe('landHard');
    expect(soundForPhaseChange('flying', 'flying', 'none')).toBeNull();
    expect(soundForPhaseChange('flying', 'descending', 'none')).toBeNull();
    expect(soundForPhaseChange('grounded', 'inflating', 'none')).toBeNull();
    expect(soundForPhaseChange('takingOff', 'flying', 'none')).toBeNull();
  });

  it('burner loop is on only while the burner fires, wind grows with strength and height, pause silences all', () => {
    const base = { burnerOn: true, windStrength: 3, agl: 100, paused: false, active: true };
    expect(loopTargets(base).burnerGain).toBeGreaterThan(0);
    expect(loopTargets({ ...base, burnerOn: false }).burnerGain).toBe(0);
    expect(loopTargets({ ...base, active: false }).burnerGain).toBe(0);
    expect(loopTargets({ ...base, windStrength: 9 }).windGain).toBeGreaterThan(loopTargets(base).windGain);
    expect(loopTargets({ ...base, agl: 500 }).windGain).toBeGreaterThan(loopTargets(base).windGain);
    expect(loopTargets({ ...base, windStrength: 100, agl: 9999 }).windGain).toBeLessThanOrEqual(0.16);
    expect(loopTargets({ ...base, paused: true })).toMatchObject({ burnerGain: 0, windGain: 0 });
    expect(loopTargets({ ...base, windStrength: 9 }).windFreq).toBeGreaterThan(loopTargets(base).windFreq);
  });

  it('the engine is a safe no-op without Web Audio (e.g. tests, old browsers)', () => {
    expect(() => {
      audio.setVolume(0.5);
      audio.setEnabled(true);
      audio.unlock();
      audio.play('mission');
      audio.update({ burnerOn: true, windStrength: 3, agl: 10, paused: false, active: true });
      audio.suspend();
      audio.resume();
    }).not.toThrow();
  });
});

describe('reduced motion', () => {
  it('the explicit setting wins; "system" follows the device', () => {
    expect(resolveReducedMotion('on', false)).toBe(true);
    expect(resolveReducedMotion('off', true)).toBe(false);
    expect(resolveReducedMotion('system', true)).toBe(true);
    expect(resolveReducedMotion('system', false)).toBe(false);
  });
});
