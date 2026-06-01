import * as React from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import lineSliceAlong from '@turf/line-slice-along';
import length from '@turf/length';
import { lineString } from '@turf/helpers';
import { POSTS } from '../data/posts';
import { fetchGpxAsGeoJson } from '../utils/gpxToGeoJson';
import { trailDistanceToCoord } from '../utils/trailUtils';

// Actual PCT mile for the flip-flop start at Echo Lake (used for display + color comparison)
const FLIPFLOP_PCT_MILE = 1093.4;
const PCT_TOTAL_MILES = 2650; // used as denominator for coordAtMile index lookup

// GPS coord for Echo Lake from Halfmile CA Sec J reference data
const ECHO_LAKE_GPS: [number, number] = [-120.043836, 38.834584];

export type GlobalBasemap = 'topo' | 'outdoor' | 'satellite' | 'streets';

const TILE_URLS: Record<GlobalBasemap, string> = {
  topo: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
  outdoor: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
  satellite: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
  streets: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
};

function buildStyle(basemap: GlobalBasemap) {
  return {
    version: 8 as const,
    sources: {
      basemap: { type: 'raster' as const, tiles: [TILE_URLS[basemap]], tileSize: 256 },
    },
    layers: [{ id: 'basemap', type: 'raster' as const, source: 'basemap' }],
  };
}

function buildCoordLookup(coords: [number, number][]) {
  return (mile: number): [number, number] => {
    const t = Math.max(0, Math.min(1, mile / PCT_TOTAL_MILES));
    const raw = t * (coords.length - 1);
    const i = Math.min(Math.floor(raw), coords.length - 2);
    const frac = raw - i;
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[i + 1];
    return [lng1 + (lng2 - lng1) * frac, lat1 + (lat2 - lat1) * frac];
  };
}

function geoBearing(from: [number, number], to: [number, number]): number {
  const [lng1r, lat1r] = from.map(v => v * Math.PI / 180);
  const [lng2r, lat2r] = to.map(v => v * Math.PI / 180);
  const dLng = lng2r - lng1r;
  const y = Math.sin(dLng) * Math.cos(lat2r);
  const x = Math.cos(lat1r) * Math.sin(lat2r) - Math.sin(lat1r) * Math.cos(lat2r) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function makeSectionLabel(opts: {
  direction: string; subtitle: string; miles: string; dates: string; color: string;
}) {
  const el = document.createElement('div');
  el.style.cssText = [
    'background:#10281af0',
    `border:2px solid ${opts.color}`,
    'border-radius:12px',
    'padding:10px 16px',
    'font-family:sans-serif',
    'box-shadow:0 4px 20px rgba(0,0,0,0.65)',
    'min-width:140px',
    'text-align:center',
    'pointer-events:none',
    'user-select:none',
  ].join(';');
  el.innerHTML = `
    <div style="font-size:15px;font-weight:bold;color:#e6ffe6;letter-spacing:0.04em">${opts.direction}</div>
    <div style="font-size:11px;color:#b6f5c1;margin-top:2px">${opts.subtitle}</div>
    <div style="font-size:11px;color:${opts.color};margin-top:3px;font-weight:bold">${opts.miles}</div>
    <div style="font-size:10px;color:#b6f5c1;margin-top:2px;opacity:0.8">${opts.dates}</div>
  `;
  return el;
}

function makeLeaderLabel(opts: {
  title: string; subtitle: string; color: string; showDot?: boolean; lineLength?: number;
}) {
  const el = document.createElement('div');
  el.style.cssText = 'display:flex;align-items:center;pointer-events:none;user-select:none';

  if (opts.showDot !== false) {
    const dot = document.createElement('div');
    dot.style.cssText = `width:7px;height:7px;border-radius:50%;background:${opts.color};border:1.5px solid #10281a;box-shadow:0 1px 4px rgba(0,0,0,0.6);flex-shrink:0`;
    el.appendChild(dot);
  }

  const line = document.createElement('div');
  line.style.cssText = `width:${opts.lineLength ?? 28}px;height:1.5px;background:${opts.color};opacity:0.55;flex-shrink:0`;

  const box = document.createElement('div');
  box.style.cssText = [
    'background:#10281af0',
    `border:1.5px solid ${opts.color}`,
    'border-radius:8px',
    'padding:6px 12px',
    'font-family:sans-serif',
    'box-shadow:0 3px 14px rgba(0,0,0,0.65)',
    'white-space:nowrap',
  ].join(';');
  box.innerHTML = `
    <div style="font-size:13px;font-weight:bold;color:#e6ffe6">${opts.title}</div>
    <div style="font-size:11px;color:${opts.color};margin-top:2px">${opts.subtitle}</div>
  `;

  el.appendChild(line);
  el.appendChild(box);
  return el;
}

export default function GlobalMap({ basemap = 'topo' }: { basemap?: GlobalBasemap }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<maplibregl.Map | null>(null);
  const infoPanelRef = React.useRef<HTMLDivElement>(null);
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const markersRef = React.useRef<maplibregl.Marker[]>([]);
  const centerlineRef = React.useRef<any>(null);
  const gpxCacheRef = React.useRef<Map<string, any>>(new Map());
  const stateLinesRef = React.useRef<any>(null);

  const addLayers = React.useCallback(async (map: maplibregl.Map) => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!centerlineRef.current) {
      try {
        const res = await fetch('/Full_PCT_Simplified.geojson');
        centerlineRef.current = await res.json();
      } catch (e) {
        console.warn('Could not load PCT centerline', e);
        return;
      }
    }
    const geojson = centerlineRef.current;
    const feature = geojson.features?.[0] ?? geojson;
    const centerlineCoords: [number, number][] = feature.geometry.coordinates;
    const coordAtMile = buildCoordLookup(centerlineCoords);
    const full = lineString(centerlineCoords);

    // Compute geographic trail distance to Echo Lake for accurate lineSliceAlong
    const flipFlopGeoMile = trailDistanceToCoord(centerlineCoords, ECHO_LAKE_GPS);
    const totalGeoMiles = length(full, { units: 'miles' });

    // Get the actual trail coord at the flip-flop point for the Echo Lake label
    const flipFlopSeg = lineSliceAlong(full, Math.max(0, flipFlopGeoMile - 0.05), flipFlopGeoMile + 0.05, { units: 'miles' });
    const echoLakeTrailCoord = flipFlopSeg.geometry.coordinates[0] as [number, number];

    if (!stateLinesRef.current) {
      try {
        const statesRes = await fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json');
        stateLinesRef.current = await statesRes.json();
      } catch (e) {
        console.warn('Could not load state boundaries', e);
      }
    }
    if (stateLinesRef.current) {
      map.addSource('state-lines', { type: 'geojson', data: stateLinesRef.current });
      map.addLayer({
        id: 'state-lines',
        type: 'line',
        source: 'state-lines',
        paint: { 'line-color': '#ffffff', 'line-width': 1.2, 'line-opacity': 0.45 },
      });
    }

    // Faint full-trail underlay
    map.addSource('pct-centerline', { type: 'geojson', data: geojson });
    map.addLayer({ id: 'pct-centerline-casing', type: 'line', source: 'pct-centerline', paint: { 'line-color': '#10281a', 'line-width': 4, 'line-opacity': 0.4 } });
    map.addLayer({ id: 'pct-centerline', type: 'line', source: 'pct-centerline', paint: { 'line-color': '#3d6b50', 'line-width': 2, 'line-opacity': 0.5, 'line-dasharray': [3, 2] } });

    // Section 1 — NOBO: Echo Lake → Canada
    const seg1 = lineSliceAlong(full, flipFlopGeoMile, totalGeoMiles, { units: 'miles' });
    map.addSource('section1', { type: 'geojson', data: { type: 'FeatureCollection', features: [seg1] } });
    map.addLayer({ id: 'section1-casing', type: 'line', source: 'section1', paint: { 'line-color': '#10281a', 'line-width': 6, 'line-opacity': 0.5 } });
    map.addLayer({ id: 'section1', type: 'line', source: 'section1', paint: { 'line-color': '#7adf8c', 'line-width': 3.5, 'line-opacity': 0.9 } });

    // Section 2 — SOBO: Echo Lake → Mexico
    const seg2 = lineSliceAlong(full, 0, flipFlopGeoMile, { units: 'miles' });
    map.addSource('section2', { type: 'geojson', data: { type: 'FeatureCollection', features: [seg2] } });
    map.addLayer({ id: 'section2-casing', type: 'line', source: 'section2', paint: { 'line-color': '#10281a', 'line-width': 6, 'line-opacity': 0.5 } });
    map.addLayer({ id: 'section2', type: 'line', source: 'section2', paint: { 'line-color': '#fbbf24', 'line-width': 3.5, 'line-opacity': 0.9 } });

    // Section labels — floating on the trail
    const s1mid = coordAtMile((FLIPFLOP_PCT_MILE + PCT_TOTAL_MILES) / 2);
    markersRef.current.push(
      new maplibregl.Marker({ element: makeSectionLabel({ direction: 'Northbound', subtitle: 'Tahoe → Canada', miles: '~1,560 mi', dates: 'June – August', color: '#7adf8c' }), anchor: 'right', offset: [-24, 0] })
        .setLngLat(s1mid).addTo(map)
    );
    const s2mid = coordAtMile(FLIPFLOP_PCT_MILE / 2);
    markersRef.current.push(
      new maplibregl.Marker({ element: makeSectionLabel({ direction: 'Southbound', subtitle: 'Tahoe → Mexico', miles: '~1,090 mi', dates: 'September – October', color: '#fbbf24' }), anchor: 'right', offset: [-24, 0] })
        .setLngLat(s2mid).addTo(map)
    );

    // High-fidelity GPX for completed sections
    for (const post of POSTS.filter((p) => p.gpxFile)) {
      try {
        if (!gpxCacheRef.current.has(post.slug)) {
          gpxCacheRef.current.set(post.slug, await fetchGpxAsGeoJson(post.gpxFile!));
        }
        const gj = gpxCacheRef.current.get(post.slug);
        const id = `gpx-${post.slug}`;
        map.addSource(id, { type: 'geojson', data: gj });
        map.addLayer({ id: `${id}-casing`, type: 'line', source: id, paint: { 'line-color': '#10281a', 'line-width': 6, 'line-opacity': 0.5 } });
        map.addLayer({ id, type: 'line', source: id, paint: { 'line-color': '#7adf8c', 'line-width': 3.5, 'line-opacity': 1 } });
      } catch {}
    }

    // Post section highlights, tick marks, and hover panel
    for (let i = 0; i < POSTS.length; i++) {
      const post = POSTS[i];
      const midMile = (post.pctMileStart + post.pctMileEnd) / 2;
      const color = post.status === 'completed' || midMile > FLIPFLOP_PCT_MILE ? '#7adf8c' : '#fbbf24';
      const tickColor = color === '#7adf8c' ? '#2d8a4e' : '#b8860b';

      // Use GPS coords for accurate lineSliceAlong, fall back to scaled mile values
      const startGeoMile = post.startCoord
        ? trailDistanceToCoord(centerlineCoords, post.startCoord)
        : post.pctMileStart * (totalGeoMiles / PCT_TOTAL_MILES);
      const endGeoMile = post.endCoord
        ? trailDistanceToCoord(centerlineCoords, post.endCoord)
        : post.pctMileEnd * (totalGeoMiles / PCT_TOTAL_MILES);

      const hlSeg = lineSliceAlong(full, startGeoMile, endGeoMile, { units: 'miles' });
      const hlCoords = hlSeg.geometry.coordinates as [number, number][];
      const startCoord = hlCoords[0];
      const endCoord = hlCoords[hlCoords.length - 1];
      const hlId = `post-hl-${post.slug}`;
      map.addSource(hlId, { type: 'geojson', data: { type: 'FeatureCollection', features: [hlSeg] } });
      map.addLayer({ id: `${hlId}-casing`, type: 'line', source: hlId, paint: { 'line-color': '#10281a', 'line-width': 8, 'line-opacity': 0.55 } });
      map.addLayer({ id: hlId, type: 'line', source: hlId, paint: { 'line-color': color, 'line-width': 4.5, 'line-opacity': 1 } });
      map.addLayer({ id: `${hlId}-hit`, type: 'line', source: hlId, paint: { 'line-color': 'transparent', 'line-width': 20, 'line-opacity': 0 } });

      const hoverColor = color === '#7adf8c' ? '#aef0be' : '#fdd060';
      const setHover = (on: boolean) => {
        map.setPaintProperty(hlId, 'line-width', on ? 6.5 : 4.5);
        map.setPaintProperty(hlId, 'line-color', on ? hoverColor : color);
        map.setPaintProperty(`${hlId}-casing`, 'line-width', on ? 11 : 8);
      };

      const showPanel = () => {
        if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
        setHover(true);
        const panel = infoPanelRef.current;
        if (!panel) return;

        // Position panel to the right of the section midpoint
        const midCoord = hlCoords[Math.floor(hlCoords.length / 2)];
        const screenPt = map.project(midCoord as [number, number]);
        const containerEl = containerRef.current;
        const cw = containerEl?.clientWidth ?? 800;
        const ch = containerEl?.clientHeight ?? 600;
        const panelW = 240;
        let leftPx = screenPt.x + 28;
        let topPx = screenPt.y - 50;
        if (leftPx + panelW > cw - 16) leftPx = screenPt.x - panelW - 28;
        topPx = Math.max(44, Math.min(topPx, ch - 140));
        panel.style.left = `${leftPx}px`;
        panel.style.top = `${topPx}px`;

        panel.innerHTML = `
          <strong style="color:#b6f5c1;font-size:14px;display:block;margin-bottom:4px">${post.title}</strong>
          <span style="color:#7adf8c;font-size:12px">Miles ${post.pctMileStart}–${post.pctMileEnd}</span>
          <span style="color:#b6f5c1;font-size:12px;margin-left:8px;opacity:0.75">${post.date}</span>
          <a href="/posts/${post.slug}" style="color:#7adf8c;font-weight:bold;font-size:13px;text-decoration:none;display:block;margin-top:8px">Open map →</a>
        `;
        panel.style.opacity = '1';
        panel.style.pointerEvents = 'auto';
        panel.style.transform = 'translateX(0)';
      };

      const scheduleHide = () => {
        closeTimerRef.current = setTimeout(() => {
          setHover(false);
          const panel = infoPanelRef.current;
          if (panel) { panel.style.opacity = '0'; panel.style.pointerEvents = 'none'; panel.style.transform = 'translateX(8px)'; }
        }, 80);
      };

      map.on('click', `${hlId}-hit`, () => { window.location.href = `/posts/${post.slug}`; });
      map.on('mouseenter', `${hlId}-hit`, () => { map.getCanvas().style.cursor = 'pointer'; showPanel(); });
      map.on('mouseleave', `${hlId}-hit`, () => { map.getCanvas().style.cursor = ''; scheduleHide(); });

      // Perpendicular tick marks at actual segment endpoints
      const startBearing = geoBearing(hlCoords[0], hlCoords[Math.min(3, hlCoords.length - 1)]);
      const endBearing = geoBearing(hlCoords[Math.max(0, hlCoords.length - 4)], hlCoords[hlCoords.length - 1]);
      const tickEntries: [[number, number], number][] = [[startCoord, startBearing], [endCoord, endBearing]];
      for (const [tickCoord, tickBearing] of tickEntries) {
        const tick = document.createElement('div');
        tick.style.cssText = `width:20px;height:5px;background:${tickColor};border:1.5px solid #10281a;border-radius:2px;cursor:pointer;box-shadow:0 1px 5px rgba(0,0,0,0.7);transform:rotate(${tickBearing}deg)`;
        tick.addEventListener('mouseenter', showPanel);
        tick.addEventListener('mouseleave', scheduleHide);
        tick.addEventListener('click', () => { window.location.href = `/posts/${post.slug}`; });
        markersRef.current.push(
          new maplibregl.Marker({ element: tick, anchor: 'center' }).setLngLat(tickCoord).addTo(map)
        );
      }
    }

    // Termini + Echo Lake leader labels
    // Echo Lake is anchored to the actual trail coord at the computed flip-flop point
    for (const { coord, title, subtitle, color, showDot, lineLength } of [
      { coord: [-116.4806, 32.5899] as [number, number], title: 'Mexico', subtitle: 'Southern Terminus', color: '#fbbf24', showDot: true, lineLength: undefined },
      { coord: [-120.8029, 48.9994] as [number, number], title: 'Canada', subtitle: 'Northern Terminus', color: '#7adf8c', showDot: true, lineLength: undefined },
      { coord: echoLakeTrailCoord, title: '★ Echo Lake', subtitle: 'Flip-flop Start', color: '#7adf8c', showDot: false, lineLength: 72 },
    ] as { coord: [number,number]; title: string; subtitle: string; color: string; showDot: boolean; lineLength?: number }[]) {
      markersRef.current.push(
        new maplibregl.Marker({ element: makeLeaderLabel({ title, subtitle, color, showDot, lineLength }), anchor: 'left' })
          .setLngLat(coord)
          .addTo(map)
      );
    }
  }, []);

  React.useEffect(() => {
    if (!containerRef.current) return;

    let prevCenter: [number, number] | null = null;
    let prevZoom: number | null = null;
    if (mapRef.current) {
      prevCenter = mapRef.current.getCenter().toArray() as [number, number];
      prevZoom = mapRef.current.getZoom();
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(basemap),
      ...(prevCenter
        ? { center: prevCenter, zoom: prevZoom! }
        : { bounds: [[-124.5, 32.5], [-116.0, 49.1]] as [[number, number], [number, number]], fitBoundsOptions: { padding: 40 } }),
      pitch: 0,
      bearing: 0,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    map.on('load', () => addLayers(map));

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [basemap, addLayers]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {/* Hint bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, textAlign: 'center', padding: '7px 16px', background: 'linear-gradient(to bottom, rgba(16,40,26,0.88) 70%, transparent)', fontFamily: 'sans-serif', fontSize: 12, color: '#7adf8c', letterSpacing: '0.04em', pointerEvents: 'none', userSelect: 'none' }}>
        Hover over a section to view the associated post
      </div>
      {/* Hover info panel — JS positions it next to the hovered section */}
      <div
        ref={infoPanelRef}
        onMouseEnter={() => { if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; } }}
        onMouseLeave={() => {
          closeTimerRef.current = setTimeout(() => {
            const p = infoPanelRef.current;
            if (p) { p.style.opacity = '0'; p.style.pointerEvents = 'none'; p.style.transform = 'translateX(8px)'; }
          }, 80);
        }}
        style={{ position: 'absolute', left: 0, top: 0, zIndex: 10, opacity: 0, pointerEvents: 'none', transform: 'translateX(8px)', transition: 'opacity 0.18s ease, transform 0.18s ease', background: '#10281af0', border: '1.5px solid #7adf8c', borderRadius: 10, padding: '12px 16px', fontFamily: 'sans-serif', boxShadow: '0 4px 20px rgba(0,0,0,0.65)', minWidth: 220 }}
      />
    </div>
  );
}
