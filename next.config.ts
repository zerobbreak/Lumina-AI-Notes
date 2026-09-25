import type { NextConfig } from "next";

// Origin of the Express API, e.g. https://lumina-api-production-beed.up.railway.app.
// When set, /api/v1/* is proxied to it so the browser calls the API on its own
// origin: no CORS preflight before each new URL, which cost a full round trip.
// Point NEXT_PUBLIC_API_URL at "/api/v1" to use it. The Electron shell loads
// this same deployed site, so it goes through the rewrite too.
const apiProxyTarget = process.env.API_PROXY_TARGET?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  ...(apiProxyTarget && {
    async rewrites() {
      return [{ source: "/api/v1/:path*", destination: `${apiProxyTarget}/api/v1/:path*` }];
    },
  }),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
      },
      {
        protocol: "https",
        hostname: "*.uploadthing.com",
      },
      {
        protocol: "https",
        hostname: "uploadthing.com",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "github.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default nextConfig;
