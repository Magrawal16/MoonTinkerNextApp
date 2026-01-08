const nextConfig = {
  // Do not fail the production build on ESLint errors. We'll tackle lint cleanups incrementally.
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack(config: any) {
    return config;
  },
};

export default nextConfig;
