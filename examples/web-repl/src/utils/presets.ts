export interface Preset {
  name: string;
  type: "code" | "json";
  code: string;
}

export const TOKENSCRIPT_PRESETS: Preset[] = [
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
    name: "Spacing system",
    type: "code",
    code: `variable base: Number = 8;
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
