import { clamp } from '../utils/random';

/** Drag-to-look offsets applied on top of each camera mode. */
export interface LookOffset {
  yaw: number;
  pitch: number;
}

export const LOOK_LIMITS = { minPitch: -0.45, maxPitch: 0.75 } as const;
const RADIANS_PER_PIXEL = 0.0055;

/** Applies a pointer drag of (dx, dy) pixels. `sensitivity` is the user setting (1 = default). */
export function dragLook(look: LookOffset, dx: number, dy: number, sensitivity: number): LookOffset {
  const k = RADIANS_PER_PIXEL * sensitivity;
  return {
    yaw: look.yaw - dx * k,
    pitch: clamp(look.pitch + dy * k, LOOK_LIMITS.minPitch, LOOK_LIMITS.maxPitch),
  };
}

/** After the pointer is released the view eases back to the normal camera position. */
export function easeLookBack(look: LookOffset, dt: number, rate = 1.6): LookOffset {
  const k = Math.exp(-dt * rate);
  const yaw = look.yaw * k;
  const pitch = look.pitch * k;
  return { yaw: Math.abs(yaw) < 1e-4 ? 0 : yaw, pitch: Math.abs(pitch) < 1e-4 ? 0 : pitch };
}
