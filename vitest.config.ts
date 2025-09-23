import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**", "examples/**/tests/e2e/**"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
      "@src": resolve(__dirname, "src"),
      "@interpreter": resolve(__dirname, "src/interpreter"),
    },
  },
});
