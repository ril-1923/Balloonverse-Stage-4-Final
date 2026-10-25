import { useMemo } from 'react';
import type { WorldId } from '../../types/environment';
import { createRng } from '../../utils/random';

interface Layer { color: string; base: number; amp: number; freq: number; phase: number }
interface Preview {
  sky: [string, string];
  celestial?: { cx: number; cy: number; r: number; color: string; halo: string };
  stars?: boolean;
  layers: Layer[];
  motif: 'pines' | 'farms' | 'dunes' | 'lake' | 'dusk' | 'city';
}

const W = 320;
const H = 180;

const PREVIEWS: Record<WorldId, Preview> = {
  'mountain-valley': {
    sky: ['#7fc0ef', '#d9eefb'], celestial: { cx: 240, cy: 44, r: 15, color: '#fff6d8', halo: '#fff6d8' },
    layers: [
      { color: '#9db4cc', base: 78, amp: 34, freq: 0.034, phase: 0.6 },
      { color: '#6f8caa', base: 98, amp: 28, freq: 0.047, phase: 2.1 },
      { color: '#4d8a47', base: 128, amp: 12, freq: 0.03, phase: 4 },
    ],
    motif: 'pines',
  },
  'green-countryside': {
    sky: ['#8fcbf2', '#e2f2fb'], celestial: { cx: 70, cy: 42, r: 14, color: '#fff3c4', halo: '#fff3c4' },
    layers: [
      { color: '#9ec7a0', base: 100, amp: 10, freq: 0.025, phase: 1 },
      { color: '#79b457', base: 118, amp: 9, freq: 0.03, phase: 3 },
    ],
    motif: 'farms',
  },
  'desert-adventure': {
    sky: ['#f6c98d', '#fbe9c8'], celestial: { cx: 250, cy: 40, r: 17, color: '#fffbe6', halo: '#ffe9a8' },
    layers: [
      { color: '#c68b5b', base: 100, amp: 6, freq: 0.02, phase: 0.2 },
      { color: '#e0b574', base: 118, amp: 14, freq: 0.028, phase: 1.5 },
      { color: '#e9c88b', base: 140, amp: 12, freq: 0.022, phase: 3.3 },
    ],
    motif: 'dunes',
  },
  'lake-paradise': {
    sky: ['#f4c9a8', '#dfeaf0'], celestial: { cx: 90, cy: 76, r: 13, color: '#fff0d0', halo: '#ffd8b0' },
    layers: [
      { color: '#8da6bf', base: 74, amp: 30, freq: 0.036, phase: 2.3 },
      { color: '#5f8a63', base: 94, amp: 10, freq: 0.04, phase: 0.4 },
    ],
    motif: 'lake',
  },
  'sunset-horizon': {
    sky: ['#5b3a6e', '#ff9a62'], celestial: { cx: 200, cy: 100, r: 30, color: '#ffe3a0', halo: '#ff9a62' },
    layers: [
      { color: '#4a3358', base: 96, amp: 20, freq: 0.03, phase: 0.8 },
      { color: '#33223f', base: 122, amp: 12, freq: 0.045, phase: 2.8 },
      { color: '#1f1428', base: 148, amp: 9, freq: 0.03, phase: 4.2 },
    ],
    motif: 'dusk',
  },
  'night-sky': {
    sky: ['#050a1c', '#1b2d5c'], celestial: { cx: 252, cy: 40, r: 14, color: '#f6f3e6', halo: '#9bb8ff' }, stars: true,
    layers: [
      { color: '#16233f', base: 104, amp: 20, freq: 0.03, phase: 1.1 },
      { color: '#0d1630', base: 132, amp: 14, freq: 0.04, phase: 3.2 },
    ],
    motif: 'city',
  },
};

function ridge(l: Layer): string {
  const pts: string[] = [`M0 ${H}`];
  for (let x = 0; x <= W; x += 8) {
    const y = l.base + Math.sin(x * l.freq + l.phase) * l.amp + Math.sin(x * l.freq * 2.3 + l.phase * 1.7) * l.amp * 0.4;
    pts.push(`L${x} ${y.toFixed(1)}`);
  }
  pts.push(`L${W} ${H}Z`);
  return pts.join(' ');
}

/** Hand-built SVG scene for each world card. Purely decorative. */
export function WorldPreview({ id }: { id: WorldId }) {
  const p = PREVIEWS[id];
  const gid = `wp-${id}`;
  const extras = useMemo(() => {
    const rng = createRng(id.length * 131 + id.charCodeAt(0));
    return {
      stars: Array.from({ length: 46 }, () => ({ x: rng() * W, y: rng() * 90, r: 0.4 + rng() * 0.9 })),
      pines: Array.from({ length: 26 }, () => ({ x: rng() * W, y: 128 + rng() * 40, s: 0.7 + rng() * 0.8 })),
      lights: Array.from({ length: 60 }, () => ({ x: 20 + rng() * 120 + (rng() < 0.4 ? 140 : 0), y: 112 + rng() * 22 })),
      fields: Array.from({ length: 9 }, (_, i) => ({ x: 10 + i * 36, w: 28 + rng() * 14, c: ['#b9c66a', '#7fb04a', '#d2c26b', '#8c6d3f', '#a2b955'][Math.floor(rng() * 5)] })),
    };
  }, [id]);

  return (
    <svg className="world-preview" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${gid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="1" stopColor={p.sky[1]} />
        </linearGradient>
        {p.celestial && (
          <radialGradient id={`${gid}-halo`}>
            <stop offset="0" stopColor={p.celestial.halo} stopOpacity="0.8" />
            <stop offset="1" stopColor={p.celestial.halo} stopOpacity="0" />
          </radialGradient>
        )}
      </defs>
      <rect width={W} height={H} fill={`url(#${gid}-sky)`} />
      {p.stars && extras.stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity="0.85" />)}
      {p.celestial && (
        <>
          <circle cx={p.celestial.cx} cy={p.celestial.cy} r={p.celestial.r * 3.2} fill={`url(#${gid}-halo)`} />
          <circle cx={p.celestial.cx} cy={p.celestial.cy} r={p.celestial.r} fill={p.celestial.color} />
        </>
      )}
      {p.motif === 'dunes' && <path d="M205 120 L215 78 H262 L274 120Z" fill="#a8603a" />}
      {p.layers.map((l, i) => <path key={i} d={ridge(l)} fill={l.color} />)}
      {p.motif === 'pines' && (
        <>
          <path d={`M150 ${H} C160 150 190 140 210 120 C190 150 175 160 190 ${H}Z`} fill="#3d9fd6" opacity="0.85" />
          {extras.pines.map((t, i) => (
            <path key={i} d={`M${t.x} ${t.y - 16 * t.s} l${6 * t.s} ${16 * t.s} h${-12 * t.s}Z`} fill={i % 2 ? '#2f6b3c' : '#3a7d44'} />
          ))}
        </>
      )}
      {p.motif === 'farms' && (
        <>
          {extras.fields.map((f, i) => (
            <path key={i} d={`M${f.x} ${H} l${6} ${-34 - (i % 3) * 5} h${f.w - 6} l${-8} ${34 + (i % 3) * 5}Z`} fill={f.c} opacity="0.95" />
          ))}
          <path d="M-5 150 C80 132 160 160 330 138" stroke="#b59a6a" strokeWidth="5" fill="none" />
          <path d="M210 100 C200 130 230 150 215 182" stroke="#3d9fd6" strokeWidth="7" fill="none" />
          {[96, 108, 120, 132].map((x, i) => (
            <g key={x}>
              <rect x={x} y={124 + (i % 2) * 4} width="9" height="7" fill="#f1e6cf" />
              <path d={`M${x - 1} ${124 + (i % 2) * 4} l5.5 -5 l5.5 5Z`} fill="#b5482f" />
            </g>
          ))}
        </>
      )}
      {p.motif === 'lake' && (
        <>
          <rect y="112" width={W} height="70" fill="#3b8fb8" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={70 + i * 6} y={118 + i * 10} width={40 - i * 5} height="2" fill="#ffe0bd" opacity={0.7 - i * 0.1} />
          ))}
          {extras.pines.slice(0, 12).map((_t, i) => (
            <path key={i} d={`M${(i * 29) % W} ${112} l${5} ${-14} l${5} 14Z`} fill="#2f6b3c" />
          ))}
        </>
      )}
      {p.motif === 'dusk' && <rect y="150" width={W} height="30" fill="#140c1c" opacity="0.7" />}
      {p.motif === 'city' && extras.lights.map((l, i) => <circle key={i} cx={l.x} cy={l.y} r="0.9" fill="#ffd9a0" />)}
    </svg>
  );
}
