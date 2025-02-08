import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      'firebasestorage.googleapis.com',
      'cursorapp-df6ac.firebasestorage.app'
    ],
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  }
};

export default nextConfig;
