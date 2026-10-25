import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { runtime, windAt } from '../../simulation/flightController';
import { createRng } from '../../utils/random';
import { atmosphereState } from './atmosphereState';

interface Puff { ox: number; oy: number; oz: number; s: number }
interface Cloud { x: number; y: number; z: number; puffs: Puff[] }

const WRAP = 900;

function makeClouds(count: number, seed: number, minY: number, maxY: number): Cloud[] {
  const rng = createRng(seed);
  const clouds: Cloud[] = [];
  for (let i = 0; i < count; i++) {
    const size = 0.7 + rng() * 1.1;
    const puffs: Puff[] = [];
    const n = 5 + Math.floor(rng() * 4);
    for (let p = 0; p < n; p++) {
      puffs.push({ ox: (rng() - 0.5) * 70 * size, oy: (rng() - 0.3) * 8 * size, oz: (rng() - 0.5) * 30 * size, s: (12 + rng() * 14) * size });
    }
    clouds.push({ x: (rng() * 2 - 1) * WRAP, y: minY + rng() * (maxY - minY), z: (rng() * 2 - 1) * WRAP, puffs });
  }
  return clouds;
}

interface Props {
  count?: number;
  seed?: number;
  minY?: number;
  maxY?: number;
  /** Follow the simulated wind. When false, `drift` (m/s) is used. */
  followWind?: boolean;
  drift?: [number, number];
}

const wrap = (v: number) => ((((v + WRAP) % (2 * WRAP)) + 2 * WRAP) % (2 * WRAP)) - WRAP;

/**
 * Instanced cloud banks. Cover, colour, darkness and speed come from the live atmosphere (weather and
 * time of day); drift direction follows the simulated wind.
 */
export function Clouds({ count = 22, seed = 12, minY = 160, maxY = 340, followWind = true, drift = [2.4, -1.4] }: Props) {
  const clouds = useMemo(() => makeClouds(count, seed, minY, maxY), [count, seed, minY, maxY]);
  const cumulative = useMemo(() => {
    const out = [0];
    clouds.forEach((c) => out.push(out[out.length - 1] + c.puffs.length));
    return out;
  }, [clouds]);
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#dfeaf7', emissiveIntensity: 0.35, roughness: 1, flatShading: true, transparent: true, opacity: 0.93, depthWrite: false }),
    [],
  );
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geometry, material, cumulative[cumulative.length - 1]);
    m.frustumCulled = false;
    return m;
  }, [geometry, material, cumulative]);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), off: new THREE.Vector2() }), []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const a = atmosphereState;
    let vx = drift[0];
    let vz = drift[1];
    if (followWind) {
      const w = windAt(runtime.world, runtime.time);
      const speed = 1.2 + w.strength * 0.9;
      vx = Math.sin(w.direction) * speed;
      vz = -Math.cos(w.direction) * speed;
    }
    tmp.off.x += vx * a.cloudSpeed * dt;
    tmp.off.y += vz * a.cloudSpeed * dt;

    const active = Math.round(a.cloudCoverage * clouds.length);
    mesh.count = cumulative[active];
    let idx = 0;
    for (let i = 0; i < active; i++) {
      const c = clouds[i];
      const cx = wrap(c.x + tmp.off.x);
      const cz = wrap(c.z + tmp.off.y);
      for (const p of c.puffs) {
        tmp.p.set(cx + p.ox, c.y + p.oy, cz + p.oz);
        tmp.s.set(p.s * 1.5, p.s * 0.7, p.s);
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        mesh.setMatrixAt(idx++, tmp.m);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;

    material.color.copy(a.cloudColor).multiplyScalar(a.cloudDark);
    material.emissive.copy(a.cloudColor).multiplyScalar(0.28 * a.cloudDark);
    material.opacity = a.cloudOpacity;
  });

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
    [geometry, material, mesh],
  );
  return <primitive object={mesh} />;
}
