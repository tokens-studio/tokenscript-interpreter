import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
  server: {
    port: 3000,
    host: true,
    fs: {
      // Allow serving files from outside the project root
      allow: ["../../"],
    },
    proxy: {
      // Proxy API requests to avoid CORS issues
      "/api/schema": {
        target: "https://schema.tokenscript.dev.gcp.tokens.studio",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/schema/, ""),
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("proxy error", err);
          });
          proxy.on("proxyReq", (_proxyReq, req, _res) => {
            console.log("Sending Request to the Target:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log("Received Response from the Target:", proxyRes.statusCode, req.url);
          });
        },
      },
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
