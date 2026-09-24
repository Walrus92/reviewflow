import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    cpus: process.platform === "win32" ? 1 : undefined,
  },
};

export default nextConfig;
