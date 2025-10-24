import { defineConfig } from "tsup";

export default defineConfig([
  // CLI build with all dependencies bundled
  {
    entry: ["src/cli.ts"],
    format: ["esm"],
    outDir: "dist",
    noExternal: [/.*/],
    banner: {
      js: "#!/usr/bin/env node",
    },
    dts: true,
    sourcemap: true,
    treeshake: true,
    tsconfig: "tsconfig.build.json",
    target: "es2021",
    splitting: false,
    bundle: true,
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
    target: "es2021",
  },
]);
