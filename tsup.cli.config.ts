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
    target: "es2021",
  },
  // Supporting files needed by CLI
  {
    entry: ["src/repl.ts", "src/compliance-suite.ts", "src/processor/index.ts", "src/types.ts"],
    format: ["esm"],
    outDir: "dist",
    external: ["node:fs", "node:path", "chalk", "readline-sync"],
    dts: true,
    sourcemap: true,
    treeshake: true,
    tsconfig: "tsconfig.build.json",
    target: "es2021",
  },
]);
