import type { LifetimeStats } from '../types/progress';

/** Key with the highest value (ties go to the alphabetically first key). Null if empty. */
export function topKey(counts: Record<string, number>): string | null {
  let best: string | null = null;
  for (const k of Object.keys(counts).sort()) {
    if (best === null || counts[k] > counts[best]) best = k;
  }
  return best && counts[best] > 0 ? best : null;
}

export const favoriteWorld = (s: LifetimeStats) => topKey(s.flightsByWorld);
export const mostUsedBalloon = (s: LifetimeStats) => topKey(s.balloonUses);
