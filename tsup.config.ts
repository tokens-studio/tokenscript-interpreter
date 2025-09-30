import { defineConfig } from "tsup";

const sharedConfig = {
  dts: true,
  sourcemap: true,
  treeshake: true,
  tsconfig: "tsconfig.build.json",
};

export default defineConfig([
  // Library build
  {
    entry: ["src/lib/index.ts"],
    format: ["esm", "cjs"],
    clean: true,
    outDir: "dist/lib",
    external: ["node:fs", "node:path", "node:url"],
    ...sharedConfig,
  },
  // CLI build
  {
    entry: ["src/cli.ts"],
    format: ["esm"],
    outDir: "dist",
    external: ["yauzl", "chalk", "commander", "readline-sync"],
    banner: {
      js: "#!/usr/bin/env node",
    },
    ...sharedConfig,
  },
  // Supporting files needed by CLI
  {
    entry: ["src/compliance-suite.ts", "src/tokenset-processor.ts", "src/types.ts"],
    format: ["esm"],
    outDir: "dist",
    external: ["node:fs", "node:path", "chalk"],
    ...sharedConfig,
  },
]);
