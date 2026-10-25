export type MissionId =
  | 'first-flight'
  | 'sky-explorer'
  | 'cloud-chaser'
  | 'mountain-explorer'
  | 'wind-rider'
  | 'golden-hour'
  | 'precision-landing'
  | 'long-distance';

export type FlightResult = 'soft' | 'hard' | 'aborted';

export interface FlightRecord {
  id: string;
  date: string;
  worldId: string;
  /** seconds */
  duration: number;
  /** highest world altitude reached, metres */
  maxAltitude: number;
  /** metres flown */
  distance: number;
  result: FlightResult;
  balloon: string;
  missions: string[];
}

export interface LifetimeStats {
  takeoffs: number;
  totalFlights: number;
  totalDuration: number;
  totalDistance: number;
  highestAltitude: number;
  maxAltitudeGain: number;
  successfulLandings: number;
  hardLandings: number;
  flightsByWorld: Record<string, number>;
  distanceByWorld: Record<string, number>;
  balloonUses: Record<string, number>;
  cloudsReached: boolean;
}

export interface ProgressData {
  completed: Record<string, string>;
  bestProgress: Record<string, number>;
  points: number;
  achievements: Record<string, string>;
  tracked: MissionId | null;
  stats: LifetimeStats;
  history: FlightRecord[];
}

export const emptyStats = (): LifetimeStats => ({
  takeoffs: 0,
  totalFlights: 0,
  totalDuration: 0,
  totalDistance: 0,
  highestAltitude: 0,
  maxAltitudeGain: 0,
  successfulLandings: 0,
  hardLandings: 0,
  flightsByWorld: {},
  distanceByWorld: {},
  balloonUses: {},
  cloudsReached: false,
});

export const emptyProgress = (): ProgressData => ({
  completed: {},
  bestProgress: {},
  points: 0,
  achievements: {},
  tracked: null,
  stats: emptyStats(),
  history: [],
});
