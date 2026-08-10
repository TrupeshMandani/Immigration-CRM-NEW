import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    // Monorepo root: pnpm hoists dependencies (incl. next) to the repo-root
    // .pnpm store, which lives outside apps/marketing. Pinning the root to the
    // app dir would leave those packages "outside" and unresolvable.
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
