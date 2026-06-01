# PCT Hike Log

A personal Pacific Crest Trail flip-flop hiking journal — built as a statically exported Next.js site deployed to GitHub Pages. Each section entry has an interactive 3D MapLibre map with a fly-through visualizer, GPX track support, and multiple basemap options.

Live site: `https://wdenning.github.io/camping-log-2`

## What's in this repo

| Path                                 | Purpose                                            |
| ------------------------------------ | -------------------------------------------------- |
| `pages/`                             | Next.js Pages Router — one file per route          |
| `pages/index.tsx`                    | Home page — grid of all hike sections              |
| `pages/map.tsx`                      | Full-trail overview map                            |
| `pages/gear.tsx`                     | Gear list with donut chart                         |
| `pages/route.tsx`                    | Flip-flop route explanation                        |
| `pages/posts/[slug].tsx`             | Individual section page with 3D map                |
| `src/data/posts.ts`                  | **Single source of truth for all hike sections**   |
| `src/components/Map3D.tsx`           | 3D per-section MapLibre map with fly-through       |
| `src/components/GlobalMap.tsx`       | Full-trail overview MapLibre map                   |
| `src/components/HotkeyOverlay.tsx`   | Keyboard shortcut modal for map pages              |
| `src/components/mapUtils.ts`         | Tile style builders and geometry helpers           |
| `src/utils/gpxToGeoJson.ts`          | Fetches and parses a GPX file into GeoJSON         |
| `public/Full_PCT_Simplified.geojson` | Full PCT centerline (used when no GPX is attached) |
| `public/gpx/`                        | GPX track files for completed sections             |
| `.github/workflows/deploy.yml`       | GitHub Actions — builds and deploys to Pages       |

## Tech stack

- **Next.js 16** (Pages Router, `output: 'export'` for static HTML)
- **MapLibre GL JS 5** — 3D map rendering
- **Turf.js** — trail slicing, length, bbox
- **@tmcw/togeojson** — GPX → GeoJSON conversion
- **React Icons** — UI icons
- Tile sources: USGS National Map, OpenTopoMap, OpenStreetMap, Terrarium DEM (Mapzen/AWS)

## Local development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static export → ./out  (uses basePath only in CI)
```

No environment variables are needed for local dev. The `basePath` (`/camping-log-2`) is only injected when building inside GitHub Actions.

## Documentation

- [Hosting & Deployment](docs/hosting.md) — GitHub Pages setup, basePath handling, CI/CD
- [Maps Architecture](docs/maps.md) — Map components, basemaps, tile sources, the 3D visualizer
- [Adding Hike Sections](docs/hike-data.md) — How to add posts, attach GPX files, data types
