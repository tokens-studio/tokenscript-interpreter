import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
      "@src": resolve(__dirname, "src"),
      "@interpreter": resolve(__dirname, "src/interpreter"),
    },
  },
});
