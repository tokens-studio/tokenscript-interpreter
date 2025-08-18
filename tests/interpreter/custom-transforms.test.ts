import { describe, expect, it } from "vitest";
import { interpretTokensWithTransforms, createFigmaColorTransform, createCustomTransform } from "../../lib/index";

describe("Custom Token Transforms", () => {
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

    it("should apply multiple transforms in sequence", async () => {
      const uppercaseTransform = createCustomTransform({
        name: "uppercase-descriptions", 
        targetTypes: ["color"],
        transform: (value: any, metadata: any) => value, // Don't change value
        transformMetadata: (metadata: any) => ({
          ...metadata,
          $description: metadata.$description?.toUpperCase()
        })
      });

      const result = await interpretTokensWithTransforms(sampleTokens, {
        transforms: [createFigmaColorTransform(), uppercaseTransform]
      });

      // Should have Figma color format AND uppercase description
      expect(result.tokens["colors.primary"]).toEqual({
        r: expect.closeTo(0.2314, 4),
        g: expect.closeTo(0.5098, 4), 
        b: expect.closeTo(0.9647, 4),
        a: 1
      });
      expect(result.metadata["colors.primary"].$description).toBe("PRIMARY BRAND COLOR");
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

  describe("Theme Support with Transforms", () => {
    const themeTokens = {
      "core": {
        "colors": {
          "blue": {
            "500": {
              "$type": "color",
              "$value": "#3b82f6"
            }
          }
        }
      },
      "light": {
        "semantic": {
          "primary": {
            "$type": "color", 
            "$value": "{core.colors.blue.500}"
          }
        }
      },
      "$themes": [{
        "$id": "light",
        "$name": "Light Theme", 
        "selectedTokenSets": {
          "core": "source",
          "light": "enabled"
        }
      }]
    };

    it("should apply transforms to theme-processed tokens", async () => {
      const result = await interpretTokensWithTransforms(themeTokens, {
        transforms: [createFigmaColorTransform()],
        enableThemes: true
      });

      // Core color should be transformed to Figma format
      expect(result.tokens["colors.blue.500"]).toEqual({
        r: expect.closeTo(0.2314, 4),
        g: expect.closeTo(0.5098, 4),
        b: expect.closeTo(0.9647, 4), 
        a: 1
      });

      // Metadata should be preserved
      expect(result.metadata["colors.blue.500"].$type).toBe("color");
    });
  });

  describe("Built-in Transform Presets", () => {
    it("should provide Android color transform", async () => {
      // Android uses ARGB format as hex strings
      const androidTransform = createCustomTransform({
        name: "android-colors",
        targetTypes: ["color"],
        transform: (value: string) => {
          // This would convert to Android ARGB format
          // For demo purposes, just add "android:" prefix
          return `android:${value}`;
        }
      });

      const result = await interpretTokensWithTransforms(sampleTokens, {
        transforms: [androidTransform]
      });

      expect(result.tokens["colors.primary"]).toBe("android:#3b82f6");
    });

    it("should provide iOS color transform", async () => {
      // iOS uses UIColor with 0-1 values
      const iosTransform = createCustomTransform({
        name: "ios-colors",
        targetTypes: ["color"],
        transform: (value: string) => {
          // This would convert to iOS UIColor format
          return `UIColor(${value})`;
        }
      });

      const result = await interpretTokensWithTransforms(sampleTokens, {
        transforms: [iosTransform]
      });

      expect(result.tokens["colors.primary"]).toBe("UIColor(#3b82f6)");
    });
  });
});