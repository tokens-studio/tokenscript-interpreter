import type { TokenFormData } from "@tokenscript/stencil-components";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "token-form": {
        ref?: React.Ref<HTMLElement & { tokenTypes: string[]; initialData?: TokenFormData }>;
        class?: string;
      };
    }
  }
}

export {};
