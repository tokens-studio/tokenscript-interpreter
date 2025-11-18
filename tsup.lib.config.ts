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
  dts: true,
  sourcemap: true,
  treeshake: true,
  tsconfig: "tsconfig.build.json",
  target: "es2021",
  splitting: false,
});
