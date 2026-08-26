import type { NextConfig } from "next";

// Electron packaging bundles a real Next.js server (see electron/main.js and
// scripts/prepare-electron-server.js) rather than a static export — Clerk's
// App Router integration (ClerkProvider/<SignIn>/<SignUp>) ships its own
// internal Server Actions and isn't compatible with `output: "export"`.
const isElectronBuild = process.env.ELECTRON_BUILD === "true";

const nextConfig: NextConfig = {
  ...(isElectronBuild && {
    output: "standalone",
  }),
  images: {
    // No `sharp` bundled for the packaged app; the desktop shell doesn't
    // need Next's server-side image optimization pipeline anyway.
    unoptimized: isElectronBuild,
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
