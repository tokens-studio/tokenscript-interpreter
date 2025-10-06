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
variable max: Number = 100;
while(i < max) [
  i = i + 1;
  palette.append(hsl(220, 100, (i - 1) / (max - 1) * 100));
]

return palette;`,
  },
  {
    name: "Gradient generator",
    type: "code",
    code: `variable start: Color = hsl(220, 100, 50);
variable end: Color = hsl(320, 100, 50);
variable steps: Number = 10;
variable gradient: List;
variable i: Number = 0;

while(i < steps) [
  variable ratio: Number = i / (steps - 1);
  variable interpolated: Color = start.mix(end, ratio);
  gradient.append(interpolated);
  i = i + 1;
]

return gradient;`,
  },
  {
    name: "Color harmony",
    type: "code",
    code: `variable base: Color = hsl(220, 80, 60);
variable harmony: Object;

harmony.base = base;
harmony.complement = base.rotate(180);
harmony.triadic = [
  base,
  base.rotate(120),
  base.rotate(240)
];
harmony.analogous = [
  base.rotate(-30),
  base,
  base.rotate(30)
];

return harmony;`,
  },
  {
    name: "Typography scale",
    type: "code",
    code: `variable baseSize: Number = 16;
variable ratio: Number = 1.25;
variable scale: Object;

scale.xs = baseSize / (ratio * ratio);
scale.sm = baseSize / ratio;
scale.base = baseSize;
scale.lg = baseSize * ratio;
scale.xl = baseSize * ratio * ratio;
scale.xxl = baseSize * ratio * ratio * ratio;

return scale;`,
  },
  {
    name: "Spacing system",
    type: "code",
    code: `variable base: Number = 8;
variable spacing: Object;

spacing.none = 0;
spacing.xs = base / 2;
spacing.sm = base;
spacing.md = base * 1.5;
spacing.lg = base * 2;
spacing.xl = base * 3;
spacing.xxl = base * 4;

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
