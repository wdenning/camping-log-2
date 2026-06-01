# Hike Sections — Data & Content

All hike section data lives in one file: `src/data/posts.ts`. Adding a new section means adding one object to the `POSTS` array. The build reads this array to pre-render every post page and populate the home page grid and global map.

---

## The Post type

```typescript
export type Post = {
  slug: string;           // URL key — becomes /posts/<slug>
  title: string;          // Display title, e.g. "Echo Lake to Sierra City"
  section: string;        // PCT section letters, e.g. "J/K"
  state: 'CA' | 'OR' | 'WA';
  date: string;           // Free text, e.g. "Day 1–9" or "June 14–22"
  description: string;    // 1–3 sentence summary shown on the card and post page
  gpxFile: string | null; // Path to GPX in public/, e.g. "/gpx/echo-lake.gpx", or null
  pctMileStart: number;   // Official PCT mile marker at section start
  pctMileEnd: number;     // Official PCT mile marker at section end
  status: 'completed' | 'planned';
};
```

---

## Adding a new section

### 1. Add the entry to POSTS

```typescript
// src/data/posts.ts
{
  slug: 'sierra-city-to-castella',
  title: 'Sierra City to Castella',
  section: 'K',
  state: 'CA',
  date: 'Day 10–19',
  description: 'Dropping into the Feather River canyon and climbing back out through the Trinity Alps foothills.',
  gpxFile: null,          // or '/gpx/sierra-city-to-castella.gpx' once recorded
  pctMileStart: 1104.5,
  pctMileEnd: 1236.4,
  status: 'planned',      // change to 'completed' when done
},
```

The `slug` must be unique across all posts. It becomes the URL path (`/posts/sierra-city-to-castella`).

`getStaticPaths` in `pages/posts/[slug].tsx` reads `POSTS` and generates one HTML file per slug at build time. No other wiring is needed.

### 2. Attach a GPX file (completed sections)

1. Copy the `.gpx` file into `public/gpx/`.
2. Set `gpxFile: '/gpx/your-filename.gpx'` in the post object.
3. Change `status` to `'completed'`.

The file name can be anything — it just needs to match the value in `gpxFile`. The file is served as a static asset.

When a `gpxFile` is present, the section page fetches and parses the GPX at runtime (client-side, using `@tmcw/togeojson`). The resulting GeoJSON replaces the centerline slice for that section, giving a high-fidelity track on the map.

When `gpxFile` is `null`, the map slices the official PCT centerline (`public/Full_PCT_Simplified.geojson`) between `pctMileStart` and `pctMileEnd` using Turf `lineSliceAlong`.

---

## How mile markers work on Map3D

`startMile` and `endMile` in `Map3DProps` are **coordinate array indices**, not PCT mile numbers. The section page sets them based on the loaded GeoJSON:

- With GPX: `startMile = 0`, `endMile = coords.length - 1`
- Without GPX: `startMile = 0`, `endMile = slicedCoords.length - 1`

The mile marker labels rendered on the map count from 0 within the segment, not from the official PCT mile. This is by design — the exact label values don't matter as much as the visual spacing.

---

## Status and UI colours

| `status` | Trail color default | Badge colour | Used on |
|----------|-------------------|-------------|---------|
| `completed` | `#fff` (white) | `#7adf8c` (green) | Home card, post header, global map |
| `planned` | `#fbbf24` (amber) | `#fbbf24` (amber) | Home card, post header, global map |

On the global map, the colour of a post's highlight segment is determined by whether the segment falls north or south of the flip-flop point (`FLIPFLOP_MILE = 1073`), not by `status`.

---

## Slug conventions

- Lowercase, hyphen-separated place names: `echo-lake-to-sierra-city`
- Match the section's canonical trailhead-to-trailhead description
- Slugs are permanent — changing one breaks any external links and will cause a 404 if someone has the old URL bookmarked

---

## PCT mileage reference

The `pctMileStart` / `pctMileEnd` values should use the **official PCTA mileage** from the current year's data book (not the simplified GeoJSON's internal distances, which differ by ~40 miles total). These values appear in the UI as the displayed mile range ("Miles 1093.4–1104.5") and are used to slice the centerline.

The simplified centerline (`public/Full_PCT_Simplified.geojson`) is ~2,608 miles in Turf's measurement, vs. the official ~2,650. Turf's `lineSliceAlong` takes a distance in miles measured along the provided LineString, so slicing at official mile 1093 may not land exactly at the official location. The visual result is close enough for a hiking log — do not use for navigation.

---

## Existing GPX files

```
public/gpx/
  WA Section L - size 9 - 033649 points - 063.57 miles.gpx
```

This file is referenced when its corresponding post is added to `POSTS`. Set `gpxFile` to `'/gpx/WA Section L - size 9 - 033649 points - 063.57 miles.gpx'` (URL-encoding not needed since the browser handles it in `fetch()`).
