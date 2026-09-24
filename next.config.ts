import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.googleusercontent.com" }],
  },
  experimental: {
    cpus: process.platform === "win32" ? 1 : undefined,
  },
};

export default nextConfig;
