/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ws (used by the Neon serverless driver adapter) requires bufferutil
  // optionally at runtime and falls back to a pure-JS implementation when it's
  // absent. If webpack bundles `ws` for the server runtime instead of leaving
  // it as a real Node require, that fallback breaks — bufferutil resolves to
  // an empty stub instead of throwing MODULE_NOT_FOUND, so `ws` calls
  // `bufferUtil.mask()` on it and crashes every DB write with
  // "TypeError: bufferUtil.mask is not a function". Keep these external so
  // Node's own module resolution (and ws's try/catch) handles it correctly.
  serverExternalPackages: ["ws", "bufferutil", "utf-8-validate"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
