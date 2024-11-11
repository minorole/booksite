import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/auth/callback',
        destination: '/',
        permanent: false,
      },
    ]
  }
};

export default nextConfig;
