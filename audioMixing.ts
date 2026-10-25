import type { FlightPhase, LandingResult } from '../types/flight';
import { clamp } from '../utils/random';

export type OneShot = 'takeoff' | 'landSoft' | 'landHard' | 'mission' | 'achievement' | 'test';

/** Which one-shot sound (if any) a phase change should trigger. */
export function soundForPhaseChange(prev: FlightPhase, next: FlightPhase, result: LandingResult): OneShot | null {
  if (prev === next) return null;
  if (next === 'takingOff' && prev === 'inflating') return 'takeoff';
  if (next === 'landed' && prev !== 'grounded' && prev !== 'inflating' && prev !== 'takingOff') {
    return result === 'hard' ? 'landHard' : 'landSoft';
  }
  return null;
}

/** Whether the audio engine is allowed to make any sound at all. */
export function audioAllowed(soundOn: boolean, unlockedByGesture: boolean): boolean {
  return soundOn && unlockedByGesture;
}

/** Perceptual master gain: volume 0..1 maps to a squared curve so the slider feels even. */
export function masterGain(volume: number, soundOn: boolean): number {
  return soundOn ? clamp(volume, 0, 1) ** 2 : 0;
}

export interface LoopInfo {
  burnerOn: boolean;
  windStrength: number;
  agl: number;
  paused: boolean;
  /** Only the airborne/pre-flight phases make burner noise. */
  active: boolean;
}

/** Target gains and filter frequency for the two continuous loops. */
export function loopTargets(i: LoopInfo): { burnerGain: number; windGain: number; windFreq: number } {
  if (i.paused) return { burnerGain: 0, windGain: 0, windFreq: 300 };
  return {
    burnerGain: i.burnerOn && i.active ? 0.34 : 0,
    windGain: clamp(0.03 + i.windStrength * 0.012 + clamp(i.agl, 0, 600) / 600 * 0.05, 0, 0.16),
    windFreq: 260 + i.windStrength * 60 + clamp(i.agl, 0, 600) * 0.6,
  };
}
