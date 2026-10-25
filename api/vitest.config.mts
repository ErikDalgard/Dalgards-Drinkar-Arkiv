import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
export default defineWorkersConfig({ test: { poolOptions: { workers: {
  main: "./src/index.ts",
  isolatedStorage: true,
  // No Wrangler config, real database IDs, remote bindings, or real secrets.
  miniflare: {
    compatibilityDate: "2026-08-13", compatibilityFlags: ["nodejs_compat"],
    d1Databases: ["DB"], r2Buckets: ["MEDIA"],
    bindings: { ADMIN_KEY: "test-only-admin-key" },
  },
} } } });
