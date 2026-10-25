import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { createRng } from '../../utils/random';

interface Props {
  color: string;
  count: number;
  radius: number;
  minH: number;
  maxH: number;
  seed: number;
}

/** A ring of distant instanced peaks that hides the edge of the terrain mesh. */
export function MountainRange({ color, count, radius, minH, maxH, seed }: Props) {
  const geometry = useMemo(() => new THREE.ConeGeometry(1, 1, 7, 1), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 }), [color]);
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geometry, material, count);
    const rng = createRng(seed);
    const mat = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rng() * 0.12;
      const r = radius + rng() * 160;
      const h = minH + rng() * (maxH - minH);
      const w = 170 + rng() * 150;
      mat.compose(
        new THREE.Vector3(Math.sin(a) * r, h / 2 - 40, Math.cos(a) * r),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rng() * 6, 0)),
        new THREE.Vector3(w, h, w),
      );
      m.setMatrixAt(i, mat);
    }
    m.instanceMatrix.needsUpdate = true;
    m.frustumCulled = false;
    return m;
  }, [geometry, material, seed, radius, count, minH, maxH]);

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
