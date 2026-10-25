import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { WorldDefinition } from '../../simulation/worldDefinitions';
import { getVisuals, patchNoise } from './worldVisuals';

export function buildTerrainGeometry(world: WorldDefinition, segments: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(world.size, world.size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) pos.setY(i, world.heightAt(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();

  const normals = geo.getAttribute('normal');
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const { terrainColor } = getVisuals(world.id);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    terrainColor(
      { x, y: pos.getY(i), z, steep: 1 - normals.getY(i), patch: patchNoise(x, z), r: Math.hypot(x, z) },
      c,
    );
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

interface Props {
  world: WorldDefinition;
  segments?: number;
}

/** Low-poly vertex-coloured terrain generated from the world's height function. */
export function Terrain({ world, segments = 160 }: Props) {
  const geometry = useMemo(() => buildTerrainGeometry(world, segments), [world, segments]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors flatShading roughness={1} metalness={0} />
    </mesh>
  );
}
