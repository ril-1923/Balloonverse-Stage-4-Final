import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { placeScatter, type ScatterSpec } from '../../simulation/scatter';
import type { WorldDefinition } from '../../simulation/worldDefinitions';
import { GEOMETRY_BUILDERS } from './scatterGeometry';

interface Props {
  world: WorldDefinition;
  spec: ScatterSpec;
  /** Multiplies the prop count (used for lighter scenes). */
  countScale?: number;
}

/** Every prop of one kind is drawn with a single InstancedMesh (one draw call). */
export function Scatter({ world, spec, countScale = 1 }: Props) {
  const geometry = useMemo(() => GEOMETRY_BUILDERS[spec.kind](), [spec.kind]);
  const placements = useMemo(() => placeScatter(world, spec, countScale), [world, spec, countScale]);

  const mesh = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 1,
      color: spec.color ?? '#ffffff',
    });
    const m = new THREE.InstancedMesh(geometry, material, Math.max(1, placements.length));
    const mat = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const c = new THREE.Color();
    placements.forEach((t, i) => {
      q.setFromEuler(e.set(0, t.rotation, 0));
      const tall = spec.kind === 'pine' ? 1.1 : 1;
      mat.compose(p.set(t.x, t.y, t.z), q, s.set(t.scale, t.scale * tall, t.scale));
      m.setMatrixAt(i, mat);
      m.setColorAt(i, c.setScalar(t.tint));
    });
    m.count = placements.length;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.frustumCulled = false;
    return m;
  }, [geometry, placements, spec.color, spec.kind]);

  useEffect(
    () => () => {
      (mesh.material as THREE.Material).dispose();
      mesh.dispose();
    },
    [mesh],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  return <primitive object={mesh} />;
}
