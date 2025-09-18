import { defineConfig } from "tsup";

export default defineConfig([
  // Library build
  {
    entry: ["src/lib/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: "dist/lib",
    external: ["node:fs", "node:path", "node:url"],
    treeshake: true,
    tsconfig: "tsconfig.build.json",
  },
  // CLI build
  {
    entry: ["src/cli.ts"],
    format: ["esm"],
    dts: true,
    sourcemap: true,
    outDir: "dist",
    external: ["yauzl", "chalk", "commander", "readline-sync"],
    treeshake: true,
    tsconfig: "tsconfig.build.json",
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
  // Supporting files needed by CLI
  {
    entry: ["src/compliance-suite.ts", "src/tokenset-processor.ts", "src/types.ts"],
    format: ["esm"],
    dts: true,
    sourcemap: true,
    outDir: "dist",
    external: ["node:fs", "node:path", "chalk"],
    treeshake: true,
    tsconfig: "tsconfig.build.json",
  },
]);
