import type { Config } from "@stencil/core";

export const config: Config = {
  namespace: "token-input",
  outputTargets: [
    {
      type: "dist-custom-elements",
      customElementsExportBehavior: "auto-define-custom-elements",
      externalRuntime: false,
      autoDefineCustomElements: true,
    },
    {
      type: "docs-readme",
    },
    {
      type: "www",
      serviceWorker: null, // disable service workers
      copy: [{ src: "index.html" }],
    },
  ],
  devServer: {
    reloadStrategy: "hmr",
    openBrowser: false,
  },
  testing: {
    browserHeadless: "shell",
    transformIgnorePatterns: ["/node_modules/(?!(@tokens-studio|arktype)/)"],
  },
};
