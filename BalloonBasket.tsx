import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { BasketStyle } from '../../types/balloon';

const STYLE: Record<BasketStyle, { tint: string; rim: string; metal: boolean }> = {
  lightWicker: { tint: '#e0bd82', rim: '#b98d4e', metal: false },
  darkWicker: { tint: '#7a5532', rim: '#4a3320', metal: false },
  premium: { tint: '#a06a38', rim: '#c9a24a', metal: true },
};

function makeWeaveTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#d8d8d8';
    ctx.fillRect(0, 0, size, size);
    const cell = size / 8;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const horizontal = (x + y) % 2 === 0;
        ctx.fillStyle = horizontal ? '#ffffff' : '#bdbdbd';
        if (horizontal) ctx.fillRect(x * cell + 1, y * cell + 3, cell - 2, cell - 6);
        else ctx.fillRect(x * cell + 3, y * cell + 1, cell - 6, cell - 2);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const BASKET = { half: 0.85, height: 1.05, postTop: 3.1 } as const;
const POSTS: [number, number][] = [
  [BASKET.half - 0.05, BASKET.half - 0.05],
  [-(BASKET.half - 0.05), BASKET.half - 0.05],
  [BASKET.half - 0.05, -(BASKET.half - 0.05)],
  [-(BASKET.half - 0.05), -(BASKET.half - 0.05)],
];

interface Props {
  style: BasketStyle;
}

/** Woven-look basket with corner posts. Origin is the basket floor centre. */
export function BalloonBasket({ style }: Props) {
  const weave = useMemo(makeWeaveTexture, []);
  useEffect(() => () => weave.dispose(), [weave]);
  const s = STYLE[style];
  const h = BASKET.half;
  const wall = 0.09;

  const wallMap = useMemo(() => {
    const t = weave.clone();
    t.repeat.set(4, 2);
    t.needsUpdate = true;
    return t;
  }, [weave]);
  useEffect(() => () => wallMap.dispose(), [wallMap]);

  return (
    <group>
      {/* floor */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[h * 2, 0.1, h * 2]} />
        <meshStandardMaterial color={s.tint} map={wallMap} roughness={0.95} />
      </mesh>
      {/* walls */}
      {[
        [0, h, h * 2, wall],
        [0, -h, h * 2, wall],
        [h, 0, wall, h * 2],
        [-h, 0, wall, h * 2],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, BASKET.height / 2, z]}>
          <boxGeometry args={[w, BASKET.height, d]} />
          <meshStandardMaterial color={s.tint} map={wallMap} roughness={0.95} />
        </mesh>
      ))}
      {/* rim */}
      {[
        [0, h, h * 2 + 0.16, 0.14],
        [0, -h, h * 2 + 0.16, 0.14],
        [h, 0, 0.14, h * 2 + 0.16],
        [-h, 0, 0.14, h * 2 + 0.16],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, BASKET.height + 0.04, z]}>
          <boxGeometry args={[w, 0.1, d]} />
          <meshStandardMaterial
            color={s.rim}
            roughness={s.metal ? 0.35 : 0.9}
            metalness={s.metal ? 0.6 : 0}
          />
        </mesh>
      ))}
      {/* corner posts rising to the burner frame */}
      {POSTS.map(([x, z], i) => (
        <mesh key={i} position={[x, BASKET.postTop / 2, z]}>
          <cylinderGeometry args={[0.04, 0.04, BASKET.postTop, 8]} />
          <meshStandardMaterial color="#8c929a" roughness={0.4} metalness={0.7} />
        </mesh>
      ))}
      {/* fuel tanks */}
      {[-0.4, 0.4].map((x) => (
        <mesh key={x} position={[x, 0.55, -0.35]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.9, 14]} />
          <meshStandardMaterial color="#c9ced6" roughness={0.35} metalness={0.8} />
        </mesh>
      ))}
    </group>
  );
}
