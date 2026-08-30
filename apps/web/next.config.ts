import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Docker production image uses standalone output. Vercel provides its own Next.js runtime.
  output: process.env.VERCEL ? undefined : 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'crests.football-data.org' },
      { protocol: 'https', hostname: 'images.fotmob.com' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
    ],
  },
};

export default nextConfig;
