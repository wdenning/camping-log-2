# CLAUDE.md — PCT Hike Log

Context for working on this codebase. Read this before making changes.

## What this project is

A static personal hiking journal for a PCT flip-flop hike. It is deployed to GitHub Pages at `https://wdenning.github.io/camping-log-2`. All pages are pre-rendered at build time — there is no server, no database, no API.

Full documentation lives in `docs/`:
- [`docs/hosting.md`](docs/hosting.md) — deployment, basePath, GitHub Actions
- [`docs/maps.md`](docs/maps.md) — map components, basemaps, tile sources, visualizer
- [`docs/hike-data.md`](docs/hike-data.md) — adding posts, GPX files, data types

## Critical constraints

### Static export — no server features
`output: 'export'` in `next.config.ts`. This means:
- No API routes, no `getServerSideProps`, no ISR
- Only `getStaticProps` and `getStaticPaths` (with `fallback: false`)
- `next start` does not work after a build — use `npx serve out` locally
- `next/image` optimization is disabled (`images: { unoptimized: true }`)

### basePath is conditional
The site lives under `/camping-log-2` on GitHub Pages but at `/` locally. `next.config.ts` sets `basePath` only when `process.env.GITHUB_ACTIONS === 'true'`.

Next.js automatically handles `<Link>` and `<Image>` with the basePath. **It does not rewrite `fetch()` calls or string literals.** Any time you write a URL to a file in `public/`, or navigate imperatively with `window.location.href`, you must prefix with `process.env.NEXT_PUBLIC_BASE_PATH ?? ''`:

```typescript
fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/Full_PCT_Simplified.geojson`)
window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/posts/${slug}`;
```

Current files with manual basePath handling:
- `pages/posts/[slug].tsx` — GeoJSON fetch, GPX fetch
- `src/components/GlobalMap.tsx` — GeoJSON fetch, GPX fetch, `window.location.href` ×2, inline `<a href>` in innerHTML

If you add any new `fetch('/...')` or `window.location.href = '/...'` pointing to `public/` assets or internal routes, prefix them the same way.

### MapLibre must be loaded with `ssr: false`
MapLibre GL JS touches `window` at import time. Both map components use `dynamic(..., { ssr: false })`. Do not import them at the top level or remove the `ssr: false` flag — the static build will fail.

```typescript
const Map3D = dynamic(() => import('../../src/components/Map3D'), { ssr: false });
const GlobalMap = dynamic(() => import('../src/components/GlobalMap'), { ssr: false });
```

## Project structure

```
pages/                    Next.js Pages Router
  index.tsx               Home — card grid from POSTS
  map.tsx                 Full-trail GlobalMap page
  gear.tsx                Gear list with donut chart
  route.tsx               Flip-flop route explanation
  posts/[slug].tsx        Per-section 3D map page

src/
  data/posts.ts           POSTS array — single source of truth for all sections
  components/
    Map3D.tsx             3D section map with fly-through visualizer
    GlobalMap.tsx         Full PCT overview map
    HotkeyOverlay.tsx     Keyboard shortcut modal (portal into document.body)
    mapUtils.ts           getMapStyle() — builds MapLibre style objects per basemap
    useMapLibreAttributionCss.ts  Injects dark-theme attribution CSS
  utils/
    gpxToGeoJson.ts       fetch() + DOMParser + @tmcw/togeojson

public/
  Full_PCT_Simplified.geojson   Full PCT centerline (~2,608 mi in Turf measurements)
  gpx/                          GPX track files for completed sections

.github/workflows/deploy.yml   GitHub Actions build + deploy
```

## Adding a new hike section

1. Add a `Post` object to the `POSTS` array in `src/data/posts.ts` — see [`docs/hike-data.md`](docs/hike-data.md).
2. If completed, drop the GPX file in `public/gpx/` and set `gpxFile` to the path.
3. No other wiring needed — `getStaticPaths` reads `POSTS` automatically.

## Map data flow (per-section page)

1. `[slug].tsx` renders with `post` from `getStaticProps` (data from `POSTS`).
2. On mount (`useEffect`), it either:
   - Fetches the GPX file and converts to GeoJSON via `gpxToGeoJson.ts`, or
   - Fetches `Full_PCT_Simplified.geojson` and slices it with Turf `lineSliceAlong` using `post.pctMileStart` / `post.pctMileEnd`.
3. The resulting GeoJSON is passed to `Map3D` as `trailGeoJson`.
4. `Map3D` adds the trail as a MapLibre source/layer and runs the visualizer.

## Conventions

- **No comments** unless the reason is non-obvious. Don't comment what the code does.
- **Inline styles throughout** — this project uses no CSS modules, no Tailwind, no styled-components. All styling is `style={{ ... }}` JSX props or `element.style.cssText` for DOM-created elements.
- **No abstractions beyond what exists** — don't introduce utility layers or helper components unless the duplication is real and significant.
- **Pages Router only** — all pages are in `pages/`. There is no `app/` directory. `'use client'` is an App Router directive and should never appear here.
- **Coordinate order is [lng, lat]** — GeoJSON and MapLibre both use longitude-first. Don't swap them.

## Tile sources used

| Basemap | URL pattern |
|---------|------------|
| USGS Topo (outdoor) | `basemap.nationalmap.gov/.../USGSTopo/MapServer/tile/{z}/{y}/{x}` |
| USGS Satellite | `basemap.nationalmap.gov/.../USGSImageryOnly/MapServer/tile/{z}/{y}/{x}` |
| OpenStreetMap | `tile.openstreetmap.org/{z}/{x}/{y}.png` |
| OpenTopoMap | `tile.opentopomap.org/{z}/{x}/{y}.png` |
| Terrarium DEM | `s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png` |
| US State lines | `raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json` |

All tile fetching is client-side. No API keys required.

Note: USGS uses `{z}/{y}/{x}` (row/column swapped vs. standard). This is intentional and correct.
