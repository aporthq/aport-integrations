/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable middleware in edge runtime for better performance
    middlewareSourceMaps: true,
  },
  // Ensure proper TypeScript support
  typescript: {
    ignoreBuildErrors: false,
  },
  // Enable ESLint during builds
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Optimize for Vercel deployment
  output: 'standalone',
  // Configure API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Agent-ID, X-APort-Agent-ID',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
