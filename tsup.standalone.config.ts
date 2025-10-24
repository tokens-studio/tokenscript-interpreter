import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/standalone.ts"],
  format: ["esm", "cjs", "iife"],
  outDir: "dist/standalone",
  noExternal: [/.*/],
  dts: true,
  sourcemap: true,
  treeshake: true,
  tsconfig: "tsconfig.build.json",
  target: "es2021",
  splitting: false,
  bundle: true,
  globalName: "TokenScript",
  clean: true,
  minify: false,
});
