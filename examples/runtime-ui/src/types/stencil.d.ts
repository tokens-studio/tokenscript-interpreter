import type { TokenFormData } from "@tokenscript/stencil-components";
import type { Config, TokenData } from "@tokens-studio/tokenscript-interpreter";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "token-form": {
        ref?: React.Ref<
          HTMLElement & {
            tokenTypes?: string[];
            initialData?: TokenFormData;
            allTokens?: Map<string, TokenData>;
            config?: Config;
            tokenType?: string;
          }
        >;
        class?: string;
      };
    }
  }
}

export {};
