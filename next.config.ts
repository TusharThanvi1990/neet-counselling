import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The dataset is read from disk at runtime; make sure deploys ship it with every server function.
  outputFileTracingIncludes: { '/**': ['./data/pgdata.json'] },
};

export default nextConfig;
