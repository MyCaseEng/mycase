import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Word templates (~200 KB each) are uploaded through a Server Action
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
    // keep a visited page in the browser for 30 s: going back to it (e.g. cases ↔ schedule) is instant.
    // Any save clears this cache, so edits are never hidden.
    staleTimes: { dynamic: 30 },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
