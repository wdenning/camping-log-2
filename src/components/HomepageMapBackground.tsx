import * as React from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

// Full south→north→south cycle over 150 seconds
const CYCLE_MS = 150_000;
// Approximate trail termini for camera sweep
const SOUTH: [number, number] = [-116.5, 33.1];
const NORTH: [number, number] = [-120.8, 48.9];

export default function HomepageMapBackground() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rafRef = React.useRef<number | null>(null);
  const t0Ref = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#060d08' } }],
      },
      center: [(SOUTH[0] + NORTH[0]) / 2, (SOUTH[1] + NORTH[1]) / 2],
      zoom: 4.8,
      interactive: false,
      attributionControl: false,
    });

    map.on('load', async () => {
      try {
        const [statesRes, trailRes] = await Promise.all([
          fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json'),
          fetch(`${BASE}/Full_PCT_Simplified.geojson`),
        ]);
        const [states, geojson] = await Promise.all([statesRes.json(), trailRes.json()]);

        map.addSource('states', { type: 'geojson', data: states });
        map.addLayer({
          id: 'state-lines',
          type: 'line',
          source: 'states',
          paint: { 'line-color': '#1e6b3a', 'line-width': 0.8, 'line-opacity': 0.25 },
        });

        map.addSource('pct', { type: 'geojson', data: geojson });

        // Wide soft glow behind the trail
        map.addLayer({
          id: 'pct-glow',
          type: 'line',
          source: 'pct',
          paint: { 'line-color': '#1e6b3a', 'line-width': 14, 'line-opacity': 0.1, 'line-blur': 10 },
        });

        // Main trail
        map.addLayer({
          id: 'pct-line',
          type: 'line',
          source: 'pct',
          paint: { 'line-color': '#1e6b3a', 'line-width': 1.8, 'line-opacity': 0.9 },
        });

        if (!prefersReduced) {
          const tick = (ts: number) => {
            if (!t0Ref.current) t0Ref.current = ts;
            const elapsed = ts - t0Ref.current;
            // Smooth sinusoidal oscillation: 0 → 1 → 0
            const f = (1 - Math.cos(((elapsed % CYCLE_MS) / CYCLE_MS) * 2 * Math.PI)) / 2;
            map.jumpTo({
              center: [
                SOUTH[0] + f * (NORTH[0] - SOUTH[0]),
                SOUTH[1] + f * (NORTH[1] - SOUTH[1]),
              ],
            });
            rafRef.current = requestAnimationFrame(tick);
          };
          rafRef.current = requestAnimationFrame(tick);
        }
      } catch {
        // Non-critical — background failing to load is acceptable
      }
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      map.remove();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      role="presentation"
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
