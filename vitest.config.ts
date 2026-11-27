import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@voicekhata/shared": path.resolve(import.meta.dirname, "packages/shared/src/index.ts"),
      "@voicekhata/db": path.resolve(import.meta.dirname, "packages/db/src/index.ts")
    }
  },
  test: {
    environment: "node",
    include: [
      "packages/**/*.test.ts",
      "apps/api/**/*.test.ts",
      "tests/integration/**/*.test.ts"
    ]
  }
});
