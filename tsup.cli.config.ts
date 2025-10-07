import { defineConfig } from "tsup";

export default defineConfig([
  // CLI build
  {
    entry: ["src/cli.ts"],
    format: ["esm"],
    outDir: "dist",
    external: ["yauzl", "chalk", "commander", "readline-sync"],
    banner: {
      js: "#!/usr/bin/env node",
    },
    dts: true,
    sourcemap: true,
    treeshake: true,
    tsconfig: "tsconfig.build.json",
  },
  // Supporting files needed by CLI
  {
    entry: ["src/compliance-suite.ts", "src/tokenset-processor.ts", "src/types.ts"],
    format: ["esm"],
    outDir: "dist",
    external: ["node:fs", "node:path", "chalk"],
    dts: true,
    sourcemap: true,
    treeshake: true,
    tsconfig: "tsconfig.build.json",
  },
]);
