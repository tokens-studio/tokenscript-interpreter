import type { Config } from "@stencil/core";

export const config: Config = {
  namespace: "token-input",
  outputTargets: [
    {
      type: "dist",
      esmLoaderPath: "../loader",
    },
    {
      type: "dist-custom-elements",
      customElementsExportBehavior: "auto-define-custom-elements",
      externalRuntime: false,
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
  },
};
