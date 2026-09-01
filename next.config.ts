import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build output goes to ./dist instead of ./.next
  distDir: "dist",
  // Portable Node server bundle at dist/standalone (for VPS/Docker/manual deploy)
  output: "standalone",
};

export default nextConfig;
