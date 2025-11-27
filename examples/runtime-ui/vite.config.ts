import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    host: true,
    fs: {
      allow: ["../../"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tokens-studio/tokenscript-interpreter": path.resolve(__dirname, "../../dist/lib/index.js"),
    },
  },
  // Ensure the library is not pre-bundled so changes are picked up immediately
  optimizeDeps: {
    exclude: ["@tokens-studio/tokenscript-interpreter", "@tokenscript/stencil-components"],
  },
  build: {
    rollupOptions: {
      external: [],
    },
  },
});
