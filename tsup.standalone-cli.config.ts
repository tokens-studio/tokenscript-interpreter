import { defineConfig } from "tsup";
import fs from "fs";

// Read polyfills content (JavaScript version)
const polyfillsContent = fs.readFileSync("src/standalone-polyfills.js", "utf8");

export default defineConfig({
  entry: ["src/standalone-cli.ts"],
  format: ["esm"],
  outDir: "dist/standalone",
  noExternal: [/.*/],
  banner: {
    js: `// QuickJS Polyfills - MUST run first
${polyfillsContent}

// Import QuickJS std module for file operations
import * as std from "std";
globalThis.std = std;`,
  },
  dts: false,
  sourcemap: false,
  treeshake: true,
  tsconfig: "tsconfig.build.json",
  target: "es2021",
  splitting: false,
  bundle: true,
  clean: false,
  minify: false,
  platform: "neutral",
});
