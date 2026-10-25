import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { WorldDefinition } from '../../simulation/worldDefinitions';
import { atmosphereState } from './atmosphereState';

export function buildRiverGeometry(world: WorldDefinition): THREE.BufferGeometry {
  const river = world.river;
  const positions: number[] = [];
  const indices: number[] = [];
  if (river) {
    const step = 16;
    const limit = world.size / 2 - 20;
    let row = 0;
    for (let z = -limit; z <= limit; z += step) {
      const cx = river.centerX(z);
      if (Math.hypot(cx, z) > river.maxRadius) continue;
      positions.push(cx - river.halfWidth, river.level, z, cx + river.halfWidth, river.level, z);
      if (row > 0) {
        const a = (row - 1) * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
      row++;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** River ribbon and/or lake disc, tinted by the sky so water follows the time of day. */
export function Water({ world }: { world: WorldDefinition }) {
  const river = useMemo(() => (world.river ? buildRiverGeometry(world) : null), [world]);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#3d9fd6', roughness: 0.18, metalness: 0.2, transparent: true, opacity: 0.88, side: THREE.DoubleSide }),
    [],
  );
  useEffect(
    () => () => {
      river?.dispose();
      material.dispose();
    },
    [river, material],
  );

  const tint = useMemo(() => new THREE.Color(), []);
  const deep = useMemo(() => new THREE.Color(world.lake ? '#2a86b8' : '#3d9fd6'), [world]);
  useFrame(() => {
    // Blend deep-water blue with the sky colour so dusk and night water darkens and warms.
    tint.copy(deep).multiplyScalar(0.35 + 0.65 * atmosphereState.dayLight).lerp(atmosphereState.fogColor, 0.28);
    material.color.copy(tint);
    material.emissive.copy(atmosphereState.fogColor).multiplyScalar(0.12);
  });

  return (
    <>
      {river && <mesh geometry={river} material={material} />}
      {world.lake && (
        <mesh position={[world.lake.cx, world.lake.level, world.lake.cz]} rotation={[-Math.PI / 2, 0, 0]} material={material}>
          <circleGeometry args={[world.lake.discRadius, 64]} />
        </mesh>
      )}
    </>
  );
}
