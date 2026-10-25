export type FlightPhase =
  | 'grounded'
  | 'inflating'
  | 'takingOff'
  | 'flying'
  | 'descending'
  | 'landing'
  | 'landed';

export type LandingResult = 'none' | 'soft' | 'hard';

export type CameraMode = 'chase' | 'basket' | 'side' | 'cinematic';

export interface FlightState {
  phase: FlightPhase;
  /** World position of the basket floor, metres. */
  x: number;
  y: number;
  z: number;
  /** Horizontal velocity, m/s. */
  vx: number;
  vz: number;
  /** Vertical velocity, m/s (positive = up). */
  vy: number;
  /** Envelope air heat, 0..1. 0.5 is neutral buoyancy. */
  heat: number;
  /** 0..1 visual envelope inflation. */
  inflation: number;
  burnerOn: boolean;
  /** Heading in radians. 0 = north (-z), positive turns toward +x. */
  heading: number;
  /** Seconds of flight time (takeoff to landing). */
  elapsed: number;
  /** Path length travelled horizontally, metres. */
  distance: number;
  /** Highest world altitude reached, metres. */
  maxAltitude: number;
  /** Seconds remaining in the inflation countdown. */
  countdown: number;
  landingResult: LandingResult;
  /** Ground height beneath the basket, metres. */
  groundHeight: number;
  returning: boolean;
}

export interface ControlInput {
  ascend: boolean;
  descend: boolean;
  /** -1 = left, 1 = right */
  steer: number;
}

export interface Wind {
  /** Direction the wind blows toward, radians (same convention as heading). */
  direction: number;
  /** Metres per second. */
  strength: number;
}

export interface FlightSnapshot {
  phase: FlightPhase;
  altitude: number;
  agl: number;
  verticalSpeed: number;
  groundSpeed: number;
  elapsed: number;
  distance: number;
  maxAltitude: number;
  heading: number;
  windSpeed: number;
  windDirection: number;
  burnerOn: boolean;
  heat: number;
  countdown: number;
  landingResult: LandingResult;
  returning: boolean;
}
