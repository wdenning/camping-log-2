# Hosting & Deployment

## Overview

The site is a **fully static export** (`output: 'export'` in `next.config.ts`) deployed to **GitHub Pages** under the path `https://wdenning.github.io/camping-log-2`. No server is involved — `next build` writes plain HTML/CSS/JS to `./out`, and GitHub Actions uploads that directory.

## GitHub Actions workflow

File: `.github/workflows/deploy.yml`

Triggers on every push to `main` (and can be manually triggered via `workflow_dispatch`). Two jobs:

1. **build** — checks out the repo, installs dependencies with `npm ci`, runs `npm run build`, and uploads `./out` as a Pages artifact.
2. **deploy** — downloads the artifact and publishes it. Requires the `pages` and `id-token` write permissions that are declared at the top of the workflow.

No secrets or environment variables need to be configured in the GitHub repo settings. The only thing that must be done once is enabling Pages in the repo:

> **Settings → Pages → Source → GitHub Actions**

After that, every push to `main` automatically deploys.

## basePath and the NEXT_PUBLIC_BASE_PATH env var

Because the site lives at `/camping-log-2` (not the root `/`), Next.js must know its base path so it generates correct asset URLs, `<Link>` hrefs, and `<Image>` src values.

### How it works

`next.config.ts` reads `process.env.GITHUB_ACTIONS`:

```typescript
const basePath = process.env.GITHUB_ACTIONS === 'true' ? '/camping-log-2' : '';

const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};
```

- **Local dev / local build**: `GITHUB_ACTIONS` is unset → `basePath` is `''` → site works at `http://localhost:3000`.
- **GitHub Actions build**: `GITHUB_ACTIONS=true` is injected automatically by the runner → `basePath` is `/camping-log-2` → all links and assets are correctly prefixed.

### What Next.js handles automatically

With `basePath` set, Next.js automatically prefixes:
- `<Link href="...">` → `next/link`
- `<Image src="...">` → `next/image`
- All `/_next/...` static asset references in the generated HTML

### What must be handled manually

Next.js does **not** rewrite bare `fetch()` calls or raw strings. Any place that constructs a URL to a file in `public/` or navigates imperatively must prefix with `process.env.NEXT_PUBLIC_BASE_PATH`:

```typescript
// Correct
fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/Full_PCT_Simplified.geojson`)

// Correct — imperative navigation (GlobalMap markers/event listeners)
window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/posts/${slug}`;

// Correct — innerHTML strings (GlobalMap info panel)
el.innerHTML = `<a href="${BASE}/posts/${slug}">Open map →</a>`;
```

Files with manual basePath handling:
- `pages/posts/[slug].tsx` — `fetch('/Full_PCT_Simplified.geojson')` and GPX fetch
- `src/components/GlobalMap.tsx` — GeoJSON fetch, GPX fetch, `window.location.href`, inline `<a href>`

## Custom domain

If a custom domain is configured in GitHub Pages:

1. Remove (or set to `''`) the `basePath` and `NEXT_PUBLIC_BASE_PATH` in `next.config.ts` — the site serves from root, no prefix needed.
2. Add a `CNAME` file to `public/` with the domain name.
3. Update the `basePath`-prefixed fetch calls back to plain `/Full_PCT_Simplified.geojson` etc.

## Static export constraints

Because `output: 'export'` generates plain HTML files:

- **`next start` does not work** after a build — use `npx serve out` or any static file server locally.
- **No server-side features**: no API routes, no `getServerSideProps`, no ISR (`revalidate`). Only `getStaticProps` and `getStaticPaths` are valid.
- **`[slug]` pages** must export `getStaticPaths` with `fallback: false` so every path is pre-rendered at build time. The slugs come from `POSTS` in `src/data/posts.ts`.
- **`next/image` optimization** is disabled (`images: { unoptimized: true }`) because the optimizer requires a server.
- Map components (`Map3D`, `GlobalMap`) are loaded with `dynamic(..., { ssr: false })` so MapLibre (which needs `window`) is never imported during the static render pass.

## Build output

```
./out/
  index.html                          ← Home page
  map.html                            ← Full-trail map
  gear.html                           ← Gear list
  route.html                          ← Route info
  posts/
    echo-lake-to-sierra-city.html     ← One file per slug in POSTS
  _next/                              ← Hashed JS/CSS bundles
  Full_PCT_Simplified.geojson         ← Copied from public/
  gpx/                                ← Copied from public/gpx/
```
