import { describe, expect, it } from "vitest";
import { 
  interpretTokensWithTransforms, 
  createFigmaColorTransform, 
  createCustomTransform,
  interpretTokensAsObjects,
  createFigmaColorTransformForObjects
} from "../src/lib/index";

describe("Transform System", () => {
  const sampleTokens = {
    "colors": {
      "primary": {
        "$type": "color",
        "$value": "#3b82f6",
        "$description": "Primary brand color"
      },
      "secondary": {
        "$type": "color", 
        "$value": "rgb(239, 68, 68)",
        "$description": "Secondary accent color"
      },
      "background": {
        "$type": "color",
        "$value": "rgba(255, 255, 255, 0.9)",
        "$description": "Background with transparency"
      }
    },
    "spacing": {
      "medium": {
        "$type": "dimension",
        "$value": "16px",
        "$description": "Medium spacing value"
      }
    },
    "semantic": {
      "buttonBackground": {
        "$type": "color",
        "$value": "{colors.primary}",
        "$description": "Button background color"
      }
    }
  };

  describe("Figma Color Transform", () => {
    it("should transform hex colors to Figma format", async () => {
      const result = await interpretTokensWithTransforms(sampleTokens, {
        transforms: [createFigmaColorTransform()]
      });

      // Primary color: #3b82f6 -> r: 59/255, g: 130/255, b: 246/255, a: 1
      expect(result.tokens["colors.primary"]).toEqual({
        r: expect.closeTo(0.2314, 4), // 59/255
        g: expect.closeTo(0.5098, 4), // 130/255  
        b: expect.closeTo(0.9647, 4), // 246/255
        a: 1
      });

      // Metadata should be preserved
      expect(result.metadata["colors.primary"].$description).toBe("Primary brand color");
      expect(result.metadata["colors.primary"].$type).toBe("color");
    });

    it("should transform RGB colors to Figma format", async () => {
      const result = await interpretTokensWithTransforms(sampleTokens, {
        transforms: [createFigmaColorTransform()]
      });

      // Secondary color: rgb(239, 68, 68) -> r: 239/255, g: 68/255, b: 68/255, a: 1
      expect(result.tokens["colors.secondary"]).toEqual({
        r: expect.closeTo(0.9373, 4), // 239/255
        g: expect.closeTo(0.2667, 4), // 68/255
        b: expect.closeTo(0.2667, 4), // 68/255
        a: 1
      });
    });

    it("should transform RGBA colors preserving alpha", async () => {
      const result = await interpretTokensWithTransforms(sampleTokens, {
        transforms: [createFigmaColorTransform()]
      });

      // Background: rgba(255, 255, 255, 0.9) -> r: 1, g: 1, b: 1, a: 0.9
      expect(result.tokens["colors.background"]).toEqual({
        r: 1,
        g: 1, 
        b: 1,
        a: 0.9
      });
    });

    it("should work with token references", async () => {
      const result = await interpretTokensWithTransforms(sampleTokens, {
        transforms: [createFigmaColorTransform()]
      });

      // Semantic button should reference primary color and get transformed
      expect(result.tokens["semantic.buttonBackground"]).toEqual({
        r: expect.closeTo(0.2314, 4), // Same as colors.primary
        g: expect.closeTo(0.5098, 4),
        b: expect.closeTo(0.9647, 4),
        a: 1
      });
    });

    it("should not transform non-color tokens", async () => {
      const result = await interpretTokensWithTransforms(sampleTokens, {
        transforms: [createFigmaColorTransform()]
      });

      // Spacing should remain unchanged
      expect(result.tokens["spacing.medium"]).toBe("16px");
      expect(result.metadata["spacing.medium"].$type).toBe("dimension");
    });
  });

  describe("Custom Transform Functions", () => {
    it("should apply custom transform to specific token types", async () => {
      // Custom transform that converts dimensions from px to rem (assuming 16px base)
      const pxToRemTransform = createCustomTransform({
        name: "px-to-rem",
        targetTypes: ["dimension"],
        transform: (value: string, metadata: any) => {
          if (typeof value === "string" && value.endsWith("px")) {
            const pxValue = parseFloat(value);
            return `${pxValue / 16}rem`;
          }
          return value;
        }
      });

      const result = await interpretTokensWithTransforms(sampleTokens, {
        transforms: [pxToRemTransform]
      });

      expect(result.tokens["spacing.medium"]).toBe("1rem"); // 16px / 16 = 1rem
      expect(result.metadata["spacing.medium"].$description).toBe("Medium spacing value");
    });

    it("should handle transform errors gracefully", async () => {
      const faultyTransform = createCustomTransform({
        name: "faulty-transform",
        targetTypes: ["color"],
        transform: (value: any) => {
          throw new Error("Transform failed");
        }
      });

      const result = await interpretTokensWithTransforms(sampleTokens, {
        transforms: [faultyTransform],
        continueOnError: true
      });

      // Should fall back to original values when transform fails
      expect(result.tokens["colors.primary"]).toBe("#3b82f6");
      expect(result.errors?.[0]).toContain("Transform failed");
    });
  });
});

describe("Token Objects API", () => {
  const figmaTokens = {
    "foundation": {
      "colors": {
        "brand": {
          "primary": {
            "$value": "#3b82f6",
            "$type": "color",
            "$description": "Primary brand color",
            "$extensions": {
              "figma": {
                "scopes": ["ALL_SCOPES"],
                "hiddenFromPublishing": false
              }
            }
          }
        },
        "semantic": {
          "success": {
            "$value": "#10b981",
            "$type": "color",
            "$extensions": {
              "figma": {
                "scopes": ["ALL_SCOPES"],
                "codeSyntax": "success"
              }
            }
          }
        }
      },
      "spacing": {
        "md": {
          "$value": "16px",
          "$type": "dimension",
          "$extensions": {
            "figma": {
              "scopes": ["GAP", "CORNER_RADIUS"],
              "codeSyntax": "medium"
            }
          }
        }
      }
    }
  };

  it("should create token objects with Figma transforms", () => {
    const figmaTransform = createFigmaColorTransformForObjects();
    const result = interpretTokensAsObjects(figmaTokens, {
      transforms: [figmaTransform]
    });

    // Check primary brand color
    const primaryBrand = result.tokens["foundation.colors.brand.primary"];
    expect(primaryBrand).toEqual({
      value: "#3b82f6",                    // ✅ Original hex preserved
      transformedValue: {                  // ✅ Figma RGB values added
        r: expect.closeTo(0.231, 2),
        g: expect.closeTo(0.510, 2),
        b: expect.closeTo(0.965, 2),
        a: 1
      },
      $type: "color",
      $description: "Primary brand color",
      $extensions: {                       // ✅ All $extensions preserved
        figma: {
          scopes: ["ALL_SCOPES"],
          hiddenFromPublishing: false
        }
      }
    });

    // Check success color
    const successColor = result.tokens["foundation.colors.semantic.success"];
    expect(successColor.value).toBe("#10b981");
    expect(successColor.transformedValue).toEqual({
      r: expect.closeTo(0.063, 2),
      g: expect.closeTo(0.725, 2), 
      b: expect.closeTo(0.506, 2),
      a: 1
    });
    expect(successColor.$extensions.figma.codeSyntax).toBe("success");

    // Check non-color tokens should not have transformedValue
    const spacingMd = result.tokens["foundation.spacing.md"];
    expect(spacingMd).toEqual({
      value: "16px",
      $type: "dimension",
      $extensions: {
        figma: {
          scopes: ["GAP", "CORNER_RADIUS"],
          codeSyntax: "medium"
        }
      }
      // ✅ No transformedValue for non-color tokens
    });
    expect(spacingMd.transformedValue).toBeUndefined();
  });

  it("should handle tokens without transforms", () => {
    const result = interpretTokensAsObjects(figmaTokens);

    // All tokens should have value and metadata but no transformedValue
    const primaryBrand = result.tokens["foundation.colors.brand.primary"];
    expect(primaryBrand.value).toBe("#3b82f6");
    expect(primaryBrand.$type).toBe("color");
    expect(primaryBrand.transformedValue).toBeUndefined();
  });

  it("should provide self-contained token objects", () => {
    const figmaTransform = createFigmaColorTransformForObjects();
    const result = interpretTokensAsObjects(figmaTokens, {
      transforms: [figmaTransform]
    });

    // Every token should be completely self-contained
    for (const [tokenName, tokenObject] of Object.entries(result.tokens)) {
      // Every token should have a value
      expect(tokenObject.value).toBeDefined();
      
      // Color tokens should have transformedValue, others should not
      if (tokenObject.$type === "color") {
        expect(tokenObject.transformedValue).toBeDefined();
        expect(tokenObject.transformedValue).toHaveProperty("r");
        expect(tokenObject.transformedValue).toHaveProperty("g");
        expect(tokenObject.transformedValue).toHaveProperty("b");
        expect(tokenObject.transformedValue).toHaveProperty("a");
      } else {
        expect(tokenObject.transformedValue).toBeUndefined();
      }
      
      // All tokens with $extensions should preserve them
      if (tokenObject.$extensions) {
        expect(tokenObject.$extensions.figma).toBeDefined();
        expect(Array.isArray(tokenObject.$extensions.figma.scopes)).toBe(true);
      }
    }
  });
});