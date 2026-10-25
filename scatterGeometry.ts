import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ScatterKind } from '../../simulation/scatter';

function colored(geo: THREE.BufferGeometry, hex: string): THREE.BufferGeometry {
  const col = new THREE.Color(hex);
  const n = geo.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = col.r;
    arr[i * 3 + 1] = col.g;
    arr[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/** Merges vertex-coloured parts into one geometry (a single draw call per instanced prop). */
function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = parts.map((p) => {
    const g = p.index ? p.toNonIndexed() : p;
    if (g !== p) p.dispose();
    return g;
  });
  const merged = mergeGeometries(flat);
  flat.forEach((g) => g.dispose());
  if (!merged) throw new Error('Failed to merge prop geometry');
  return merged;
}

export function buildPineGeometry(): THREE.BufferGeometry {
  const trunk = colored(new THREE.CylinderGeometry(0.35, 0.5, 2.4, 6), '#6b4a2f').translate(0, 1.2, 0);
  const c1 = colored(new THREE.ConeGeometry(2.8, 5, 7), '#2f6b3c').translate(0, 4.4, 0);
  const c2 = colored(new THREE.ConeGeometry(2.2, 4.4, 7), '#3a7d44').translate(0, 7, 0);
  const c3 = colored(new THREE.ConeGeometry(1.4, 3.6, 7), '#468a4c').translate(0, 9.3, 0);
  return merge([trunk, c1, c2, c3]);
}

export function buildBroadleafGeometry(): THREE.BufferGeometry {
  const trunk = colored(new THREE.CylinderGeometry(0.4, 0.55, 3, 6), '#6b4a2f').translate(0, 1.5, 0);
  const a = colored(new THREE.IcosahedronGeometry(3.4, 0), '#4f9140').translate(0, 5.6, 0);
  const b = colored(new THREE.IcosahedronGeometry(2.3, 0), '#62a44c').translate(1.6, 7, 0.8);
  const c = colored(new THREE.IcosahedronGeometry(2.1, 0), '#468a3a').translate(-1.5, 6.6, -0.9);
  return merge([trunk, a, b, c]);
}

export function buildCactusGeometry(): THREE.BufferGeometry {
  const green = '#4e8a4a';
  const main = colored(new THREE.CylinderGeometry(0.55, 0.65, 5.4, 7), green).translate(0, 2.7, 0);
  const cap = colored(new THREE.SphereGeometry(0.55, 7, 4), green).translate(0, 5.4, 0);
  const stub1 = colored(new THREE.BoxGeometry(1.3, 0.55, 0.55), green).translate(0.9, 3, 0);
  const arm1 = colored(new THREE.CylinderGeometry(0.34, 0.38, 2.2, 6), green).translate(1.5, 4.0, 0);
  const stub2 = colored(new THREE.BoxGeometry(1.1, 0.5, 0.5), green).translate(-0.8, 3.9, 0);
  const arm2 = colored(new THREE.CylinderGeometry(0.3, 0.34, 1.8, 6), green).translate(-1.3, 4.7, 0);
  return merge([main, cap, stub1, arm1, stub2, arm2]);
}

export function buildRockGeometry(): THREE.BufferGeometry {
  const a = colored(new THREE.DodecahedronGeometry(2.2, 0), '#ffffff');
  a.scale(1, 0.72, 0.9);
  a.translate(0, 0.9, 0);
  const b = colored(new THREE.DodecahedronGeometry(1.2, 0), '#d8d8d8');
  b.scale(1, 0.8, 1);
  b.translate(2.1, 0.5, 0.8);
  return merge([a, b]);
}

function roof(w: number, d: number, h: number, hex: string): THREE.BufferGeometry {
  const g = colored(new THREE.ConeGeometry(1, h, 4), hex);
  g.rotateY(Math.PI / 4);
  g.scale((w / 2) * Math.SQRT2 * 0.94, 1, (d / 2) * Math.SQRT2 * 0.94);
  return g;
}

export function buildHouseGeometry(): THREE.BufferGeometry {
  const walls = colored(new THREE.BoxGeometry(6, 4, 8), '#f1e6cf').translate(0, 2, 0);
  const top = roof(7, 9, 3.2, '#b5482f').translate(0, 4 + 1.6, 0);
  const door = colored(new THREE.BoxGeometry(1.2, 2.2, 0.2), '#5b3a22').translate(0, 1.1, 4.05);
  return merge([walls, top, door]);
}

export function buildBarnGeometry(): THREE.BufferGeometry {
  const walls = colored(new THREE.BoxGeometry(8, 5, 12), '#a63a2c').translate(0, 2.5, 0);
  const top = roof(9, 13, 3.6, '#4d4540').translate(0, 5 + 1.8, 0);
  const silo = colored(new THREE.CylinderGeometry(1.8, 1.8, 9, 10), '#cfd3d6').translate(7, 4.5, 0);
  const cap = colored(new THREE.ConeGeometry(2, 1.6, 10), '#8b929a').translate(7, 9.8, 0);
  return merge([walls, top, silo, cap]);
}

export const GEOMETRY_BUILDERS: Record<ScatterKind, () => THREE.BufferGeometry> = {
  pine: buildPineGeometry,
  broadleaf: buildBroadleafGeometry,
  cactus: buildCactusGeometry,
  rock: buildRockGeometry,
  house: buildHouseGeometry,
  barn: buildBarnGeometry,
};
