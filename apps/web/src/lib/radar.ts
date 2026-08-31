export type RadarPoint = {
  x: number;
  y: number;
};

export function radarAxisAngle(index: number, totalAxes: number): number {
  if (totalAxes <= 0) return 0;
  return -Math.PI / 2 + (index * 2 * Math.PI) / totalAxes;
}

export function radarPoint(
  cx: number,
  cy: number,
  radius: number,
  valuePercent: number,
  index: number,
  totalAxes: number,
): RadarPoint {
  const angle = radarAxisAngle(index, totalAxes);
  const clamped = Math.max(0, Math.min(100, valuePercent));
  const r = (clamped / 100) * radius;
  return {
    x: Number((cx + r * Math.cos(angle)).toFixed(2)),
    y: Number((cy + r * Math.sin(angle)).toFixed(2)),
  };
}

export function radarPolygonPoints(
  cx: number,
  cy: number,
  radius: number,
  values: number[],
): string {
  const total = values.length;
  if (total === 0) return '';
  return values
    .map((val, idx) => {
      const pt = radarPoint(cx, cy, radius, val, idx, total);
      return `${pt.x},${pt.y}`;
    })
    .join(' ');
}

export function radarOverlapPercents(left: number[], right: number[]): number[] {
  const length = Math.min(left.length, right.length);
  return Array.from({ length }, (_, index) => Math.min(left[index] ?? 0, right[index] ?? 0));
}

export function radarGridPolygons(
  cx: number,
  cy: number,
  radius: number,
  totalAxes: number,
  levels = 4,
): string[] {
  const rings: string[] = [];
  for (let i = 1; i <= levels; i++) {
    const fraction = (i / levels) * 100;
    const dummyValues = Array(totalAxes).fill(fraction);
    rings.push(radarPolygonPoints(cx, cy, radius, dummyValues));
  }
  return rings;
}

export function radarGridCircles(radius: number, levels = 4): number[] {
  return Array.from({ length: levels }, (_, index) => ((index + 1) / levels) * radius);
}
