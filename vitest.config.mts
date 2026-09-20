import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    // Mirrors the `@/*` alias from tsconfig so tests import the same way the app does.
    alias: { "@": path.resolve(import.meta.dirname, ".") },
  },
});
