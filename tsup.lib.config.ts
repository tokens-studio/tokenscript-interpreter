import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/lib/index.ts",
    interpreter: "src/lib/interpreter.ts",
    processors: "src/lib/processors.ts",
    schema: "src/lib/schema.ts",
    types: "src/lib/types.ts",
  },
  format: ["esm", "cjs"],
  clean: true,
  outDir: "dist/lib",
  external: ["node:fs", "node:path", "node:url"],
  dts: true,
  sourcemap: true,
  treeshake: true,
  tsconfig: "tsconfig.build.json",
  target: "es2021",
  splitting: false,
});
