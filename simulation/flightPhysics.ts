import type { ControlInput, FlightState, Wind } from '../types/flight';
import { clamp } from '../utils/random';
import { classifyLanding, resolveGround, sampleGround } from './collisionDetection';

/**
 * Simplified, game-style balloon model. Not physically accurate aerodynamics:
 * a single "heat" value sets buoyancy, wind blends in with altitude.
 */
export const PHYSICS = {
  neutralHeat: 0.5,
  liftScale: 14, // m/s² per unit of heat above/below neutral
  drag: 1.2, // 1/s vertical damping
  burnRate: 0.25, // heat/s while burner is on
  ventRate: 0.3, // heat/s while venting
  passiveCooling: 0.03, // heat/s
  maxAscent: 7, // m/s
  maxDescent: 6, // m/s
  ceiling: 700, // m, lift fades out near this altitude
  maxAltitude: 760,
  maxHorizontalSpeed: 15,
  steerSpeed: 6,
  horizontalTau: 2.5, // s, how quickly velocity follows the wind
  inflateTime: 3, // s
  takeoffAgl: 6, // m AGL where takeoff completes
  maxDt: 1 / 20,
} as const;

export interface PhysicsContext {
  groundAt: (x: number, z: number) => number;
  launch: { x: number; z: number };
  /** Optional playable radius around the world origin. Wind pushes back inside it. */
  boundsRadius?: number;
}

export function createInitialState(launch: { x: number; z: number }, groundHeight: number): FlightState {
  return {
    phase: 'grounded',
    x: launch.x,
    y: groundHeight,
    z: launch.z,
    vx: 0,
    vz: 0,
    vy: 0,
    heat: 0.3,
    inflation: 0,
    burnerOn: false,
    heading: 0,
    elapsed: 0,
    distance: 0,
    maxAltitude: groundHeight,
    countdown: PHYSICS.inflateTime,
    landingResult: 'none',
    groundHeight,
    returning: false,
  };
}

/** Starts the inflation countdown. No effect unless the balloon is grounded. */
export function beginFlight(state: FlightState): FlightState {
  if (state.phase !== 'grounded') return state;
  return { ...state, phase: 'inflating', countdown: PHYSICS.inflateTime };
}

const isAirPhase = (p: FlightState['phase']) =>
  p === 'takingOff' || p === 'flying' || p === 'descending' || p === 'landing';

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Synthesises burner/vent input that guides the balloon back to the launch site. */
function autopilotInput(state: FlightState, ctx: PhysicsContext): ControlInput {
  const agl = state.y - state.groundHeight;
  const dist = Math.hypot(ctx.launch.x - state.x, ctx.launch.z - state.z);
  if (dist > 40) {
    return { ascend: agl < 30 || (state.vy < -0.5 && agl < 60), descend: agl > 90, steer: 0 };
  }
  // Close to launch: descend at roughly 1.5 m/s.
  return { ascend: state.vy < -2.2, descend: state.vy > -1 && agl > 3, steer: 0 };
}

export function stepFlight(
  prev: FlightState,
  rawInput: ControlInput,
  wind: Wind,
  dtRaw: number,
  ctx: PhysicsContext,
): FlightState {
  const dt = clamp(dtRaw, 0, PHYSICS.maxDt);
  if (dt === 0) return prev;
  const s: FlightState = { ...prev };
  s.groundHeight = sampleGround(ctx.groundAt, s.x, s.z);

  // --- Pre-flight phases -------------------------------------------------
  if (s.phase === 'grounded' || s.phase === 'landed') {
    s.y = s.groundHeight;
    s.vx = s.vz = s.vy = 0;
    s.burnerOn = false;
    return s;
  }
  if (s.phase === 'inflating') {
    s.countdown = Math.max(0, s.countdown - dt);
    const t = 1 - s.countdown / PHYSICS.inflateTime;
    s.inflation = t;
    s.heat = 0.3 + 0.2 * t;
    s.burnerOn = t > 0.2;
    s.y = s.groundHeight;
    if (s.countdown === 0) {
      s.phase = 'takingOff';
      s.heat = PHYSICS.neutralHeat;
    }
    return s;
  }

  // --- Airborne ----------------------------------------------------------
  let input = rawInput;
  if (s.returning) {
    if (Math.abs(rawInput.steer) > 0.5) s.returning = false;
    else input = autopilotInput(s, ctx);
  }

  const agl = s.y - s.groundHeight;
  const takingOff = s.phase === 'takingOff';
  const burn = takingOff ? s.heat < 0.65 : input.ascend;
  s.burnerOn = burn;

  if (burn) s.heat += PHYSICS.burnRate * dt;
  else s.heat -= PHYSICS.passiveCooling * dt;
  if (!takingOff && input.descend) s.heat -= PHYSICS.ventRate * dt;
  s.heat = clamp(s.heat, 0, 1);

  // Vertical dynamics.
  const ceilingFade = clamp((PHYSICS.ceiling - s.y) / 60, 0, 1);
  let accel = (s.heat - PHYSICS.neutralHeat) * PHYSICS.liftScale;
  if (accel > 0) accel *= ceilingFade;
  accel -= PHYSICS.drag * s.vy;
  s.vy = clamp(s.vy + accel * dt, -PHYSICS.maxDescent, PHYSICS.maxAscent);
  s.y = Math.min(s.y + s.vy * dt, PHYSICS.maxAltitude);

  // Horizontal dynamics: wind (stronger with height) plus steering.
  const windFactor = 0.15 + 0.85 * clamp(agl / 80, 0, 1);
  const wx = Math.sin(wind.direction) * wind.strength * windFactor;
  const wz = -Math.cos(wind.direction) * wind.strength * windFactor;
  const airFactor = clamp(agl / 8, 0, 1);
  const steer = clamp(input.steer, -1, 1);
  let tx = wx + Math.cos(s.heading) * steer * PHYSICS.steerSpeed * airFactor;
  let tz = wz + Math.sin(s.heading) * steer * PHYSICS.steerSpeed * airFactor;

  if (s.returning) {
    const dx = ctx.launch.x - s.x;
    const dz = ctx.launch.z - s.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.001) {
      const speed = Math.min(8, dist / 3 + 1);
      tx = (dx / dist) * speed * airFactor;
      tz = (dz / dist) * speed * airFactor;
    }
  }

  // Soft world boundary: push gently back inward near the edge of the map.
  if (ctx.boundsRadius) {
    const r = Math.hypot(s.x, s.z);
    const edge = clamp((r / ctx.boundsRadius - 0.8) / 0.2, 0, 1);
    if (edge > 0 && r > 0.001) {
      const push = edge * edge * 12;
      tx -= (s.x / r) * push;
      tz -= (s.z / r) * push;
    }
  }

  const k = 1 - Math.exp(-dt / PHYSICS.horizontalTau);
  s.vx += (tx - s.vx) * k;
  s.vz += (tz - s.vz) * k;
  const speed = Math.hypot(s.vx, s.vz);
  if (speed > PHYSICS.maxHorizontalSpeed) {
    s.vx *= PHYSICS.maxHorizontalSpeed / speed;
    s.vz *= PHYSICS.maxHorizontalSpeed / speed;
  }

  const px = s.x;
  const pz = s.z;
  s.x += s.vx * dt;
  s.z += s.vz * dt;
  if (ctx.boundsRadius) {
    const r = Math.hypot(s.x, s.z);
    if (r > ctx.boundsRadius) {
      s.x *= ctx.boundsRadius / r;
      s.z *= ctx.boundsRadius / r;
    }
  }
  s.distance += Math.hypot(s.x - px, s.z - pz);

  if (speed > 0.5) {
    const target = Math.atan2(s.vx, -s.vz);
    s.heading = wrapAngle(s.heading + wrapAngle(target - s.heading) * (1 - Math.exp(-dt / 1.5)));
  }

  // Ground collision at the new position.
  s.groundHeight = sampleGround(ctx.groundAt, s.x, s.z);
  const hit = resolveGround(s.y, s.vy, s.groundHeight);
  s.y = hit.y;
  s.vy = hit.vy;

  const hadFlown = s.phase !== 'takingOff';
  if (hit.touched && hadFlown) {
    s.phase = 'landed';
    s.landingResult = classifyLanding(hit.impactSpeed, Math.hypot(s.vx, s.vz));
    s.vx = s.vz = 0;
    s.burnerOn = false;
    s.returning = false;
    s.elapsed += dt;
    s.maxAltitude = Math.max(s.maxAltitude, s.y);
    return s;
  }

  // Flight timer, maximum altitude and phase transitions.
  if (isAirPhase(s.phase)) s.elapsed += dt;
  s.maxAltitude = Math.max(s.maxAltitude, s.y);

  const newAgl = s.y - s.groundHeight;
  switch (s.phase) {
    case 'takingOff':
      if (newAgl >= PHYSICS.takeoffAgl) s.phase = 'flying';
      break;
    case 'flying':
      if (newAgl < 12 && s.vy < -0.3) s.phase = 'landing';
      else if (s.vy < -0.8) s.phase = 'descending';
      break;
    case 'descending':
      if (newAgl < 12 && s.vy < -0.3) s.phase = 'landing';
      else if (s.vy > -0.2) s.phase = 'flying';
      break;
    case 'landing':
      if (newAgl >= 15 || s.vy > 0.5) s.phase = s.vy < -0.8 ? 'descending' : 'flying';
      break;
    default:
      break;
  }
  return s;
}
