import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'crests.football-data.org' },
      { protocol: 'https', hostname: 'images.fotmob.com' },
    ],
  },
};

export default nextConfig;
