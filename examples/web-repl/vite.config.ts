import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    fs: {
      // Allow serving files from outside the project root
      allow: ["../../"],
    },
  },
  resolve: {
    alias: {
      // Point directly to the source files instead of built files for HMR
      "@tokens-studio/tokenscript-interpreter": path.resolve(__dirname, "../../src/lib/index.ts"),
      // Mirror the main library's path aliases for proper resolution
      "@src": path.resolve(__dirname, "../../src"),
      "@interpreter": path.resolve(__dirname, "../../src/interpreter"),
      "@": path.resolve(__dirname, "../../"),
    },
  },
  // Ensure the library is not pre-bundled so changes are picked up immediately
  optimizeDeps: {
    exclude: ["@tokens-studio/tokenscript-interpreter"],
  },
});
