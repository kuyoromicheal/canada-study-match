import type { NextConfig } from "next";

// Vercel requires the default .next output. Use dist/ + standalone only for local/VPS builds.
const isVercel = process.env.VERCEL === "1";

const nextConfig: NextConfig = isVercel
  ? {}
  : {
      distDir: "dist",
      output: "standalone",
    };

export default nextConfig;
