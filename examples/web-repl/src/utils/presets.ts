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
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0.1.0/",
    ],
  },
  {
    name: "Demo 3: HSL Color Variable",
    type: "code",
    code: `variable yellow: Color = #FF9900;
variable brand_yellow: Color.Hsl = yellow.to.hsl();

return brand_yellow;`,
    dependencies: [
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0.0.1/",
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0.1.0/",
    ],
  },
  {
    name: "Demo 4: Color Ramp Loop",
    type: "code",
    code: `variable yellow: Color = #FF9900;
variable brand_yellow: Color.Hsl = yellow.to.hsl();
variable current_step: Number = 0;
variable total_steps: Number = 10;
variable color_ramp: Dictionary;

while (current_step < total_steps) [
  current_step = current_step + 1;
  color_ramp.set(current_step.to_string(), hsl(brand_yellow.h, brand_yellow.s, current_step * (100 / total_steps)));
]

return color_ramp.values();`,
    dependencies: [
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0.0.1/",
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0.1.0/",
    ],
  },
  {
    name: "Demo 5: Relative Darken Function",
    type: "code",
    code: `variable yellow: Color = #FF9900;

return relative_darken(yellow, 10);`,
    dependencies: [
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0.0.1/",
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0.1.0/",
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/relative-darken/0.1.0/",
    ],
  },
  {
    name: "Demo 6: HSL Ramp Function",
    type: "code",
    code: `variable yellow: Color = #FF9900;
variable config: Dictionary;
config.set("steps", 10);

return hsl_ramp(yellow, config).values();`,
    dependencies: [
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-ramp/0.1.0/",
    ],
  },
  {
    name: "Demo 7: OKLCH Color Ramp",
    type: "code",
    code: `variable yellow: Color = #FF9900;
variable pretty_ramp: Dictionary = oklch_ramp(yellow.to.oklch());

return pretty_ramp.values();`,
    dependencies: [
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/oklch-ramp/0.1.0/",
    ],
  },
  {
    name: "Demo 8: Ramp to Hex Values",
    type: "code",
    code: `variable yellow: Color = #FF9900;
variable pretty_ramp: List = oklch_ramp(yellow.to.oklch()).values();

variable hex_values: List;
variable color_index: Number = 0;
variable current_color: Color.Oklch;
while (color_index < pretty_ramp.length()) [
  current_color = pretty_ramp.get(color_index);
  hex_values.append(current_color.to.hex());
  color_index = color_index + 1;
]

return hex_values;`,
    dependencies: [
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/oklch-ramp/0.1.0/",
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
variable current_step: Number = 0;
variable total_steps: Number = 10;
while(current_step < total_steps) [
  current_step = current_step + 1;
  palette.append(hsl(220, 100, (current_step - 1) / (total_steps - 1) * 100));
]

return palette;`,
    dependencies: [
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0.0.1/",
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0.1.0/",
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
variable font_sizes: Dictionary;

// Headings (h1 largest to h6 same as body)
font_sizes.set("h1", round_to(body * ratio^5));
font_sizes.set("h2", round_to(body * ratio^4));
font_sizes.set("h3", round_to(body * ratio^3));
font_sizes.set("h4", round_to(body * ratio^2));
font_sizes.set("h5", round_to(body * ratio^1));
font_sizes.set("h6", body);

// Body and smaller sizes
font_sizes.set("body", body);
font_sizes.set("sm", round_to(body * 0.85));
font_sizes.set("xs", round_to(body * 0.65));

return font_sizes;`,
  },
  {
    name: "Typography scale (snapped)",
    type: "code",
    code: `variable body: Number = 16;
variable ratio: Number = 1.25;
variable snap_interval: Number = 4;
variable font_sizes: Dictionary;

// Headings (h1 largest to h6 same as body) - snapped to 4px grid
font_sizes.set("h1", snap(body * ratio^5, snap_interval));
font_sizes.set("h2", snap(body * ratio^4, snap_interval));
font_sizes.set("h3", snap(body * ratio^3, snap_interval));
font_sizes.set("h4", snap(body * ratio^2, snap_interval));
font_sizes.set("h5", snap(body * ratio^1, snap_interval));
font_sizes.set("h6", body);

// Body and smaller sizes
font_sizes.set("body", body);
font_sizes.set("sm", snap(body * 0.85, snap_interval));
font_sizes.set("xs", snap(body * 0.65, snap_interval));

return font_sizes;`,
    dependencies: ["https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/snap/0.1.0/"],
  },
  {
    name: "Responsive Font Size (remap)",
    type: "code",
    code: `// Map viewport to responsive font size
variable viewport: Number = 768;
variable mobile_viewport: Number = 320;
variable desktop_viewport: Number = 1920;
variable min_font_size: Number = 16;
variable max_font_size: Number = 48;
variable should_clamp: Number = 1;

variable font_size: Number = remap(viewport, mobile_viewport, desktop_viewport, min_font_size, max_font_size, should_clamp);

return font_size;`,
    dependencies: ["https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/remap/0.0.1/"],
  },
  {
    name: "Opacity from Percentage (remap)",
    type: "code",
    code: `// Map percentage to opacity
variable percentage: Number = 75;
variable min_percentage: Number = 0;
variable max_percentage: Number = 100;
variable min_opacity: Number = 0;
variable max_opacity: Number = 1;
variable should_clamp: Number = 1;

variable opacity: Number = remap(percentage, min_percentage, max_percentage, min_opacity, max_opacity, should_clamp);

return opacity;`,
    dependencies: ["https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/remap/0.0.1/"],
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
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/test-color-scale-rainbow/0.1.0/",
    ],
  },
  {
    name: "Contrasting Text Color Finder",
    type: "code",
    code: `variable background_color: Color = #1E40AF;

// Get the contrasting color - just pass the colors directly!
variable foreground_color: Color;
foreground_color = contrast_color(background_color, #FFFFFF, #D1D5DB, #374151, #000000);

// Return background and foreground as list for visual display
variable output: List;
output.append(background_color);
output.append(foreground_color);

return output;`,
    dependencies: [
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0.0.1/",
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/contrast-color/0.1.0/",
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
    dependencies: [
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0.0.1/",
    ],
  },
  {
    name: "Design system",
    type: "json",
    code: `{
  "colors": {
    "primary": {
      "base": {
        "$type": "color",
        "$value": "#325611"
      },
      "on-base": {
        "$type": "color",
        "$value": "contrast_color({colors.primary.base}, #fff, #000)"
      }
    },
    "secondary": {
      "base": {
        "$type": "color",
        "$value": "#7c3aed"
      },
      "on-base": {
        "$type": "color",
        "$value": "contrast_color({colors.secondary.base}, #fff, #000)"
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
    dependencies: [
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0.0.1/",
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/contrast-color/0.1.0/",
    ],
  },
];
