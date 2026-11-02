import type { NextConfig } from "next";

// The browser only ever talks to this Next.js origin. /api/* is proxied to FastAPI, so auth cookies
// are first-party and no CORS is involved.
const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:8800";

const nextConfig: NextConfig = {
  // Search, retailer verification and ranking can outlast the default proxy timeout.
  experimental: { proxyTimeout: 180_000 },
  // Keeps the floating dev badge out of screenshots and demo recordings; error overlays still show.
  devIndicators: false,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
