/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Lint only server-critical codepaths during build to keep strict gating fast
    dirs: ['src/app/api', 'src/lib/db', 'src/lib/security', 'src/lib/supabase.ts', 'src/middleware.ts'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/models/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/draco/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
};

module.exports = nextConfig; 
