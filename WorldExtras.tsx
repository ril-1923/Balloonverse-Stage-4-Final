import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { placeScatter } from '../../simulation/scatter';
import { countryCrossing, type WorldDefinition } from '../../simulation/worldDefinitions';
import { createRng } from '../../utils/random';
import { atmosphereState } from './atmosphereState';

/** Old wooden road bridge where the countryside road crosses the river. */
function Bridge({ world }: { world: WorldDefinition }) {
  const b = useMemo(() => {
    const c = countryCrossing();
    const dir = new THREE.Vector3(Math.cos(c.angle), 0, Math.sin(c.angle));
    const a = world.heightAt(c.x - dir.x * 36, c.z - dir.z * 36);
    const e = world.heightAt(c.x + dir.x * 36, c.z + dir.z * 36);
    const deck = Math.max(a, e, (world.river?.level ?? 12) + 3) + 0.8;
    return { ...c, deck };
  }, [world]);
  const posts = [-27, -13.5, 0, 13.5, 27];
  return (
    <group position={[b.x, 0, b.z]} rotation={[0, -b.angle, 0]}>
      <mesh position={[0, b.deck, 0]}>
        <boxGeometry args={[78, 0.8, 7.5]} />
        <meshStandardMaterial color="#8a6a45" roughness={0.95} />
      </mesh>
      {[-3.6, 3.6].map((z) => (
        <mesh key={z} position={[0, b.deck + 1.1, z]}>
          <boxGeometry args={[78, 0.25, 0.25]} />
          <meshStandardMaterial color="#6e5233" roughness={0.95} />
        </mesh>
      ))}
      {posts.map((x) =>
        [-3.3, 3.3].map((z) => (
          <mesh key={`${x}${z}`} position={[x, (b.deck + 6) / 2 + 1, z]}>
            <boxGeometry args={[0.5, b.deck - 6, 0.5]} />
            <meshStandardMaterial color="#6e5233" roughness={0.95} />
          </mesh>
        )),
      )}
    </group>
  );
}

/** Distant city glow: warm points clustered on flat ground, visible when it is dark. */
function CityLights({ world }: { world: WorldDefinition }) {
  const { geometry, material } = useMemo(() => {
    const spots = placeScatter(world, {
      kind: 'house', seed: 99, count: 1400, minY: 10, maxY: 90, maxSlope: 0.3, scale: [1, 1], launchClear: 300,
      cluster: { centres: 4, radius: 60, minDistFromLaunch: 380 },
    });
    const rng = createRng(5);
    const pos = new Float32Array(spots.length * 3);
    const col = new Float32Array(spots.length * 3);
    const c = new THREE.Color();
    spots.forEach((p, i) => {
      pos.set([p.x, p.y + 3 + rng() * 4, p.z], i * 3);
      c.set(rng() < 0.7 ? '#ffd9a0' : rng() < 0.5 ? '#fff6e0' : '#ffb868');
      col.set([c.r, c.g, c.b], i * 3);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({ size: 6, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    return { geometry: g, material: m };
  }, [world]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  useFrame(() => {
    material.opacity = Math.min(1, atmosphereState.night * 1.1) * 0.95;
  });
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

export function WorldExtras({ world }: { world: WorldDefinition }) {
  if (world.id === 'green-countryside') return <Bridge world={world} />;
  if (world.id === 'night-sky') return <CityLights world={world} />;
  return null;
}

