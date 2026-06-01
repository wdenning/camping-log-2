import * as React from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const CYCLE_MS = 150_000;
const SOUTH: [number, number] = [-116.5, 33.1];
const NORTH: [number, number] = [-120.8, 48.9];
// Lake Tahoe is ~39°N, ~-120°W — compute offset so animation starts there
// f = (39 - 33.1) / (48.9 - 33.1) ≈ 0.373; solve (1-cos(t*2π))/2 = 0.373 → t ≈ 0.216
const ANIM_START_OFFSET = CYCLE_MS * 0.216;

const HOLD_MS = 4_000;
const FADE_MS = 2_000;
const PULSE_CYCLE_MS = 30_000;
const THEMES = ['mountains', 'roads'] as const;
type Theme = typeof THEMES[number];

type LayerFade = { id: string; prop: string; on: number; off: number };

const THEME_FADES: Record<Theme, LayerFade[]> = {
  mountains: [
    // exaggeration is animated; visibility is toggled separately
    { id: 'hillshade', prop: 'hillshade-exaggeration', on: 0.6, off: 0 },
  ],
  roads: [
    { id: 'cities-halo', prop: 'circle-opacity', on: 0.3, off: 0 },
    { id: 'cities-dot', prop: 'circle-opacity', on: 0.9, off: 0 },
  ],
};

// Major western-US + border cities — inlined so this theme never depends on a fetch
const CITIES_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: [
    [-118.2437, 34.0522], [-122.4194, 37.7749], [-117.1611, 32.7157],
    [-121.4944, 38.5816], [-119.8138, 39.5296], [-115.1398, 36.1699],
    [-112.0740, 33.4484], [-111.8910, 40.7608], [-104.9903, 39.7392],
    [-122.6750, 45.5231], [-123.0868, 44.0521], [-122.8756, 42.3265],
    [-122.3321, 47.6062], [-122.4443, 47.2529], [-117.4260, 47.6588],
    [-116.2023, 43.6150], [-114.0154, 46.8721], [-123.1207, 49.2827],
    [-117.3961, 33.9534], [-120.6596, 35.2828], [-122.0308, 37.3382],
    [-118.1445, 34.1478], [-117.9143, 33.8120],
  ].map(([lng, lat]) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [lng, lat] },
    properties: {},
  })),
};

const safeLoad = (url: string) => fetch(url).then((r) => r.json()).catch(() => null);

function extractPCTCoords(geojson: any): [number, number][] {
  if (!geojson) return [];
  if (geojson.type === 'FeatureCollection')
    return geojson.features.flatMap((f: any) => extractPCTCoords(f));
  if (geojson.type === 'Feature') return extractPCTCoords(geojson.geometry);
  if (geojson.type === 'LineString') return geojson.coordinates as [number, number][];
  if (geojson.type === 'MultiLineString')
    return (geojson.coordinates as [number, number][][]).flat();
  return [];
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export default function HomepageMapBackground() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rafRef = React.useRef<number | null>(null);
  const t0Ref = React.useRef<number | null>(null);
  const themeRef = React.useRef(0);
  const holdTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRafRef = React.useRef<number | null>(null);
  const pulseRafRef = React.useRef<number | null>(null);
  const pulseT0Ref = React.useRef<number | null>(null);
  const pctCoordsRef = React.useRef<[number, number][]>([]);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let destroyed = false;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#060d08' } }],
      },
      center: [-120.0, 39.1],
      zoom: 4.8,
      interactive: false,
      attributionControl: false,
    });

    const fadeBetween = (from: Theme, to: Theme) => {
      if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);

      // Hillshade must be made visible *before* fading in, hidden *after* fading out
      if (to === 'mountains' && map.getLayer('hillshade')) {
        map.setLayoutProperty('hillshade', 'visibility', 'visible');
        map.setPaintProperty('hillshade', 'hillshade-exaggeration', 0);
      }

      const start = performance.now();
      const step = (now: number) => {
        if (destroyed) return;
        const t = easeInOut(Math.min((now - start) / FADE_MS, 1));
        THEME_FADES[from].forEach(({ id, prop, on, off }) => {
          if (map.getLayer(id)) map.setPaintProperty(id, prop, on + (off - on) * t);
        });
        THEME_FADES[to].forEach(({ id, prop, on, off }) => {
          if (map.getLayer(id)) map.setPaintProperty(id, prop, off + (on - off) * t);
        });
        if (now - start < FADE_MS) {
          fadeRafRef.current = requestAnimationFrame(step);
        } else if (from === 'mountains' && map.getLayer('hillshade')) {
          map.setLayoutProperty('hillshade', 'visibility', 'none');
        }
      };
      fadeRafRef.current = requestAnimationFrame(step);
    };

    const scheduleNext = () => {
      holdTimerRef.current = setTimeout(() => {
        if (destroyed) return;
        const from = THEMES[themeRef.current];
        themeRef.current = (themeRef.current + 1) % THEMES.length;
        fadeBetween(from, THEMES[themeRef.current]);
        scheduleNext();
      }, HOLD_MS);
    };

    map.on('load', async () => {
      const [states, geojson] = await Promise.all([
        safeLoad('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json'),
        safeLoad(`${BASE}/Full_PCT_Simplified.geojson`),
      ]);
      if (destroyed) return;

      // --- Hillshade: hidden by default, only visible during mountains theme ---
      map.addSource('dem', {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        tileSize: 256,
        encoding: 'terrarium',
      });
      map.addLayer({
        id: 'hillshade',
        type: 'hillshade',
        source: 'dem',
        layout: { visibility: 'none' },
        paint: {
          'hillshade-shadow-color': '#060d08',
          'hillshade-highlight-color': '#3d9e5c',
          'hillshade-accent-color': '#1e6b3a',
          'hillshade-exaggeration': 0,
          'hillshade-illumination-direction': 335,
          'hillshade-illumination-anchor': 'viewport',
        },
      });

      // --- State boundaries: always-on dim underlay ---
      if (states) {
        map.addSource('states', { type: 'geojson', data: states });
        map.addLayer({
          id: 'state-lines',
          type: 'line',
          source: 'states',
          paint: { 'line-color': '#3d9e5c', 'line-width': 1.2, 'line-opacity': 0.45 },
        });
      }

      // --- Roads theme: inlined city glow dots ---
      map.addSource('cities', { type: 'geojson', data: CITIES_GEOJSON });
      map.addLayer({
        id: 'cities-halo',
        type: 'circle',
        source: 'cities',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 8, 6, 18],
          'circle-color': '#1e6b3a',
          'circle-opacity': 0,
          'circle-blur': 1,
        },
      });
      map.addLayer({
        id: 'cities-dot',
        type: 'circle',
        source: 'cities',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 2, 6, 4],
          'circle-color': '#3d9e5c',
          'circle-opacity': 0,
        },
      });

      // --- PCT trail: always on top ---
      if (geojson) {
        map.addSource('pct', { type: 'geojson', data: geojson });
        map.addLayer({
          id: 'pct-glow',
          type: 'line',
          source: 'pct',
          paint: { 'line-color': '#1e6b3a', 'line-width': 14, 'line-opacity': 0.1, 'line-blur': 10 },
        });
        map.addLayer({
          id: 'pct-line',
          type: 'line',
          source: 'pct',
          paint: { 'line-color': '#1e6b3a', 'line-width': 1.8, 'line-opacity': 0.9 },
        });

        // Extract coords south→north for the pulse
        const raw = extractPCTCoords(geojson);
        if (raw.length > 1) {
          const sorted = raw[0][1] > raw[raw.length - 1][1] ? [...raw].reverse() : raw;
          pctCoordsRef.current = sorted;
        }

        // Pulse layers: outer glow + bright core
        const firstCoord = pctCoordsRef.current[0] ?? [SOUTH[0], SOUTH[1]];
        map.addSource('pulse', {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'Point', coordinates: firstCoord }, properties: {} },
        });
        map.addLayer({
          id: 'pulse-halo',
          type: 'circle',
          source: 'pulse',
          paint: {
            'circle-radius': 28,
            'circle-color': '#3d9e5c',
            'circle-opacity': 0.07,
            'circle-blur': 1,
            'circle-pitch-alignment': 'map',
          },
        });
        map.addLayer({
          id: 'pulse-glow',
          type: 'circle',
          source: 'pulse',
          paint: {
            'circle-radius': 12,
            'circle-color': '#5ccf7a',
            'circle-opacity': 0.3,
            'circle-blur': 0.8,
            'circle-pitch-alignment': 'map',
          },
        });
        map.addLayer({
          id: 'pulse-core',
          type: 'circle',
          source: 'pulse',
          paint: {
            'circle-radius': 3.5,
            'circle-color': '#c0ffd8',
            'circle-opacity': 1,
            'circle-pitch-alignment': 'map',
          },
        });
      }

      // Start on mountains theme
      if (map.getLayer('hillshade')) {
        map.setLayoutProperty('hillshade', 'visibility', 'visible');
        map.setPaintProperty('hillshade', 'hillshade-exaggeration', THEME_FADES.mountains[0].on);
      }

      if (!prefersReduced) {
        const tick = (ts: number) => {
          if (destroyed) return;
          // Offset start so map begins ~60% north on load
          if (!t0Ref.current) t0Ref.current = ts - ANIM_START_OFFSET;
          const f = (1 - Math.cos((((ts - t0Ref.current) % CYCLE_MS) / CYCLE_MS) * 2 * Math.PI)) / 2;
          map.jumpTo({
            center: [SOUTH[0] + f * (NORTH[0] - SOUTH[0]), SOUTH[1] + f * (NORTH[1] - SOUTH[1])],
          });
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        scheduleNext();

        const pulseTick = (ts: number) => {
          if (destroyed) return;
          const coords = pctCoordsRef.current;
          if (!coords.length) { pulseRafRef.current = requestAnimationFrame(pulseTick); return; }
          if (!pulseT0Ref.current) pulseT0Ref.current = ts;

          const progress = ((ts - pulseT0Ref.current) % PULSE_CYCLE_MS) / PULSE_CYCLE_MS;
          const rawIdx = progress * (coords.length - 1);
          const i = Math.floor(rawIdx);
          const frac = rawIdx - i;
          const a = coords[Math.min(i, coords.length - 1)];
          const b = coords[Math.min(i + 1, coords.length - 1)];
          const lng = a[0] + (b[0] - a[0]) * frac;
          const lat = a[1] + (b[1] - a[1]) * frac;

          const src = map.getSource('pulse') as maplibregl.GeoJSONSource | undefined;
          if (src) {
            src.setData({ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: {} });
          }

          // Breathing glow
          const breathe = (Math.sin(ts / 500) + 1) / 2;
          if (map.getLayer('pulse-halo')) {
            map.setPaintProperty('pulse-halo', 'circle-radius', 22 + breathe * 12);
            map.setPaintProperty('pulse-halo', 'circle-opacity', 0.04 + breathe * 0.07);
          }
          if (map.getLayer('pulse-glow')) {
            map.setPaintProperty('pulse-glow', 'circle-radius', 9 + breathe * 5);
          }

          pulseRafRef.current = requestAnimationFrame(pulseTick);
        };
        pulseRafRef.current = requestAnimationFrame(pulseTick);
      }
    });

    return () => {
      destroyed = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
      if (pulseRafRef.current) cancelAnimationFrame(pulseRafRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
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
