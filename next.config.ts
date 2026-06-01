import type { NextConfig } from "next";

// Only apply basePath when building in GitHub Actions (the deployed site lives at /camping-log-2).
// Local dev and local builds work without a prefix.
const basePath = process.env.GITHUB_ACTIONS === 'true' ? '/camping-log-2' : '';

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
