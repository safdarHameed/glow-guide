import type { NextConfig } from "next";

// The browser only ever talks to this Next.js origin. /api/* is proxied to FastAPI, so auth cookies
// are first-party and no CORS is involved.
const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:8800";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
