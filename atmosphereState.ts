import * as THREE from 'three';
import type { AtmosphereTarget } from '../../simulation/atmosphere';
import { clamp, smoothstep } from '../../utils/random';

/**
 * Live, smoothly-blended atmosphere. SkySystem writes it every frame; clouds,
 * water, stars, city lights and balloon lanterns read it (no React re-renders).
 */
export const atmosphereState = {
  sunElevation: 38,
  sunAzimuth: 135,
  turbidity: 3,
  rayleigh: 1.3,
  mie: 0.005,
  mieG: 0.85,
  sunColor: new THREE.Color('#fff1d6'),
  sunIntensity: 2.4,
  moonIntensity: 0,
  hemiSky: new THREE.Color('#bcd9ff'),
  hemiGround: new THREE.Color('#6d8a4a'),
  hemiIntensity: 1,
  fogColor: new THREE.Color('#b9d6ee'),
  fogNear: 220,
  fogFar: 1500,
  cloudColor: new THREE.Color('#ffffff'),
  cloudOpacity: 0.93,
  cloudCoverage: 0.3,
  cloudDark: 1,
  cloudSpeed: 1,
  stars: 0,
  night: 0,
  exposure: 1,
  /** 0 at night .. 1 in full daylight. */
  dayLight: 1,
};

const scratch = new THREE.Color();
const num = (a: number, b: number, k: number) => a + (b - a) * k;

/** Moves the live state toward the target. k = 1 snaps instantly. */
export function stepAtmosphere(target: AtmosphereTarget, k: number): void {
  const s = atmosphereState;
  s.sunElevation = num(s.sunElevation, target.sunElevation, k);
  s.sunAzimuth = num(s.sunAzimuth, target.sunAzimuth, k);
  s.turbidity = num(s.turbidity, target.turbidity, k);
  s.rayleigh = num(s.rayleigh, target.rayleigh, k);
  s.mie = num(s.mie, target.mie, k);
  s.mieG = num(s.mieG, target.mieG, k);
  s.sunColor.lerp(scratch.set(target.sunColor), k);
  s.sunIntensity = num(s.sunIntensity, target.sunIntensity, k);
  s.moonIntensity = num(s.moonIntensity, target.moonIntensity, k);
  s.hemiSky.lerp(scratch.set(target.hemiSky), k);
  s.hemiGround.lerp(scratch.set(target.hemiGround), k);
  s.hemiIntensity = num(s.hemiIntensity, target.hemiIntensity, k);
  s.fogColor.lerp(scratch.set(target.fogColor), k);
  s.fogNear = num(s.fogNear, target.fogNear, k);
  s.fogFar = num(s.fogFar, target.fogFar, k);
  s.cloudColor.lerp(scratch.set(target.cloudColor), k);
  s.cloudOpacity = num(s.cloudOpacity, target.cloudOpacity, k);
  s.cloudCoverage = num(s.cloudCoverage, target.cloudCoverage, k);
  s.cloudDark = num(s.cloudDark, target.cloudDark, k);
  s.cloudSpeed = num(s.cloudSpeed, target.cloudSpeed, k);
  s.stars = num(s.stars, target.stars, k);
  s.night = num(s.night, target.night, k);
  s.exposure = num(s.exposure, target.exposure, k);
  s.dayLight = clamp(smoothstep(-8, 22, s.sunElevation), 0, 1);
}

export function directionFromAngles(elevationDeg: number, azimuthDeg: number, out: THREE.Vector3): THREE.Vector3 {
  const e = THREE.MathUtils.degToRad(elevationDeg);
  const a = THREE.MathUtils.degToRad(azimuthDeg);
  return out.set(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a));
}
