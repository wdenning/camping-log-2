import length from '@turf/length';
import { lineString } from '@turf/helpers';

export function trailDistanceToCoord(
  coords: [number, number][],
  targetCoord: [number, number]
): number {
  let minDist = Infinity;
  let closestIdx = 0;
  for (let i = 0; i < coords.length; i++) {
    const dx = coords[i][0] - targetCoord[0];
    const dy = coords[i][1] - targetCoord[1];
    const d = dx * dx + dy * dy;
    if (d < minDist) { minDist = d; closestIdx = i; }
  }
  if (closestIdx === 0) return 0;
  return length(lineString(coords.slice(0, closestIdx + 1)), { units: 'miles' });
}
