import type { NextConfig } from "next";

/**
 * Security headers applied to every response.
 * NOTE: we deliberately avoid a strict CSP with `unsafe-inline` removed because the
 * CMS lets a Super Admin inject custom CSS/JS (see Admin -> Advanced Settings).
 * If you disable that feature (ALLOW_CUSTOM_SCRIPTS=false), you can tighten CSP further.
 */
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    // Runtime media is served by the /media route handler, not from /public.
    localPatterns: [
      { pathname: "/media/**" },
      { pathname: "/assets/**" },
    ],
  },
  experimental: {
    optimizePackageImports: ["framer-motion"],
  },
  // src/lib/brand.ts probes public/assets/logo for a committed logo file. On a
  // serverless host /public is served by the static layer and is NOT part of the
  // function's filesystem, so that probe would find nothing and the logo would
  // silently vanish. Tracing the folder into the bundle keeps the check honest.
  outputFileTracingIncludes: {
    "/**": ["./public/assets/logo/**"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Uploaded media is user content: never let the browser sniff it into a
      // script. (The /media route sets these itself; this covers the optimiser.)
      {
        source: "/media/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Disposition", value: "inline" },
        ],
      },
    ];
  },
};

export default nextConfig;
