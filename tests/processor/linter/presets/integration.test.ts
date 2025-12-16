import { css, LintRunner, penpot, TypeBasedRule } from "@src/processor/linter";
import { processTokens } from "@src/processor/process";
import type { TokenData } from "@src/processor/utils/tokens";
import { describe, expect, it } from "vitest";

describe("Preset Validators Integration", () => {
  describe("CSS Presets with processTokens", () => {
    it("should validate tokens using CSS presets", () => {
      const tokens = new Map<string, TokenData>([
        ["opacity.valid", { $type: "opacity", $value: "0.5" }],
        ["opacity.invalid", { $type: "opacity", $value: "1.5" }],
        ["font.weight.valid", { $type: "fontWeight", $value: "700" }],
        ["font.weight.keyword", { $type: "fontWeight", $value: "bold" }],
        ["font.weight.invalid", { $type: "fontWeight", $value: "9999" }],
      ]);

      const linter = new LintRunner().addRule(new TypeBasedRule().forType("opacity", css.opacityValidator).forType("fontWeight", css.fontWeightValidator));

      const result = processTokens(tokens, { linter });

      // Valid tokens should have no issues
      expect(result.issues?.has("opacity.valid")).toBe(false);
      expect(result.issues?.has("font.weight.valid")).toBe(false);
      expect(result.issues?.has("font.weight.keyword")).toBe(false);

      // Invalid tokens should have issues
      expect(result.issues?.has("opacity.invalid")).toBe(true);
      expect(result.issues?.has("font.weight.invalid")).toBe(true);
    });

    it("should validate border-radius with multiple values", () => {
      const tokens = new Map<string, TokenData>([
        ["radius.single", { $type: "borderRadius", $value: "10px" }],
        ["radius.four", { $type: "borderRadius", $value: ["10px", "20px", "10px", "20px"] }],
        ["radius.invalid", { $type: "borderRadius", $value: "-10px" }],
      ]);

      const linter = new LintRunner().addRule(new TypeBasedRule().forType("borderRadius", css.borderRadiusValidator));

      const result = processTokens(tokens, { linter });

      expect(result.issues?.has("radius.single")).toBe(false);
      expect(result.issues?.has("radius.four")).toBe(false);
      expect(result.issues?.has("radius.invalid")).toBe(true);
    });
  });

  describe("Penpot Presets with processTokens", () => {
    it("should validate Penpot typography tokens", () => {
      const tokens = new Map<string, TokenData>([
        [
          "typography.valid",
          {
            $type: "typography",
            $value: {
              fontSize: "16px",
              fontWeight: "400",
              lineHeight: "1.5",
              letterSpacing: "0",
              textCase: "none",
              textDecoration: "none",
            },
          },
        ],
        [
          "typography.invalidLineHeight",
          {
            $type: "typography",
            $value: {
              fontSize: "16px",
              lineHeight: "-1", // Penpot requires non-negative
            },
          },
        ],
      ]);

      const linter = new LintRunner().addRule(new TypeBasedRule().forType("typography", penpot.typographyValidator));

      const result = processTokens(tokens, { linter });

      expect(result.issues?.has("typography.valid")).toBe(false);
      expect(result.issues?.has("typography.invalidLineHeight")).toBe(true);
    });

    it("should validate Penpot shadow tokens", () => {
      const tokens = new Map<string, TokenData>([
        [
          "shadow.valid",
          {
            $type: "shadow",
            $value: [
              {
                offsetX: "0",
                offsetY: "4",
                blur: "8",
                spread: "0",
                color: "#000000",
                inset: false,
              },
            ],
          },
        ],
        [
          "shadow.negativeBlur",
          {
            $type: "shadow",
            $value: [
              {
                offsetX: "0",
                offsetY: "4",
                blur: "-8", // Penpot requires non-negative blur
                spread: "0",
                color: "#000000",
                inset: false,
              },
            ],
          },
        ],
      ]);

      const linter = new LintRunner().addRule(new TypeBasedRule().forType("shadow", penpot.shadowValidator));

      const result = processTokens(tokens, { linter });

      expect(result.issues?.has("shadow.valid")).toBe(false);
      expect(result.issues?.has("shadow.negativeBlur")).toBe(true);
    });
  });

  describe("Mixing CSS and Penpot presets", () => {
    it("should use CSS for standard properties and Penpot for specific ones", () => {
      const tokens = new Map<string, TokenData>([
        ["opacity.valid", { $type: "opacity", $value: "0.8" }],
        ["stroke.valid", { $type: "strokeWidth", $value: "2px" }],
        ["stroke.invalid", { $type: "strokeWidth", $value: "-2px" }],
      ]);

      const linter = new LintRunner().addRule(
        new TypeBasedRule()
          .forType("opacity", css.opacityValidator) // CSS standard
          .forType("strokeWidth", penpot.strokeWidthValidator), // Penpot specific
      );

      const result = processTokens(tokens, { linter });

      expect(result.issues?.has("opacity.valid")).toBe(false);
      expect(result.issues?.has("stroke.valid")).toBe(false);
      expect(result.issues?.has("stroke.invalid")).toBe(true);
    });
  });

  describe("Custom validators using primitives", () => {
    it("should compose custom validators from primitives", async () => {
      const { number, or, string, createValidator: create } = await import("@src/processor/linter/presets");

      // Custom z-index validator: integer or "auto"
      const zIndex = or(number(), string({ allowedValues: ["auto"] }));

      const tokens = new Map<string, TokenData>([
        ["z.valid", { $type: "zIndex", $value: "100" }],
        ["z.auto", { $type: "zIndex", $value: "auto" }],
        ["z.invalid", { $type: "zIndex", $value: "invalid" }],
      ]);

      const linter = new LintRunner().addRule(new TypeBasedRule().forType("zIndex", create(zIndex)));

      const result = processTokens(tokens, { linter });

      expect(result.issues?.has("z.valid")).toBe(false);
      expect(result.issues?.has("z.auto")).toBe(false);
      expect(result.issues?.has("z.invalid")).toBe(true);
    });
  });
});
