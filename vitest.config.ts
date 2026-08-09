import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    // The first test in a file pays the initial module-transform cost for the
    // route under test; on slower filesystems/CI that alone can blow the 5s
    // default and fail an otherwise-passing test.
    testTimeout: 30_000,
  },
  resolve: {
    // Mirror the "@/..." path alias used across the app.
    alias: [{ find: /^@\//, replacement: `${dir}/` }],
  },
});
