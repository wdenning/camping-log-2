# Maps Architecture

Two distinct map components are used — one per-section 3D visualizer, one full-trail overview.

---

## Map3D — per-section 3D fly-through

File: `src/components/Map3D.tsx`  
Used by: `pages/posts/[slug].tsx`

### What it renders

- A **3D tilted MapLibre map** with terrain exaggeration (1.5×) from Terrarium DEM tiles
- The **trail line** for the current section (white or yellow depending on status)
- **Mile markers** as symbol labels along the trail
- **PCT points of interest** (passes, lakes, summits) as symbol markers
- A **hiker/tent/cheese emoji marker** that animates along the trail during the fly-through
- A **hiker SVG overlay** in the corner showing current mile

### The fly-through visualizer

`visualizerIdx` drives the animation — it is an index into the trail's coordinate array, or the string `'start'` / `'end'` for the intro/outro phases.

| `visualizerIdx` value | What happens |
|-----------------------|-------------|
| `'start'` | Camera spins around the trailhead (⛺ marker). 4s duration. |
| `0..n` (number) | Marker animates segment-by-segment with distance-normalized timing. Camera follows with a cinematic offset. |
| `'end'` | Camera completes a 360° spin around the end point. 4s duration. |
| `null` | No marker or camera animation. |

The parent page (`[slug].tsx`) drives `visualizerIdx` through a state machine using `useEffect` + `setTimeout`. Speed is controlled by `animationSpeed` (0.1–3×).

### Props

```typescript
type Map3DProps = {
  startMile: number;          // index into coordinates array (0 for GPX; pctMileStart for centerline slices)
  endMile: number;            // index into coordinates array
  trailGeoJson: any;          // GeoJSON FeatureCollection with one LineString feature
  visualizerIdx?: number | 'start' | 'end' | null;
  basemap?: BasemapType;
  overlayHiker?: boolean;     // show the corner hiker SVG
  showTrail?: boolean;
  trailColor?: string;        // hex, defaults to '#fff'
  showMileMarkers?: boolean;
  showPCTPOI?: boolean;
  showSkybox?: boolean;       // currently wired but skybox style not fully implemented
  cameraAttached?: boolean;   // currently wired to prop but camera always follows visualizer
};
```

### Keyboard hotkeys (HotkeyOverlay)

Press `?` on any section page to see the hotkey modal. Hotkeys are handled in `HotkeyOverlay.tsx` via a `keydown` listener on `window`.

| Key | Action |
|-----|--------|
| `?` | Toggle hotkey modal |
| `b` | Cycle basemap |
| `t` | Toggle trail visibility |
| `m` | Toggle mile markers |
| `p` | Toggle POIs |
| `h` | Toggle hiker overlay |
| `Space` | Play / pause visualizer |
| `→` / `←` | Step forward / back when paused |

### Basemaps

Defined in `src/components/mapUtils.ts` → `getMapStyle(basemap)`.

| Key | Source | Notes |
|-----|--------|-------|
| `outdoor` | USGS National Map Topo | Default. Good trail detail. |
| `satellite` | USGS National Map Imagery | High-res aerial. |
| `streets` | OpenStreetMap | `tile.openstreetmap.org` |
| `topo` | OpenTopoMap | Contour lines, OSM base. |
| `dotshading` | Terrarium DEM only | Green hillshade — no raster base layer. |
| `slopeshading` | Terrarium DEM only | Shadow-only hillshade. |
| `aspectshading` | Terrarium DEM only | N/S slope contrast. |

All non-shading basemaps also load **3D terrain** via a separate Terrarium DEM source with `exaggeration: 1.5`.

### Terrain elevation (Terrarium DEM)

```
https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png
```

This is the Mapzen/AWS elevation tile service. It encodes elevation as RGB values (`(R*256 + G + B/256) - 32768` metres). MapLibre decodes it natively with `encoding: 'terrarium'`. Max zoom 15.

---

## GlobalMap — full-trail overview

File: `src/components/GlobalMap.tsx`  
Used by: `pages/map.tsx`

### What it renders

- Full PCT centerline (faint dashed grey underlay from `public/Full_PCT_Simplified.geojson`)
- **Section 1 (NOBO, Tahoe → Canada)** — green line from mile 1073 to end
- **Section 2 (SOBO, Tahoe → Mexico)** — yellow line from start to mile 1073
- **Per-post highlighted segments** — thicker coloured line for each entry in `POSTS`
- **Perpendicular tick marks** at start/end of each post segment — clickable
- **Section labels** floating mid-trail (direction, distance, dates)
- **Leader labels** at Mexico, Canada, and Echo Lake (flip-flop start)
- **State boundary lines** (fetched from `PublicaMundi/MappingAPI` on GitHub)
- **High-fidelity GPX overlays** for posts that have a `gpxFile`

### Interaction

Hovering or clicking a highlighted segment or its tick marks shows a floating info panel (right side) with the post title, mile range, and a link to the post page. Clicking navigates to the post.

### Data flow

1. On mount, fetches `Full_PCT_Simplified.geojson` from `public/` (with basePath prefix).
2. Uses Turf `lineSliceAlong` to cut the full centerline into per-section and per-post segments.
3. Fetches GPX files for completed posts (with basePath prefix) and overlays them as separate sources.
4. All fetched data is cached in refs (`centerlineRef`, `gpxCacheRef`, `stateLinesRef`) so basemap switches don't re-fetch.

### Constants

```typescript
const FLIPFLOP_MILE = 1073;    // Echo Lake in simplified GeoJSON miles
const PCT_TOTAL_MILES = 2608;  // Total length of simplified centerline
```

These are distances measured along the **simplified centerline GeoJSON**, not the official PCT mileage (2,650 mi). They will drift from the official numbers — don't use them for navigation or real-world distance calculations.

### Basemaps

Four raster basemaps only (no 3D terrain on the global map):

| Key | URL |
|-----|-----|
| `topo` | `tile.opentopomap.org/{z}/{x}/{y}.png` |
| `outdoor` | USGS Topo `arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}` |
| `satellite` | USGS Imagery `arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}` |
| `streets` | `tile.openstreetmap.org/{z}/{x}/{y}.png` |

Note: USGS uses `{z}/{y}/{x}` order (row/column swapped vs. standard slippy tiles).

---

## Coordinate systems and GeoJSON

All coordinates are **[longitude, latitude]** as per GeoJSON spec — not lat/lng. MapLibre uses the same convention. Be careful when passing coordinates to functions that expect `[lat, lng]` (e.g. some Leaflet APIs) — MapLibre and Turf both use `[lng, lat]`.

The `Full_PCT_Simplified.geojson` is a `FeatureCollection` with a single `LineString` feature. The coordinate array is what all slicing and lookup operations run against.

---

## SSR and dynamic import

Both `Map3D` and `GlobalMap` are always loaded with `ssr: false`:

```typescript
const Map3D = dynamic(() => import('../../src/components/Map3D'), { ssr: false });
const GlobalMap = dynamic(() => import('../src/components/GlobalMap'), { ssr: false });
```

This is required because MapLibre GL JS accesses `window`, `document`, and `WebGLRenderingContext` at import time, none of which exist during Next.js's static render pass. Removing `ssr: false` will cause a build error.
