import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { interpretTokens, buildThemeTree, processThemes } from "../../tokenset-processor";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Multi-Theme Token Processing", () => {
  const multiThemeTokensPath = join(__dirname, "fixtures", "multi-theme-tokens.json");
  const multiThemeTokens = JSON.parse(readFileSync(multiThemeTokensPath, "utf8"));

  describe("Theme Structure Validation", () => {
    it("should have proper theme configuration", () => {
      expect(multiThemeTokens).toHaveProperty("$themes");
      expect(Array.isArray(multiThemeTokens.$themes)).toBe(true);
      expect(multiThemeTokens.$themes).toHaveLength(2);

      const lightTheme = multiThemeTokens.$themes.find((t: any) => t.name === "light");
      const darkTheme = multiThemeTokens.$themes.find((t: any) => t.name === "dark");

      expect(lightTheme).toBeDefined();
      expect(darkTheme).toBeDefined();
      expect(lightTheme.group).toBe("mode");
      expect(darkTheme.group).toBe("mode");
      
      // Both themes should use core as source and semantic as enabled
      expect(lightTheme.selectedTokenSets.core).toBe("source");
      expect(lightTheme.selectedTokenSets.light).toBe("enabled");
      expect(lightTheme.selectedTokenSets.semantic).toBe("enabled");
      
      expect(darkTheme.selectedTokenSets.core).toBe("source");
      expect(darkTheme.selectedTokenSets.dark).toBe("enabled");
      expect(darkTheme.selectedTokenSets.semantic).toBe("enabled");
    });

    it("should have all required token sets", () => {
      expect(multiThemeTokens).toHaveProperty("core");
      expect(multiThemeTokens).toHaveProperty("light");
      expect(multiThemeTokens).toHaveProperty("dark");
      expect(multiThemeTokens).toHaveProperty("semantic");
    });
  });

  describe("Theme Tree Building", () => {
    it("should build correct theme tree structure", () => {
      const themeTree = buildThemeTree(multiThemeTokens);
      
      expect(themeTree).toHaveProperty("mode");
      expect(themeTree.mode).toHaveProperty("light");
      expect(themeTree.mode).toHaveProperty("dark");
      
      const lightTokens = themeTree.mode.light;
      const darkTokens = themeTree.mode.dark;
      
      // Both themes should have core tokens
      expect(lightTokens).toHaveProperty("colors.primary.500");
      expect(darkTokens).toHaveProperty("colors.primary.500");
      expect(lightTokens["colors.primary.500"]).toBe("#3b82f6");
      expect(darkTokens["colors.primary.500"]).toBe("#3b82f6");
      
      // Light theme should have light-specific tokens
      expect(lightTokens).toHaveProperty("color.background.primary");
      expect(lightTokens).toHaveProperty("color.text.primary");
      
      // Dark theme should have dark-specific tokens
      expect(darkTokens).toHaveProperty("color.background.primary");
      expect(darkTokens).toHaveProperty("color.text.primary");
      
      // Both should have semantic tokens
      expect(lightTokens).toHaveProperty("button.primary.background");
      expect(darkTokens).toHaveProperty("button.primary.background");
    });

    it("should properly inherit from source token sets", () => {
      const themeTree = buildThemeTree(multiThemeTokens);
      
      const lightTokens = themeTree.mode.light;
      const darkTokens = themeTree.mode.dark;
      
      // Core spacing should be available in both themes
      expect(lightTokens).toHaveProperty("spacing.base");
      expect(darkTokens).toHaveProperty("spacing.base");
      expect(lightTokens["spacing.base"]).toBe("4");
      expect(darkTokens["spacing.base"]).toBe("4");
      
      // Core typography should be available in both themes
      expect(lightTokens).toHaveProperty("typography.fontSize.base");
      expect(darkTokens).toHaveProperty("typography.fontSize.base");
      expect(lightTokens["typography.fontSize.base"]).toBe("16");
      expect(darkTokens["typography.fontSize.base"]).toBe("16");
    });
  });

  describe("Theme Processing and Resolution", () => {
    it("should process themes and resolve all token references", async () => {
      const result = await interpretTokens(multiThemeTokens);
      
      expect(result).toHaveProperty("light");
      expect(result).toHaveProperty("dark");
      
      const lightTheme = result.light;
      const darkTheme = result.dark;
      
      // Check that both themes have resolved tokens
      expect(Object.keys(lightTheme).length).toBeGreaterThan(50);
      expect(Object.keys(darkTheme).length).toBeGreaterThan(50);
    });

    it("should resolve cross-references between core and theme-specific tokens", async () => {
      const result = await interpretTokens(multiThemeTokens);
      
      const lightTheme = result.light;
      const darkTheme = result.dark;
      
      // Core color references should be resolved
      expect(lightTheme["color.background.primary"]).toBe("#ffffff"); // {colors.neutral.0}
      expect(darkTheme["color.background.primary"]).toBe("#111827"); // {colors.neutral.900}
      
      expect(lightTheme["color.text.primary"]).toBe("#111827"); // {colors.neutral.900}
      expect(darkTheme["color.text.primary"]).toBe("#ffffff"); // {colors.neutral.0}
      
      // Interactive colors should use different primary colors for each theme
      expect(lightTheme["color.interactive.primary"]).toBe("#3b82f6"); // {colors.primary.500}
      expect(darkTheme["color.interactive.primary"]).toBe("#60a5fa"); // {colors.primary.400}
    });

    it("should resolve complex cross-theme dependencies in semantic tokens", async () => {
      const result = await interpretTokens(multiThemeTokens);
      
      const lightTheme = result.light;
      const darkTheme = result.dark;
      
      // Button primary background should resolve through multiple references
      // {color.interactive.primary} -> {colors.primary.X} -> actual color
      expect(lightTheme["button.primary.background"]).toBe("#3b82f6");
      expect(darkTheme["button.primary.background"]).toBe("#60a5fa");
      
      // Button text should be inverse colors
      expect(lightTheme["button.primary.text"]).toBe("#ffffff"); // {color.text.inverse}
      expect(darkTheme["button.primary.text"]).toBe("#111827"); // {color.text.inverse}
      
      // Button padding should resolve spacing calculations
      expect(lightTheme["button.primary.padding"]).toBe("8 16"); // {spacing.sm} {spacing.md}
      expect(darkTheme["button.primary.padding"]).toBe("8 16"); // Same for both themes
    });

    it("should handle mathematical operations in theme context", async () => {
      const result = await interpretTokens(multiThemeTokens);
      
      const lightTheme = result.light;
      const darkTheme = result.dark;
      
      // Spacing calculations should work in both themes
      expect(lightTheme["spacing.sm"]).toBe("8"); // {spacing.base} * 2
      expect(lightTheme["spacing.md"]).toBe("16"); // {spacing.base} * 4
      expect(lightTheme["spacing.lg"]).toBe("24"); // {spacing.base} * 6
      
      expect(darkTheme["spacing.sm"]).toBe("8");
      expect(darkTheme["spacing.md"]).toBe("16");
      expect(darkTheme["spacing.lg"]).toBe("24");
    });

    it("should preserve theme-specific differences", async () => {
      const result = await interpretTokens(multiThemeTokens);
      
      const lightTheme = result.light;
      const darkTheme = result.dark;
      
      // Background colors should be different
      expect(lightTheme["color.background.primary"]).not.toBe(darkTheme["color.background.primary"]);
      expect(lightTheme["color.background.secondary"]).not.toBe(darkTheme["color.background.secondary"]);
      
      // Text colors should be different 
      expect(lightTheme["color.text.primary"]).not.toBe(darkTheme["color.text.primary"]);
      expect(lightTheme["color.text.secondary"]).not.toBe(darkTheme["color.text.secondary"]);
      
      // Border colors should be different
      expect(lightTheme["color.border.primary"]).not.toBe(darkTheme["color.border.primary"]);
      
      // Interactive colors should be different for better contrast
      expect(lightTheme["color.interactive.primary"]).not.toBe(darkTheme["color.interactive.primary"]);
    });

    it("should handle complex expressions with RGBA functions", async () => {
      const result = await interpretTokens(multiThemeTokens);
      
      const lightTheme = result.light;
      const darkTheme = result.dark;
      
      // Shadow colors with RGBA should be resolved differently for each theme
      // Note: RGBA function preserves hex format instead of converting to RGB values
      expect(lightTheme["shadow.color"]).toBe("rgba(#111827, 0.1)"); // Light theme shadow
      expect(darkTheme["shadow.color"]).toBe("rgba(#000000, 0.3)"); // Dark theme shadow
      
      // Card shadow should use theme-specific shadow color
      expect(lightTheme["card.shadow"]).toBe("0 2px 16px rgba(#111827, 0.1)");
      expect(darkTheme["card.shadow"]).toBe("0 2px 16px rgba(#000000, 0.3)");
    });

    it("should handle multi-value tokens correctly in both themes", async () => {
      const result = await interpretTokens(multiThemeTokens);
      
      const lightTheme = result.light;
      const darkTheme = result.dark;

      console.log("RESULT", result)
      
      // Multi-value spacing should work the same in both themes
      expect(lightTheme["button.primary.padding"]).toBe("8 16");
      expect(darkTheme["button.primary.padding"]).toBe("8 16");
      
      expect(lightTheme["input.padding"]).toBe("8 16");
      expect(darkTheme["input.padding"]).toBe("8 16");
      
      expect(lightTheme["navigation.itemPadding"]).toBe("8 24");
      expect(darkTheme["navigation.itemPadding"]).toBe("8 24");
    });
  });

  describe("Theme Consistency Validation", () => {
    it("should have consistent token counts between themes", async () => {
      const result = await interpretTokens(multiThemeTokens);
      
      const lightTokens = Object.keys(result.light);
      const darkTokens = Object.keys(result.dark);
      
      // Both themes should have the same number of tokens
      expect(lightTokens.length).toBe(darkTokens.length);
      
      // Both themes should have the same token keys
      lightTokens.sort();
      darkTokens.sort();
      expect(lightTokens).toEqual(darkTokens);
    });

    it("should have consistent semantic token structure", async () => {
      const result = await interpretTokens(multiThemeTokens);
      
      const lightTheme = result.light;
      const darkTheme = result.dark;
      
      // Both themes should have the same semantic token categories
      const semanticTokens = [
        "button.primary.background",
        "button.primary.text",
        "button.secondary.background",
        "card.background",
        "card.border",
        "input.background",
        "input.border",
        "navigation.background"
      ];
      
      for (const token of semanticTokens) {
        expect(lightTheme).toHaveProperty(token);
        expect(darkTheme).toHaveProperty(token);
        
        // Values should be strings (resolved)
        expect(typeof lightTheme[token]).toBe("string");
        expect(typeof darkTheme[token]).toBe("string");
        
        // Values should not contain unresolved references
        expect(lightTheme[token]).not.toMatch(/\{.*\}/);
        expect(darkTheme[token]).not.toMatch(/\{.*\}/);
      }
    });

    it("should preserve shared tokens across themes", async () => {
      const result = await interpretTokens(multiThemeTokens);
      
      const lightTheme = result.light;
      const darkTheme = result.dark;
      
      // Core tokens that should be the same in both themes
      const sharedTokens = [
        "spacing.base",
        "spacing.sm", 
        "spacing.md",
        "borderRadius.sm",
        "borderRadius.md",
        "typography.fontSize.base",
        "typography.fontWeight.medium",
        "colors.primary.500",
        "colors.success",
        "colors.warning",
        "colors.danger"
      ];
      
      for (const token of sharedTokens) {
        expect(lightTheme[token]).toBe(darkTheme[token]);
      }
    });
  });

  describe("Performance and Scalability", () => {
    it("should process themes efficiently", async () => {
      const startTime = performance.now();
      const result = await interpretTokens(multiThemeTokens);
      const endTime = performance.now();
      
      const processingTime = endTime - startTime;
      
      // Should process both themes in reasonable time
      expect(processingTime).toBeLessThan(1000); // Less than 1 second
      
      // Should produce meaningful output
      expect(Object.keys(result.light).length).toBeGreaterThan(50);
      expect(Object.keys(result.dark).length).toBeGreaterThan(50);
    });

    it("should handle large token hierarchies without stack overflow", async () => {
      // This test ensures deep token reference chains don't cause issues
      const result = await interpretTokens(multiThemeTokens);
      
      // Semantic tokens that reference theme tokens that reference core tokens
      // should all resolve properly
      expect(result.light["button.primary.background"]).toBe("#3b82f6");
      expect(result.dark["button.primary.background"]).toBe("#60a5fa");
      
      // No circular references should cause infinite loops
      expect(result.light["card.shadow"]).toMatch(/^0 2px 16px rgba\(/);
      expect(result.dark["card.shadow"]).toMatch(/^0 2px 16px rgba\(/);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle missing theme-specific token gracefully", async () => {
      // Create a modified version with missing token reference
      const modifiedTokens = JSON.parse(JSON.stringify(multiThemeTokens));
      modifiedTokens.semantic.test = {
        "missingRef": { "$value": "{color.nonexistent.token}", "$type": "color" }
      };
      
      const result = await interpretTokens(modifiedTokens);
      
      // Should still process other tokens successfully
      expect(result.light["button.primary.background"]).toBe("#3b82f6");
      expect(result.dark["button.primary.background"]).toBe("#60a5fa");
      
      // Missing reference tokens are filtered out (undefined) rather than preserved
      expect(result.light["test.missingRef"]).toBeUndefined();
      expect(result.dark["test.missingRef"]).toBeUndefined();
      
      // But the token key itself should not exist in the output
      expect("test.missingRef" in result.light).toBe(false);
      expect("test.missingRef" in result.dark).toBe(false);
    });

    it("should handle empty theme sets", async () => {
      const emptyThemeTokens = {
        core: {
          color: { primary: { "$value": "#ff0000", "$type": "color" } }
        },
        empty: {},
        "$themes": [
          {
            name: "minimal",
            group: "test",
            selectedTokenSets: {
              core: "source",
              empty: "enabled"
            }
          }
        ]
      };
      
      const result = await interpretTokens(emptyThemeTokens);
      
      expect(result.minimal).toHaveProperty("color.primary");
      expect(result.minimal["color.primary"]).toBe("#ff0000");
    });

    it("should handle multiple theme groups (e.g., mode + brand)", async () => {
      const multiGroupTokens = {
        core: {
          colors: {
            primary: { "brand1": { "$value": "#0066cc", "$type": "color" } },
            secondary: { "brand1": { "$value": "#ff6600", "$type": "color" } }
          }
        },
        "brand-a": {
          color: { accent: { "$value": "{colors.primary.brand1}", "$type": "color" } }
        },
        "brand-b": { 
          color: { accent: { "$value": "#cc0066", "$type": "color" } }
        },
        light: {
          color: { background: { "$value": "#ffffff", "$type": "color" } }
        },
        dark: {
          color: { background: { "$value": "#000000", "$type": "color" } }
        },
        semantic: {
          button: { background: { "$value": "{color.accent}", "$type": "color" } }
        },
        "$themes": [
          {
            name: "lightBrandA",
            group: "combination",
            selectedTokenSets: {
              core: "source",
              "brand-a": "enabled", 
              light: "enabled",
              semantic: "enabled"
            }
          },
          {
            name: "darkBrandA", 
            group: "combination",
            selectedTokenSets: {
              core: "source",
              "brand-a": "enabled",
              dark: "enabled", 
              semantic: "enabled"
            }
          },
          {
            name: "lightBrandB",
            group: "combination", 
            selectedTokenSets: {
              core: "source",
              "brand-b": "enabled",
              light: "enabled",
              semantic: "enabled"
            }
          }
        ]
      };

      const result = await interpretTokens(multiGroupTokens);
      
      expect(result).toHaveProperty("lightBrandA");
      expect(result).toHaveProperty("darkBrandA");
      expect(result).toHaveProperty("lightBrandB");
      
      // Brand A themes should use brand A colors
      expect(result.lightBrandA["color.accent"]).toBe("#0066cc");
      expect(result.darkBrandA["color.accent"]).toBe("#0066cc");
      
      // Brand B theme should use brand B colors  
      expect(result.lightBrandB["color.accent"]).toBe("#cc0066");
      
      // Background should vary by mode
      expect(result.lightBrandA["color.background"]).toBe("#ffffff");
      expect(result.darkBrandA["color.background"]).toBe("#000000");
      expect(result.lightBrandB["color.background"]).toBe("#ffffff");
      
      // Semantic tokens should resolve properly in all themes
      expect(result.lightBrandA["button.background"]).toBe("#0066cc");
      expect(result.darkBrandA["button.background"]).toBe("#0066cc");  
      expect(result.lightBrandB["button.background"]).toBe("#cc0066");
    });

    it("should handle disabled token sets correctly", async () => {
      const disabledSetTokens = {
        core: {
          color: { primary: { "$value": "#0066cc", "$type": "color" } }
        },
        optional: {
          color: { secondary: { "$value": "#ff6600", "$type": "color" } }
        },
        semantic: {
          button: { 
            background: { "$value": "{color.primary}", "$type": "color" },
            accent: { "$value": "{color.secondary}", "$type": "color" }
          }
        },
        "$themes": [
          {
            name: "withOptional",
            group: "test",
            selectedTokenSets: {
              core: "source",
              optional: "enabled",
              semantic: "enabled"
            }
          },
          {
            name: "withoutOptional",
            group: "test", 
            selectedTokenSets: {
              core: "source",
              optional: "disabled",
              semantic: "enabled"
            }
          }
        ]
      };

      const result = await interpretTokens(disabledSetTokens);
      
      // Theme with optional set should have both tokens
      expect(result.withOptional["button.background"]).toBe("#0066cc");
      expect(result.withOptional["button.accent"]).toBe("#ff6600");
      
      // Theme without optional set should only have core-dependent tokens
      expect(result.withoutOptional["button.background"]).toBe("#0066cc");
      expect(result.withoutOptional["button.accent"]).toBeUndefined(); // Reference to missing token
    });
  });
});