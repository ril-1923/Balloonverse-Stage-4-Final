import type { LandingResult } from '../types/flight';

export const SAFE_IMPACT_SPEED = 2.5; // m/s vertical
export const SAFE_GROUND_SPEED = 6; // m/s horizontal

/** Highest terrain point under the basket footprint (centre + four edge samples). */
export function sampleGround(
  groundAt: (x: number, z: number) => number,
  x: number,
  z: number,
  radius = 1.6,
): number {
  return Math.max(
    groundAt(x, z),
    groundAt(x + radius, z),
    groundAt(x - radius, z),
    groundAt(x, z + radius),
    groundAt(x, z - radius),
  );
}

export interface GroundResolution {
  y: number;
  vy: number;
  touched: boolean;
  impactSpeed: number;
}

/** Keeps the basket from sinking below the ground. */
export function resolveGround(y: number, vy: number, groundHeight: number): GroundResolution {
  if (y <= groundHeight) {
    return { y: groundHeight, vy: 0, touched: true, impactSpeed: Math.max(0, -vy) };
  }
  return { y, vy, touched: false, impactSpeed: 0 };
}

export function classifyLanding(impactSpeed: number, groundSpeed: number): LandingResult {
  return impactSpeed <= SAFE_IMPACT_SPEED && groundSpeed <= SAFE_GROUND_SPEED ? 'soft' : 'hard';
}
