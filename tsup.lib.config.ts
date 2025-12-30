import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/lib/index.ts",
    interpreter: "src/lib/interpreter.ts",
    processor: "src/lib/processor.ts",
    "processor-node": "src/lib/processor-node.ts",
    schema: "src/lib/schema.ts",
    types: "src/lib/types.ts",
    "syntax-highlighting": "src/syntax-highlighter/index.ts",
  },
  format: ["esm", "cjs"],
  clean: true,
  outDir: "dist/lib",
  external: ["node:fs", "node:path", "node:url", "yauzl", "readline-sync"],
  noExternal: ["arktype"],
  dts: true,
  sourcemap: true,
  treeshake: true,
  tsconfig: "tsconfig.build.json",
  target: "es2021",
  // Enable code splitting to extract shared code into chunks
  // This prevents class duplication across bundles and ensures that
  // imports from different entry points reference the same class instances
  splitting: true,
  keepNames: true,
});
