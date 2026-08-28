/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/fixitcenter',
  assetPrefix: '/fixitcenter',
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    return [
      {
        // /fixitcenter/api/:path* → http://api:3001/api/:path* (internal Docker network)
        source: '/api/:path*',
        destination: 'http://api:3001/api/:path*',
      },
      {
        // /fixitcenter/ws/:path* → http://api:3001/ws/:path* (internal Docker network)
        source: '/ws/:path*',
        destination: 'http://api:3001/ws/:path*',
      },
    ];
  },
};

export default nextConfig;
