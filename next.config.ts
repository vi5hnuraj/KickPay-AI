import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  
  reactStrictMode: false, // Prevents double-mounting in dev that compounds polling intervals
  transpilePackages: [
    "@/lib/shared-types",
    "@/lib/sync-adapter",
    "@/lib/wallet-adapter",
  ],
  webpack: (config, { isServer }) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },
};

export default nextConfig;
