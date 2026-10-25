import type { LifetimeStats, MissionId } from '../types/progress';
import { MISSIONS } from './missionEngine';

export interface AchievementContext {
  stats: LifetimeStats;
  completed: ReadonlySet<MissionId>;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  /** Lucide icon name, resolved in the UI. */
  icon: 'Rocket' | 'PlaneLanding' | 'Mountain' | 'Cloud' | 'MountainSnow' | 'Sunset' | 'Trophy' | 'Globe' | 'Feather' | 'Route';
  condition: string;
  check: (c: AchievementContext) => boolean;
}

export const WORLD_COUNT = 6;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-takeoff', name: 'First Takeoff', description: 'Leave the ground for the first time.', icon: 'Rocket', condition: 'Take off once', check: (c) => c.stats.takeoffs >= 1 },
  { id: 'first-landing', name: 'First Landing', description: 'Bring the balloon down gently.', icon: 'PlaneLanding', condition: 'Make a soft landing', check: (c) => c.stats.successfulLandings >= 1 },
  { id: 'high-flyer', name: 'High Flyer', description: 'Climb far above where you started.', icon: 'Mountain', condition: 'Climb 250 m above a launch pad', check: (c) => c.stats.maxAltitudeGain >= 250 },
  { id: 'cloud-explorer', name: 'Cloud Explorer', description: 'Rise into the cloud layer.', icon: 'Cloud', condition: 'Reach the height of the clouds', check: (c) => c.stats.cloudsReached },
  { id: 'mountain-adventurer', name: 'Mountain Adventurer', description: 'Find and fly over a scenic summit.', icon: 'MountainSnow', condition: 'Complete Mountain Explorer', check: (c) => c.completed.has('mountain-explorer') },
  { id: 'sunset-traveler', name: 'Sunset Traveler', description: 'Fly a whole flight in evening light.', icon: 'Sunset', condition: 'Complete Golden Hour', check: (c) => c.completed.has('golden-hour') },
  { id: 'mission-master', name: 'Mission Master', description: 'Every mission, done.', icon: 'Trophy', condition: 'Complete all 8 missions', check: (c) => MISSIONS.every((m) => c.completed.has(m.id)) },
  { id: 'world-explorer', name: 'World Explorer', description: 'Fly in every world.', icon: 'Globe', condition: `Fly in all ${WORLD_COUNT} worlds`, check: (c) => Object.keys(c.stats.flightsByWorld).length >= WORLD_COUNT },
  { id: 'gentle-touch', name: 'Gentle Touch', description: 'Soft landings are a habit.', icon: 'Feather', condition: 'Make 5 soft landings', check: (c) => c.stats.successfulLandings >= 5 },
  { id: 'marathon', name: 'Marathon Flyer', description: 'Many small flights add up.', icon: 'Route', condition: 'Fly 5 km in total', check: (c) => c.stats.totalDistance >= 5000 },
];

/** IDs of achievements whose conditions are met right now. */
export function satisfiedAchievements(ctx: AchievementContext): string[] {
  return ACHIEVEMENTS.filter((a) => a.check(ctx)).map((a) => a.id);
}
