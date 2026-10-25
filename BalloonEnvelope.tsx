import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { MATERIAL_PROPS } from '../../simulation/balloonPresets';
import type { BalloonConfig } from '../../types/balloon';

export const ENVELOPE_HEIGHT = 20;
export const ENVELOPE_RADIUS = 8.5;
const GORES = 16;

function profile(): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  const n = 32;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    let r = ENVELOPE_RADIUS * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.78)), 0.8);
    const mouth = 1.8 * (1 - Math.min(1, u / 0.1));
    r = Math.max(r, mouth, i === n ? 0 : 0.02);
    pts.push(new THREE.Vector2(r, u * ENVELOPE_HEIGHT));
  }
  return pts;
}

/** Colour for a triangle given its gore index (0..GORES-1) and height fraction (0..1). */
export function panelColor(config: BalloonConfig, gore: number, u: number): THREE.Color {
  const c = config.colors;
  const pick = (i: number) => new THREE.Color(c[((i % c.length) + c.length) % c.length]);
  const band = Math.floor(u * 8);
  if (u < 0.06) return config.pattern === 'rainbow' ? pick(2) : pick(1); // skirt trim
  switch (config.pattern) {
    case 'solid':
      return pick(0);
    case 'horizontal':
      return pick(band);
    case 'alternating':
      return pick(gore % 2 === 0 ? 0 : 1);
    case 'checkerboard':
      return pick((gore + band) % 2 === 0 ? 0 : 1);
    case 'rainbow':
      return new THREE.Color().setHSL(gore / GORES, 0.85, 0.55);
    case 'vertical':
    default:
      return pick(gore);
  }
}

export function buildEnvelopeGeometry(config: BalloonConfig): THREE.BufferGeometry {
  const lathe = new THREE.LatheGeometry(profile(), GORES * 2);
  const geo = lathe.toNonIndexed();
  lathe.dispose();
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let k = 0; k < 3; k++) {
      cx += pos.getX(i + k);
      cy += pos.getY(i + k);
      cz += pos.getZ(i + k);
    }
    const angle = Math.atan2(cx, cz) + Math.PI; // 0..2π
    const gore = Math.floor((angle / (Math.PI * 2)) * GORES) % GORES;
    tmp.copy(panelColor(config, gore, cy / 3 / ENVELOPE_HEIGHT));
    for (let k = 0; k < 3; k++) {
      colors[(i + k) * 3] = tmp.r;
      colors[(i + k) * 3 + 1] = tmp.g;
      colors[(i + k) * 3 + 2] = tmp.b;
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

interface Props {
  config: BalloonConfig;
}

/** Hot-air balloon envelope: lathe-shaped body with coloured fabric gores. Origin is the skirt opening. */
export function BalloonEnvelope({ config }: Props) {
  const geometry = useMemo(() => buildEnvelopeGeometry(config), [config]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors {...MATERIAL_PROPS[config.material]} side={THREE.DoubleSide} />
    </mesh>
  );
}
