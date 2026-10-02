import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.supabase.in",
      },
      {
        protocol: "https",
        hostname: "witscsd.co.za",
      },
      {
        protocol: "https",
        hostname: "www.witscsd.co.za",
      },
    ],
  },
};

export default nextConfig;
