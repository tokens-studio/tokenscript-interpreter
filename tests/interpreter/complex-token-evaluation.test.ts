import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { interpretTokens } from "../../src/lib/index";

describe("Complex Token Evaluation - Full JSON Processing", () => {
  const complexTokensPath = join(__dirname, "fixtures", "complex-tokens.json");
  const complexTokensJson = JSON.parse(readFileSync(complexTokensPath, "utf8"));

  describe("Basic Token Resolution", () => {
    it("should resolve simple base tokens", () => {
      const result = interpretTokens(complexTokensJson);
      
      expect(result["base.scale"]).toBe("1.25");
      expect(result["base.unit"]).toBe("16px");
      expect(result["base.colors.primary"]).toBe("#3b82f6");
      expect(result["base.colors.neutral.900"]).toBe("#111827");
    });

    it("should resolve tokens with simple references", () => {
      const result = interpretTokens(complexTokensJson);
      
      // base.spacing.md = {base.unit} = 16px
      expect(result["base.spacing.md"]).toBe("16px");
      
      // typography.scale = {base.scale} = 1.25
      expect(result["typography.scale"]).toBe("1.25");
      
      // semantic.colors.text.primary = {base.colors.neutral.900} = #111827
      expect(result["semantic.colors.text.primary"]).toBe("#111827");
    });
  });

  describe("Mathematical Expression Resolution", () => {
    it("should resolve tokens with basic math operations", () => {
      const result = interpretTokens(complexTokensJson);
      
      // base.spacing.xs = {base.unit} * 0.25 = 16px * 0.25 = 4px
      expect(result["base.spacing.xs"]).toBe("4px");
      
      // base.spacing.sm = {base.unit} * 0.5 = 16px * 0.5 = 8px
      expect(result["base.spacing.sm"]).toBe("8px");
      
      // base.radius.md = {base.radius.sm} * 2 = 4px * 2 = 8px
      expect(result["base.radius.md"]).toBe("8px");
    });

    it("should resolve tokens with nested references in math", () => {
      const result = interpretTokens(complexTokensJson);
      
      // base.spacing.lg = {base.unit} * {base.scale} = 16px * 1.25 = 20px
      expect(result["base.spacing.lg"]).toBe("20px");
      
      // base.spacing.xl = {base.spacing.lg} * {base.scale} = 20px * 1.25 = 25px
      expect(result["base.spacing.xl"]).toBe("25px");
      
      // base.spacing.2xl = {base.spacing.xl} * {base.scale} = 25px * 1.25 = 31.25px
      expect(result["base.spacing.2xl"]).toBe("31.25px");
    });

    it("should resolve tokens with addition operations", () => {
      const result = interpretTokens(complexTokensJson);
      
      // base.radius.lg = {base.radius.md} + {base.radius.sm} = 8px + 4px = 12px
      expect(result["base.radius.lg"]).toBe("12px");
      
      // typography.lineHeight.loose = {typography.lineHeight.normal} + 0.3 = 1.5 + 0.3 = 1.8
      expect(result["typography.lineHeight.loose"]).toBe("1.8");
    });

    it("should resolve tokens with power functions", () => {
      const result = interpretTokens(complexTokensJson);
      
      // typography.sizes.xs = {typography.baseSize} * pow({typography.scale}, -2) = 16px * pow(1.25, -2) = 16px * 0.64 = 10.24px
      expect(result["typography.sizes.xs"]).toBe("10.24px");
      
      // typography.sizes.sm = {typography.baseSize} * pow({typography.scale}, -1) = 16px * pow(1.25, -1) = 16px * 0.8 = 12.8px
      expect(result["typography.sizes.sm"]).toBe("12.8px");
    });

    it("should resolve tokens with division operations", () => {
      const result = interpretTokens(complexTokensJson);
      
      // calculated.aspectRatio.widescreen = 16/9 = 1.7777777777777777
      expect(result["calculated.aspectRatio.widescreen"]).toBe("1.7777777777777777");
    });
  });

  describe("Cross-Token Set Dependencies", () => {
    it("should resolve semantic tokens that reference base tokens", () => {
      const result = interpretTokens(complexTokensJson);
      
      // semantic.spacing.componentGap = {base.spacing.md} = 16px
      expect(result["semantic.spacing.componentGap"]).toBe("16px");
      
      // semantic.spacing.sectionGap = {base.spacing.xl} = 25px
      expect(result["semantic.spacing.sectionGap"]).toBe("25px");
      
      // semantic.spacing.containerPadding = {base.spacing.lg} = 20px
      expect(result["semantic.spacing.containerPadding"]).toBe("20px");
    });

    it("should resolve component tokens that reference semantic and base tokens", () => {
      const result = interpretTokens(complexTokensJson);
      
      // components.card.padding = {semantic.spacing.containerPadding} = 20px
      expect(result["components.card.padding"]).toBe("20px");
      
      // components.card.borderRadius = {base.radius.lg} = 12px
      expect(result["components.card.borderRadius"]).toBe("12px");
      
      // components.card.gap = {semantic.spacing.componentGap} = 16px
      expect(result["components.card.gap"]).toBe("16px");
    });

    it("should resolve component tokens with cross-references and math", () => {
      const result = interpretTokens(complexTokensJson);
      
      // components.button.fontSize.sm = {typography.sizes.sm} = 12.8px
      expect(result["components.button.fontSize.sm"]).toBe("12.8px");
      
      // components.button.minHeight.sm = {components.button.fontSize.sm} * 2.5 = 12.8px * 2.5 = 32px
      expect(result["components.button.minHeight.sm"]).toBe("32px");
      
      // components.button.minHeight.md = {components.button.fontSize.md} * 2.5 = 16px * 2.5 = 40px
      expect(result["components.button.minHeight.md"]).toBe("40px");
    });
  });

  describe("Multi-Value Token Resolution", () => {
    it("should resolve tokens with space-separated values", () => {
      const result = interpretTokens(complexTokensJson);
      
      // components.button.padding.sm = {base.spacing.xs} {base.spacing.sm} = 4px 8px
      expect(result["components.button.padding.sm"]).toBe("4px 8px");
      
      // components.button.padding.md = {base.spacing.sm} {base.spacing.md} = 8px 16px
      expect(result["components.button.padding.md"]).toBe("8px 16px");
      
      // components.button.padding.lg = {base.spacing.md} {base.spacing.lg} = 16px 20px
      expect(result["components.button.padding.lg"]).toBe("16px 20px");
    });
  });

  describe("Complex Features and Current Limitations", () => {
    it("should preserve unimplemented expressions as strings", () => {
      const result = interpretTokens(complexTokensJson);
      
      // Functions not yet implemented should be preserved
      expect(result["semantic.colors.interactive.primaryHover"]).toBe("darken({semantic.colors.interactive.primary}, 10%)");
      expect(result["semantic.colors.interactive.secondaryHover"]).toBe("lighten({semantic.colors.interactive.secondary}, 10%)");
      expect(result["calculated.columnWidth"]).toBe("(100vw - ({semantic.spacing.containerPadding} * 2) - ({semantic.spacing.componentGap} * ({calculated.gridColumns} - 1))) / {calculated.gridColumns}");
      expect(result["calculated.dynamicSpacing.responsive"]).toBe("clamp({base.spacing.sm}, 4vw, {base.spacing.xl})");
      expect(result["conditional.spacing.adaptive"]).toBe("if({base.spacing.lg} > 20px) [ {base.spacing.lg} ] else [ {base.spacing.xl} ]");
    });
  });

  describe("Comprehensive Integration Testing", () => {
    it("should handle a realistic design system token structure", () => {
      const result = interpretTokens(complexTokensJson);
      
      // Verify we have a comprehensive set of resolved tokens
      const resultKeys = Object.keys(result);
      
      // Should have tokens from all major categories
      expect(resultKeys.some(key => key.startsWith("base."))).toBe(true);
      expect(resultKeys.some(key => key.startsWith("typography."))).toBe(true);
      expect(resultKeys.some(key => key.startsWith("semantic."))).toBe(true);
      expect(resultKeys.some(key => key.startsWith("components."))).toBe(true);
      
      // Should have resolved some complex dependencies 
      expect(result["components.button.minHeight.lg"]).toBeDefined();
      expect(result["semantic.colors.text.primary"]).toBeDefined();
      
      // Verify cross-references are resolved correctly
      expect(result["semantic.colors.text.primary"]).toBe(result["base.colors.neutral.900"]);
      expect(result["components.card.gap"]).toBe(result["semantic.spacing.componentGap"]);
    });

    it("should demonstrate token dependency chains working correctly", () => {
      const result = interpretTokens(complexTokensJson);
      
      // Test a dependency chain: base -> typography -> components
      // base.scale (1.25) -> typography.scale (1.25) -> typography.sizes.lg (20px) -> components.button.fontSize.lg (20px) -> components.button.minHeight.lg (50px)
      
      expect(result["base.scale"]).toBe("1.25");
      expect(result["typography.scale"]).toBe("1.25"); // References base.scale
      expect(result["typography.sizes.lg"]).toBe("20px"); // 16px * 1.25
      expect(result["components.button.fontSize.lg"]).toBe("20px"); // References typography.sizes.lg
      expect(result["components.button.minHeight.lg"]).toBe("50px"); // 20px * 2.5
    });
  });

  describe("Performance and Scalability", () => {
    it("should process large token sets efficiently", () => {
      const startTime = Date.now();
      const result = interpretTokens(complexTokensJson);
      const endTime = Date.now();
      
      // Should complete within reasonable time (less than 1 second for this size)
      expect(endTime - startTime).toBeLessThan(1000);
      
      // Should resolve all expected tokens
      expect(Object.keys(result).length).toBeGreaterThan(50);
    });

    it("should maintain correct dependency resolution order", () => {
      const result = interpretTokens(complexTokensJson);
      
      // All base tokens should be resolved
      expect(result["base.unit"]).toBeDefined();
      expect(result["base.scale"]).toBeDefined();
      
      // All derived tokens should be resolved
      expect(result["base.spacing.lg"]).toBeDefined();
      expect(result["typography.sizes.xl"]).toBeDefined();
      expect(result["components.button.minHeight.lg"]).toBeDefined();
      
      // Values should be properly calculated (not raw expressions)
      expect(result["base.spacing.lg"]).not.toContain("{");
      expect(result["typography.sizes.xl"]).not.toContain("{");
      expect(result["components.button.minHeight.lg"]).not.toContain("{");
    });
  });

  describe("Token Type Preservation", () => {
    it("should preserve numeric values without units", () => {
      const result = interpretTokens(complexTokensJson);
      
      expect(result["base.scale"]).toBe("1.25");
      expect(result["calculated.gridColumns"]).toBe("12");
      expect(result["calculated.aspectRatio.golden"]).toBe("1.618");
      expect(result["typography.lineHeight.tight"]).toBe("1.2");
    });

    it("should preserve color values in their original format", () => {
      const result = interpretTokens(complexTokensJson);
      
      expect(result["base.colors.primary"]).toBe("#3b82f6");
      expect(result["base.colors.neutral.50"]).toBe("#f9fafb");
      expect(result["conditional.colors.status.warning"]).toBe("#f59e0b");
    });

    it("should handle various dimension formats", () => {
      const result = interpretTokens(complexTokensJson);
      
      // Pixel values
      expect(result["base.unit"]).toBe("16px");
      expect(result["base.spacing.xs"]).toBe("4px");
      
      // Border radius
      expect(result["base.radius.sm"]).toBe("4px");
      expect(result["base.radius.lg"]).toBe("12px");
    });
  });
});