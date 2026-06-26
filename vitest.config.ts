import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    // Mirror the "@/..." path alias used across the app.
    alias: [{ find: /^@\//, replacement: `${dir}/` }],
  },
});
