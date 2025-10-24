import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/standalone-cli.ts"],
  format: ["esm"],
  outDir: "dist/standalone",
  noExternal: [/.*/],
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
