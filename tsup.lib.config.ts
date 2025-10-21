import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/lib/index.ts"],
  format: ["esm", "cjs"],
  clean: true,
  outDir: "dist/lib",
  external: ["node:fs", "node:path", "node:url"],
  dts: true,
  sourcemap: true,
  treeshake: true,
  tsconfig: "tsconfig.build.json",
  target: "es2021",
});
