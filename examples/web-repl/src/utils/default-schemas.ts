import type { ColorSpecification } from "@tokens-studio/tokenscript-interpreter";
import cssColorSpec from "../../../../data/specifications/colors/css-color.json";
import hsl from "../../../../data/specifications/colors/hsl.json";
import srgb from "../../../../data/specifications/colors/srgb.json";

type Specs = Map<string, ColorSpecification>;

export const DEFAULT_COLOR_SCHEMAS: Specs = new Map([
  [
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/css-color/0/",
    cssColorSpec as ColorSpecification,
  ],
  [
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0.0.1/",
    hsl as ColorSpecification,
  ],
  [
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0.0.1/",
    srgb as ColorSpecification,
  ],
]);
