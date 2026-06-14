import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Use empty turbopack config to acknowledge Turbopack usage (Next.js 16 default)
  turbopack: {},
  // sharp is a native binary — must not be bundled by Turbopack
  serverExternalPackages: ["sharp"],
};

export default nextConfig;

