export interface Preset {
  name: string;
  type: "code" | "json";
  code: string;
  dependencies?: string[];
  clearDependencies?: boolean;
}

const DEMO_PRESETS: Preset[] = [
  {
    name: "Demo 1: Color Variable",
    type: "code",
    code: `variable yellow: Color = #FF9900;

return yellow;`,
    clearDependencies: true,
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
variable currentStep: Number = 0;
variable totalSteps: Number = 10;
variable colorRamp: Dictionary;

while (currentStep < totalSteps) [
  currentStep = currentStep + 1;
  colorRamp.set(currentStep.toString(), hsl(brandYellow.h, brandYellow.s, currentStep * (100 / totalSteps)));
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

return hslRamp(yellow, config).values();`,
    dependencies: [
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-ramp/0.0.1/",
    ],
  },
  {
    name: "Demo 7: OKLCH Color Ramp",
    type: "code",
    code: `variable yellow: Color = #FF9900;
variable prettyRamp: Dictionary = oklchRamp(yellow.to.oklch());

return prettyRamp.values();`,
    dependencies: [
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/oklch-ramp/0.0.1/",
    ],
  },
  {
    name: "Demo 8: Ramp to Hex Values",
    type: "code",
    code: `variable yellow: Color = #FF9900;
variable prettyRamp: List = oklchRamp(yellow.to.oklch()).values();

variable hexValues: List;
variable colorIndex: Number = 0;
variable currentColor: Color.Oklch;
while (colorIndex < prettyRamp.length()) [
  currentColor = prettyRamp.get(colorIndex);
  hexValues.append(currentColor.to.hex());
  colorIndex = colorIndex + 1;
]

return hexValues;`,
    dependencies: [
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/oklch-ramp/0.0.1/",
    ],
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
variable currentStep: Number = 0;
variable totalSteps: Number = 10;
while(currentStep < totalSteps) [
  currentStep = currentStep + 1;
  palette.append(hsl(220, 100, (currentStep - 1) / (totalSteps - 1) * 100));
]

return palette;`,
    dependencies: [
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0.0.1/",
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0.0.1/",
    ],
  },
];

export const TOKENSCRIPT_PRESETS: Preset[] = [
  ...DEMO_PRESETS,
  {
    name: "Typography scale",
    type: "code",
    code: `variable body: Number = 16;
variable ratio: Number = 1.25;
variable fontSizes: Dictionary;

// Headings (h1 largest to h6 same as body)
fontSizes.set("h1", roundTo(body * ratio^5));
fontSizes.set("h2", roundTo(body * ratio^4));
fontSizes.set("h3", roundTo(body * ratio^3));
fontSizes.set("h4", roundTo(body * ratio^2));
fontSizes.set("h5", roundTo(body * ratio^1));
fontSizes.set("h6", body);

// Body and smaller sizes
fontSizes.set("body", body);
fontSizes.set("sm", roundTo(body * 0.85));
fontSizes.set("xs", roundTo(body * 0.65));

return fontSizes;`,
  },
  {
    name: "Typography scale (snapped)",
    type: "code",
    code: `variable body: Number = 16;
variable ratio: Number = 1.25;
variable snapInterval: Number = 4;
variable fontSizes: Dictionary;

// Headings (h1 largest to h6 same as body) - snapped to 4px grid
fontSizes.set("h1", snap(body * ratio^5, snapInterval));
fontSizes.set("h2", snap(body * ratio^4, snapInterval));
fontSizes.set("h3", snap(body * ratio^3, snapInterval));
fontSizes.set("h4", snap(body * ratio^2, snapInterval));
fontSizes.set("h5", snap(body * ratio^1, snapInterval));
fontSizes.set("h6", body);

// Body and smaller sizes
fontSizes.set("body", body);
fontSizes.set("sm", snap(body * 0.85, snapInterval));
fontSizes.set("xs", snap(body * 0.65, snapInterval));

return fontSizes;`,
    dependencies: [
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/snap/0.0.1/",
    ],
  },
  {
    name: "Responsive Font Size (remap)",
    type: "code",
    code: `// Map viewport 768px to responsive font size
// Mobile (320px) = 16px, Desktop (1920px) = 48px
variable viewport: Number = 768;
variable fontSize: Number = remap(viewport, 320, 1920, 16, 48, 1);

return fontSize;`,
    dependencies: [
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/remap/0.0.1/",
    ],
  },
  {
    name: "Opacity from Percentage (remap)",
    type: "code",
    code: `// Map percentage (0-100) to opacity (0-1)
variable percentage: Number = 75;
variable opacity: Number = remap(percentage, 0, 100, 0, 1, 1);

return opacity;`,
    dependencies: [
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/remap/0.0.1/",
    ],
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
  {
    name: "Contrasting Text Color Finder",
    type: "code",
    code: `variable backgroundColor: Color = #1E40AF;

// Get the contrasting color - just pass the colors directly!
variable foregroundColor: Color;
foregroundColor = contrastColor(backgroundColor, #FFFFFF, #D1D5DB, #374151, #000000);

// Return background and foreground as list for visual display
variable output: List;
output.append(backgroundColor);
output.append(foregroundColor);

return output;`,
    dependencies: [
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0.0.1/",
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/contrast-color/0.0.1/",
    ],
  }
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
    "primary": {
      "base": {
        "$type": "color",
        "$value": "#000"
      },
      "on-base": {
        "$type": "color",
        "$value": "contrastColor({colors.primary.base}, #fff, #000)"
      }
    },
    "secondary": {
      "base": {
        "$type": "color",
        "$value": "#7c3aed"
      },
      "on-base": {
        "$type": "color",
        "$value": "contrastColor({colors.secondary.base}, #fff, #000)"
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
