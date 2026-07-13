/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow leaflet images from CDN
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'unpkg.com',
      },
    ],
  },
};

export default nextConfig;
