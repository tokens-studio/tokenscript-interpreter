import type { ColorSpecification } from "@tokens-studio/tokenscript-interpreter";
import cssColorSpec from "../../../../data/specifications/colors/css-color.json";
import hslSpec from "../../../../data/specifications/colors/hsl.json";
import lrgbSpec from "../../../../data/specifications/colors/lrgb.json";
import rgbSpec from "../../../../data/specifications/colors/rgb.json";
import rgbaSpec from "../../../../data/specifications/colors/rgba.json";
import srgbSpec from "../../../../data/specifications/colors/srgb.json";

// Using Specs type (Map) from ColorManager
type Specs = Map<string, ColorSpecification>;

export const DEFAULT_COLOR_SCHEMAS: Specs = new Map([
  [
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0/",
    rgbSpec as ColorSpecification,
  ],
  [
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0/",
    hslSpec as ColorSpecification,
  ],
  [
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0/",
    srgbSpec as ColorSpecification,
  ],
  [
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgba-color/0/",
    rgbaSpec as ColorSpecification,
  ],
  [
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/lrgb-color/0/",
    lrgbSpec as ColorSpecification,
  ],
  [
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/css-color/0/",
    cssColorSpec as ColorSpecification,
  ],
]);
