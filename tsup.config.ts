import { defineConfig } from "tsup";

// This config is used for watch mode - use separate configs for production builds
const sharedConfig = {
  sourcemap: true,
  treeshake: true,
  tsconfig: "tsconfig.build.json",
};

export default defineConfig([
  // Library build - build first to ensure types are available
  {
    entry: ["src/lib/index.ts"],
    format: ["esm", "cjs"],
    clean: true,
    outDir: "dist/lib",
    external: ["node:fs", "node:path", "node:url"],
    dts: true,
    ...sharedConfig,
  },
  // CLI build - depends on library types
  {
    entry: ["src/cli.ts"],
    format: ["esm"],
    outDir: "dist",
    external: ["yauzl", "chalk", "commander", "readline-sync"],
    banner: {
      js: "#!/usr/bin/env node",
    },
    dts: true,
    ...sharedConfig,
  },
  // Supporting files needed by CLI
  {
    entry: ["src/compliance-suite.ts", "src/tokenset-processor.ts", "src/types.ts"],
    format: ["esm"],
    outDir: "dist",
    external: ["node:fs", "node:path", "chalk"],
    dts: true,
    ...sharedConfig,
  },
]);
