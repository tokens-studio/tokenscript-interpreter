import { describe, expect, it } from "vitest";
import { interpretTokens, interpretTokensWithMetadata } from "../src/lib/index";

describe("Token Metadata Preservation", () => {
  describe("Basic DTCG Token Metadata", () => {
    it("should preserve $description in token output", () => {
      const tokens = {
        colors: {
          primary: {
            $value: "#3b82f6",
            $type: "color",
            $description: "Primary brand color used for buttons and links"
          },
          secondary: {
            $value: "#6b7280", 
            $type: "color",
            $description: "Secondary color for subtle UI elements"
          }
        },
        spacing: {
          small: {
            $value: "8px",
            $type: "dimension", 
            $description: "Small spacing for tight layouts"
          },
          medium: {
            $value: "{spacing.small} * 2",
            $type: "dimension",
            $description: "Medium spacing, twice the small spacing"
          }
        }
      };

      const result = interpretTokensWithMetadata(tokens);

      // Values should be computed correctly
      expect(result.tokens["colors.primary"]).toBe("#3b82f6");
      expect(result.tokens["spacing.medium"]).toBe("16px");
      
      // Metadata should be preserved in enhanced format
      expect(result.tokens["colors.primary.$description"]).toBe("Primary brand color used for buttons and links");
      expect(result.tokens["colors.primary.$type"]).toBe("color");
      expect(result.tokens["spacing.medium.$description"]).toBe("Medium spacing, twice the small spacing");
      expect(result.tokens["spacing.medium.$type"]).toBe("dimension");

      // Structured metadata should also be available
      expect(result.metadata["colors.primary"]).toEqual({
        $type: "color",
        $description: "Primary brand color used for buttons and links"
      });
      expect(result.metadata["spacing.medium"]).toEqual({
        $type: "dimension",
        $description: "Medium spacing, twice the small spacing"
      });
    });

    it("should keep backward compatible interpretTokens API (values only)", () => {
      const tokens = {
        color: {
          brand: {
            $value: "#ff6b6b",
            $type: "color",
            $description: "Brand color for marketing materials",
            $extensions: {
              "com.figma": {
                scopes: ["fill", "stroke"]
              }
            }
          }
        }
      };

      const result = interpretTokens(tokens);

      // Should work as before - only computed values returned (backward compatible)
      expect(result["color.brand"]).toBe("#ff6b6b");
      
      // No metadata should be in the result for backward compatibility
      expect(result["color.brand.$description"]).toBeUndefined();
      expect(result["color.brand.$type"]).toBeUndefined();
      expect(result["color.brand.$extensions"]).toBeUndefined();

      // Keys should only be the computed token names
      expect(Object.keys(result)).toEqual(["color.brand"]);
    });

    it("should handle tokens with references", () => {
      const tokens = {
        base: {
          spacing: {
            $value: "16px", 
            $type: "dimension",
            $description: "Base spacing unit"
          }
        },
        semantic: {
          padding: {
            $value: "{base.spacing} * 1.5",
            $type: "dimension",
            $description: "Standard padding derived from base spacing"
          }
        }
      };

      const result = interpretTokensWithMetadata(tokens);

      // Values should be computed correctly
      expect(result.tokens["semantic.padding"]).toBe("24px");
      
      // Metadata should be preserved
      expect(result.tokens["semantic.padding.$description"]).toBe("Standard padding derived from base spacing");
      expect(result.tokens["semantic.padding.$type"]).toBe("dimension");
    });
  });
});