export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}

export function formatDistance(metres: number): string {
  return metres >= 1000 ? `${(metres / 1000).toFixed(2)} km` : `${Math.round(metres)} m`;
}

const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
/** Radians (0 = north, clockwise) to compass label. */
export function compassLabel(rad: number): string {
  const deg = ((rad * 180) / Math.PI + 360) % 360;
  return POINTS[Math.round(deg / 45) % 8];
}

export function degrees(rad: number): number {
  return Math.round((((rad * 180) / Math.PI) % 360 + 360) % 360);
}
