import type { ColorSpecification } from "@tokens-studio/tokenscript-interpreter";
import cssColorSpec from "../../../../data/specifications/colors/css-color.json";

type Specs = Map<string, ColorSpecification>;

export const DEFAULT_COLOR_SCHEMAS: Specs = new Map([
  [
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/css-color/0/",
    cssColorSpec as ColorSpecification,
  ],
]);
