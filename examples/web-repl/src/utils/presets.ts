export interface Preset {
  name: string;
  type: "code" | "json";
  code: string;
  dependencies?: string[];
}

const DEMO_PRESETS: Preset[] = [
  {
    name: "Demo 1: Color Variable",
    type: "code",
    code: `variable yellow: Color = #FF9900;

return yellow;`,
  },
  {
    name: "Demo 2: Color Method",
    type: "code",
    code: `variable yellow: Color = #FF9900;

return yellow.to.hsl();`,
    dependencies: [
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0.0.1/",
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0.0.1/",
    ],
  },
  {
    name: "Demo 3: HSL Color Variable",
    type: "code",
    code: `variable yellow: Color = #FF9900;
variable brandYellow: Color.Hsl = yellow.to.hsl();
return brandYellow;`,
    dependencies: [
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0.0.1/",
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0.0.1/",
    ],
  },
  {
    name: "Demo 4: Color Ramp Loop",
    type: "code",
    code: `variable yellow: Color = #FF9900;
variable brandYellow: Color.Hsl = yellow.to.hsl();
variable i: Number = 0;
variable max: Number = 10;
variable colorRamp: Dictionary;
while (i < max) [
  i = i + 1;
  colorRamp.set(i.toString(), hsl(brandYellow.h, brandYellow.s, i * (100 / max)));
]
return colorRamp.values();`,
    dependencies: [
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0.0.1/",
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0.0.1/",
    ],
  },
  {
    name: "Demo 5: Relative Darken Function",
    type: "code",
    code: `variable yellow: Color = #FF9900;
return relativeDarken(yellow, 10);`,
    dependencies: [
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0.0.1/",
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0.0.1/",
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/relative-darken/0.0.1/",
    ],
  },
  {
    name: "Demo 6: HSL Ramp Function",
    type: "code",
    code: `variable yellow: Color = #FF9900;
variable config: Dictionary;
config.set("steps", 10);
return hslRamp(yellow, config);`,
  },
  {
    name: "Demo 7: OKLCH Color Ramp",
    type: "code",
    code: `variable yellow: Color = #FF9900;
variable prettyRamp: Dictionary = oklchRamp(yellow.toOklch());
return prettyRamp;`,
  },
  {
    name: "Demo 8: Ramp to Hex Values",
    type: "code",
    code: `variable yellow: Color = #FF9900;
variable prettyRamp: Dictionary = oklchRamp(yellow.toOklch());
variable hexValues: List;
variable l: Number = 0;
while (l < prettyRamp.length) [
  hexValues.append(prettyRamp.values()[l].toHex());
  l = l + 1;
]
return hexValues;`,
  },
  {
    name: "Demo 9: Mixed Unit Addition",
    type: "code",
    code: `return 1rem + 1px + 10%;`,
  },
  {
    name: "Color palette",
    type: "code",
    code: `variable palette: List;
variable i: Number = 0;
variable max: Number = 10;
while(i < max) [
  i = i + 1;
  palette.append(hsl(220, 100, (i - 1) / (max - 1) * 100));
]

return palette;`,
  },
];

export const TOKENSCRIPT_PRESETS: Preset[] = [
  ...DEMO_PRESETS,
  {
    name: "Typography scale",
    type: "code",
    code: `variable baseSize: Number = 16;
variable ratio: Number = 1.25;
variable scale: Dictionary;

scale.set("xs", baseSize / (ratio * ratio));
scale.set("sm", baseSize / ratio);
scale.set("base", baseSize);
scale.set("lg", baseSize * ratio);
scale.set("xl", baseSize * ratio * ratio);
scale.set("xxl", baseSize * ratio * ratio * ratio);

return scale;`,
  },
  {
    name: "Unit Spacing system",
    type: "code",
    code: `variable base: NumberWithUnit = 8px;
variable spacing: Dictionary;

spacing.set("none", 0);
spacing.set("xs", base / 2);
spacing.set("sm", base);
spacing.set("md", base * 1.5);
spacing.set("lg", base * 2);
spacing.set("xl", base * 3);
spacing.set("xxl", base * 4);

return spacing;`,
  },
  {
    name: "Rainbow Color Scale",
    type: "code",
    code: `variable config: Dictionary;
config.set("steps", 10);
config.set("saturation", 255);
rainbow_color_scale(config).values();`,
    dependencies: [
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/test-color-scale-rainbow/0.0.1/",
    ],
  },
];

export const JSON_PRESETS: Preset[] = [
  {
    name: "Basic tokens",
    type: "json",
    code: `{
  "colors": {
    "primary": {
      "$type": "color",
      "$value": "#ff6b35"
    },
    "secondary": {
      "$type": "color", 
      "$value": "hsl(220, 100%, 50%)"
    },
    "accent": {
      "$type": "color",
      "$value": "{colors.primary}"
    }
  },
  "spacing": {
    "base": {
      "$type": "dimension",
      "$value": "8px"
    },
    "large": {
      "$type": "dimension", 
      "$value": "{spacing.base} * 2"
    }
  }
}`,
  },
  {
    name: "Design system",
    type: "json",
    code: `{
  "colors": {
    "brand": {
      "primary": {
        "$type": "color",
        "$value": "#2563eb"
      },
      "secondary": {
        "$type": "color",
        "$value": "#7c3aed"
      }
    },
    "neutral": {
      "50": {
        "$type": "color",
        "$value": "#f9fafb"
      },
      "900": {
        "$type": "color",
        "$value": "#111827"
      }
    }
  },
  "typography": {
    "font-size": {
      "sm": {
        "$type": "dimension",
        "$value": "14px"
      },
      "base": {
        "$type": "dimension",
        "$value": "16px"
      },
      "lg": {
        "$type": "dimension",
        "$value": "18px"
      }
    }
  },
  "spacing": {
    "4": {
      "$type": "dimension",
      "$value": "16px"
    },
    "8": {
      "$type": "dimension",
      "$value": "32px"
    }
  }
}`,
  },
];
