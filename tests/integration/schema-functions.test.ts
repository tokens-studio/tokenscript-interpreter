import { Config } from "@interpreter/config";
import type { ColorSpecification } from "@interpreter/config/managers/color/schema";
import type { FunctionSpecification } from "@interpreter/config/managers/functions/schema";
import { ListSymbol } from "@interpreter/symbols";
import { processTokens } from "@src/processor/process";
import { cleanupTempDir, createTestContext, setupTempDir } from "@tests/integration/helpers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const OKLCH_COLOR_SCHEMA: ColorSpecification = {
  name: "OKLCH",
  type: "color",
  schema: {
    type: "object",
    order: ["l", "c", "h"],
    required: ["l", "c", "h"],
    properties: {
      c: { type: "number" },
      h: { type: "number" },
      l: { type: "number" },
    },
    additionalProperties: false,
  },
  conversions: [
    {
      script: {
        type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/",
        script: ` variable color_parts: List = {input}.to_string().split('#'); 
 variable color: List = color_parts.get(1).split(); 
 variable length: Number = color.length(); 
 variable rgb: List = 0, 0, 0; 
 
 // Parse hex to RGB 
 if(length == 3) [ 
 rgb.update(0, parse_int(color.get(0).concat(color.get(0)), 16) / 255); 
 rgb.update(1, parse_int(color.get(1).concat(color.get(1)), 16) / 255); 
 rgb.update(2, parse_int(color.get(2).concat(color.get(2)), 16) / 255); 
 ] else [ 
 rgb.update(0, parse_int(color.get(0).concat(color.get(1)), 16) / 255); 
 rgb.update(1, parse_int(color.get(2).concat(color.get(3)), 16) / 255); 
 rgb.update(2, parse_int(color.get(4).concat(color.get(5)), 16) / 255); 
 ]; 
 
 // RGB to linear RGB 
 variable r: Number = rgb.get(0); 
 variable g: Number = rgb.get(1); 
 variable b: Number = rgb.get(2); 
 
 if(r <= 0.04045) [ r = r / 12.92; ] else [ r = pow((r + 0.055) / 1.055, 2.4); ]; 
 if(g <= 0.04045) [ g = g / 12.92; ] else [ g = pow((g + 0.055) / 1.055, 2.4); ]; 
 if(b <= 0.04045) [ b = b / 12.92; ] else [ b = pow((b + 0.055) / 1.055, 2.4); ]; 
 
 // Linear RGB to XYZ (sRGB D65) 
 variable x: Number = r * 0.4124564 + g * 0.3575761 + b * 0.1804375; 
 variable y: Number = r * 0.2126729 + g * 0.7151522 + b * 0.0721750; 
 variable z: Number = r * 0.0193339 + g * 0.1191920 + b * 0.9503041; 
 
 // XYZ to OKLab 
 variable l_: Number = pow(0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z, 1/3); 
 variable m_: Number = pow(0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z, 1/3); 
 variable s_: Number = pow(0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z, 1/3); 
 
 variable lab_l: Number = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_; 
 variable lab_a: Number = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_; 
 variable lab_b: Number = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_; 
 
 // OKLab to OKLCH 
 variable lch_l: Number = lab_l; 
 variable lch_c: Number = sqrt(lab_a * lab_a + lab_b * lab_b); 
 variable lch_h: Number = atan2(lab_b, lab_a) * 180 / 3.14159265359; 
 
 if(lch_h < 0) [ lch_h = lch_h + 360; ]; 
 
 variable output: Color.OKLCH; 
 output.l = lch_l; 
 output.c = lch_c; 
 output.h = lch_h; 
 
 return output; 
`,
      },
      source: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/hex-color/0/",
      target: "$self",
      lossless: true,
      description: "Converts HEX to OKLCH",
    },
    {
      script: {
        type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/",
        script: ` // OKLCH to OKLab 
 variable lch_l: Number = {input}.l; 
 variable lch_c: Number = {input}.c; 
 variable lch_h: Number = {input}.h; 
 
 variable h_rad: Number = lch_h * 3.14159265359 / 180; 
 variable lab_l: Number = lch_l; 
 variable lab_a: Number = lch_c * cos(h_rad); 
 variable lab_b: Number = lch_c * sin(h_rad); 
 
 // OKLab to XYZ 
 variable l_: Number = lab_l + 0.3963377774 * lab_a + 0.2158037573 * lab_b; 
 variable m_: Number = lab_l - 0.1055613458 * lab_a - 0.0638541728 * lab_b; 
 variable s_: Number = lab_l - 0.0894841775 * lab_a - 1.2914855480 * lab_b; 
 
 variable l3: Number = l_ * l_ * l_; 
 variable m3: Number = m_ * m_ * m_; 
 variable s3: Number = s_ * s_ * s_; 
 
 variable x: Number = 1.2268798733 * l3 - 0.5578149965 * m3 + 0.2813910456 * s3; 
 variable y: Number = -0.0405801784 * l3 + 1.1122568696 * m3 - 0.0716766787 * s3; 
 variable z: Number = -0.0763812845 * l3 - 0.4214819784 * m3 + 1.5861632204 * s3; 
 
 // XYZ to linear RGB (sRGB D65) 
 variable r: Number = x * 3.2404542 - y * 1.5371385 - z * 0.4985314; 
 variable g: Number = -x * 0.9692660 + y * 1.8760108 + z * 0.0415560; 
 variable b: Number = x * 0.0556434 - y * 0.2040259 + z * 1.0572252; 
 
 // Linear RGB to RGB 
 if(r <= 0.0031308) [ r = r * 12.92; ] else [ r = 1.055 * pow(r, 1/2.4) - 0.055; ]; 
 if(g <= 0.0031308) [ g = g * 12.92; ] else [ g = 1.055 * pow(g, 1/2.4) - 0.055; ]; 
 if(b <= 0.0031308) [ b = b * 12.92; ] else [ b = 1.055 * pow(b, 1/2.4) - 0.055; ]; 
 
 // Clamp values 
 if(r < 0) [ r = 0; ]; if(r > 1) [ r = 1; ]; 
 if(g < 0) [ g = 0; ]; if(g > 1) [ g = 1; ]; 
 if(b < 0) [ b = 0; ]; if(b > 1) [ b = 1; ]; 
 
 // RGB to HEX 
 variable rgb_values: List = r * 255, g * 255, b * 255; 
 variable hex: String = "#"; 
 variable i: Number = 0; 
 variable value: Number = 0; 
 
 while(i < 3) [ 
 value = floor(rgb_values.get(i) + 0.5); 
 if(value < 16) [ 
 hex = hex.concat("0").concat(value.to_string(16)); 
 ] else [ 
 hex = hex.concat(value.to_string(16)); 
 ]; 
 i = i + 1; 
 ]; 
 
 return hex; 
`,
      },
      source: "$self",
      target: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/hex-color/0/",
      lossless: true,
      description: "Converts OKLCH to HEX",
    },
  ],
  description: "OKLCH color space - polar form of OKLab by Björn Ottosson with Lightness, Chroma, and Hue",
  initializers: [
    {
      title: "function",
      schema: {
        type: "string",
        pattern: "^oklch\\(([0-1](?:\\.\\d+)?),\\s*([0-1](?:\\.\\d+)?),\\s*(\\d{1,3}(?:\\.\\d+)?)\\)$",
      },
      script: {
        type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/",
        script: `variable color_parts: List = {input}; 
 variable output: Color.OKLCH;
 output.l = color_parts.get(0);
 output.c = color_parts.get(1);
 output.h = color_parts.get(2);
 return output;`,
      },
      keyword: "oklch",
      description: "Creates an OKLCH color from string",
    },
  ],
};

const RAMP_FUNCTION_SCHEMA: FunctionSpecification = {
  name: "OKLCH Ramp",
  type: "function",
  keyword: "ramp",
  input: {
    type: "object",
    properties: {
      from: {
        type: "color",
        description: "",
      },
      steps: {
        type: "number",
      },
    },
  },
  description: "Creates a perceptually uniform lightness ramp from a base OKLCH color.",
  script: {
    type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/",
    script: `variable args: List = {input};
variable baseColor: Color.Oklch = args.get(0).to.oklch();
variable steps: Number = args.get(1);
variable ramp: Dictionary;
variable i: Number = 0;

variable divisor: Number = max(steps - 1, 1);
variable stepColor: Color.Oklch;
variable lightness: Number;

while (i < steps) [
  lightness = 0.1 + ((i / divisor) * 0.8);
  stepColor = oklch(lightness, baseColor.c, baseColor.h);
  ramp.set(i.to_string(), stepColor);
  i = i + 1;
];

return ramp.values();`,
  },
  requirements: ["https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/oklch-color/0.1.0/"],
};

const INVERT_LIST_FUNCTION_SCHEMA: FunctionSpecification = {
  name: "Invert List",
  type: "function",
  keyword: "invert_list",
  description: "Inverts every color in a provided list or dictionary of colors.",
  input: {
    type: "object",
    properties: {
      elements: {
        type: "list",
        description: "",
      },
    },
  },

  script: {
    type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/",
    script: `variable args: List = {input};
variable items: List = args.get(0);

variable index: Number = 0;
variable current: Color.Oklch;
variable result: List;

while (index < items.length()) [
  current = items.get(index);
  current = oklch(1 - current.l, current.c, mod(current.h + 180, 360));
  result.append(current);
  index = index + 1;
];

return result;`,
  },
  requirements: ["https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/oklch-color/0.1.0/"],
};

const SCHEMA_REGISTRATIONS: Array<{
  uri: string;
  schema: ColorSpecification | FunctionSpecification;
}> = [
  {
    uri: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/oklch-color/0.1.0/",
    schema: OKLCH_COLOR_SCHEMA,
  },
  {
    uri: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/function/ramp/0.1.0/",
    schema: RAMP_FUNCTION_SCHEMA,
  },
  {
    uri: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/function/invert-list/0.1.0/",
    schema: INVERT_LIST_FUNCTION_SCHEMA,
  },
];

const ctx = createTestContext("schema-functions");

describe("Schema Function Integration", () => {
  beforeEach(async () => {
    await setupTempDir(ctx.tempDir);
  });

  afterEach(async () => {
    await cleanupTempDir(ctx.tempDir);
  });

  it("should invert colors generated from schema-defined ramp list", async () => {
    const tokens = new Map([
      ["light", "ramp(#FFFFFF, 10)"],
      ["dark", "invert_list({light})"],
      ["lightBack", "invert_list({dark})"],
    ]);

    const config = new Config();
    config.registerSchemas(SCHEMA_REGISTRATIONS);

    const result = processTokens(tokens, { config, output: "symbols" });

    const lightList = result.tokens.get("light");
    const darkList = result.tokens.get("dark");
    const lightBack = result.tokens.get("lightBack");

    expect(lightList).toBeInstanceOf(ListSymbol);
    expect(darkList).toBeInstanceOf(ListSymbol);

    const _lightValues = (lightList as ListSymbol).elements.map((symbol) => symbol.toString());
    const _darkValues = (darkList as ListSymbol).elements.map((symbol) => symbol.toString());

    const from = lightList.elements.map((x) => x.value)[0];
    const to = lightBack.elements.map((x) => x.value)[0];

    // Use toBeCloseTo for floating point comparisons to account for rounding errors
    // Default precision is 2 decimal places, adjust if needed
    expect(from.l.value).toBeCloseTo(to.l.value);

    expect(from.c.value).toBe(to.c.value);
    expect(from.h.value).toBe(to.h.value);

    // expect(lightValues).toHaveLength(10);
    // expect(darkValues).toHaveLength(10);
    // for (const color of [...lightValues, ...darkValues]) {
    //   expect(color).toMatch(/^#[0-9a-f]{6}$/);
    // }

    // const expectedDark = lightValues.map(invertHex);
    // expect(darkValues).toEqual(expectedDark);
  });
});

function _invertHex(hex: string): string {
  const trimmed = hex.trim().replace(/^#/, "");
  const expanded =
    trimmed.length === 3
      ? trimmed
          .split("")
          .map((char) => char.repeat(2))
          .join("")
      : trimmed.slice(0, 6).padEnd(6, "0");

  const inverted = [0, 1, 2]
    .map((index) => expanded.slice(index * 2, index * 2 + 2))
    .map((pair) => (255 - Number.parseInt(pair, 16)).toString(16).padStart(2, "0"))
    .join("");

  return `#${inverted}`;
}
