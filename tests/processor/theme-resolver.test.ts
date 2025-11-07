import { describe, expect, it } from "vitest";
import { resolveThemes, selectTheme } from "@/src/processor/utils/theme-resolver";

describe("theme-resolver", () => {
  describe("resolveThemes", () => {
    it("should return undefined when no themes are found", () => {
      const jsonFiles = {
        tokens: {
          color: {
            red: { $value: "#FF0000" },
          },
        },
      };

      const result = resolveThemes(jsonFiles);
      expect(result).toBeUndefined();
    });

    it("should return empty array for empty $themes array", () => {
      const jsonFiles = {
        $themes: [],
        color: {
          red: { $value: "#FF0000" },
        },
      };

      const result = resolveThemes(jsonFiles);
      expect(result).toBeDefined();
      expect(result?.[1]).toEqual([]);
    });

    it("should detect themes with optional Figma properties", () => {
      const jsonFiles = {
        $themes: [
          {
            name: "dark",
            selectedTokenSets: { core: "enabled" },
            figmaCollectionId: "col123",
            figmaModeId: "mode456",
            group: "Color Mode",
          },
        ],
        color: {
          red: { $value: "#FF0000" },
        },
      };

      const result = resolveThemes(jsonFiles);
      expect(result).toBeDefined();

      const themes = result?.[1];
      expect(Array.isArray(themes)).toBe(true);
      expect(themes[0]).toMatchObject({
        name: "dark",
        figmaCollectionId: "col123",
        figmaModeId: "mode456",
        group: "Color Mode",
      });
    });

    it("should detect standalone $themes file as array", () => {
      const jsonFiles = {
        $themes: [
          {
            name: "light",
            selectedTokenSets: { core: "enabled" },
          },
          {
            name: "dark",
            selectedTokenSets: { core: "enabled", dark: "enabled" },
          },
        ],
        tokens: {
          color: {
            red: { $value: "#FF0000" },
          },
        },
      };

      const result = resolveThemes(jsonFiles);
      expect(result).toBeDefined();
      expect(result?.[0]).toBe("$themes");

      const themes = result?.[1] as any[];
      expect(Array.isArray(themes)).toBe(true);
      expect(themes).toHaveLength(2);
      expect(themes[0].name).toBe("light");
      expect(themes[1].name).toBe("dark");
    });

    it("should detect standalone $themes file as object with $themes property", () => {
      const jsonFiles = {
        $themes: {
          $themes: [
            {
              name: "light",
              selectedTokenSets: { core: "enabled" },
            },
          ],
        },
        tokens: {
          color: {
            red: { $value: "#FF0000" },
          },
        },
      };

      const result = resolveThemes(jsonFiles);
      expect(result).toBeDefined();
      expect(result?.[0]).toBe("$themes");
      expect(Array.isArray(result?.[1])).toBe(true);
      expect(result?.[1]).toHaveLength(1);
      expect(result?.[1][0].name).toBe("light");
    });

    it("should prioritize single file with $themes over standalone $themes file", () => {
      const jsonFiles = {
        $themes: [
          {
            name: "embedded",
            selectedTokenSets: { core: "enabled" },
          },
        ],
        color: {
          red: { $value: "#FF0000" },
        },
      };

      const result = resolveThemes(jsonFiles);
      expect(result).toBeDefined();

      const themes = result?.[1];
      expect(Array.isArray(themes)).toBe(true);
      expect(themes[0].name).toBe("embedded");
    });

    it("should return undefined for invalid theme structure (missing name)", () => {
      const jsonFiles = {
        tokens: {
          $themes: [
            {
              selectedTokenSets: { core: "enabled" },
            },
          ],
        },
      };

      const result = resolveThemes(jsonFiles);
      expect(result).toBeUndefined();
    });

    it("should return undefined for invalid theme structure (missing selectedTokenSets)", () => {
      const jsonFiles = {
        tokens: {
          $themes: [
            {
              name: "light",
            },
          ],
        },
      };

      const result = resolveThemes(jsonFiles);
      expect(result).toBeUndefined();
    });

    it("should handle multiple files without themes", () => {
      const jsonFiles = {
        core: {
          color: {
            red: { $value: "#FF0000" },
          },
        },
        semantic: {
          color: {
            primary: { $value: "{color.red}" },
          },
        },
      };

      const result = resolveThemes(jsonFiles);
      expect(result).toBeUndefined();
    });
  });

  describe("selectTheme", () => {
    const themes = [
      {
        name: "light",
        selectedTokenSets: { core: "enabled" },
      },
      {
        name: "dark",
        selectedTokenSets: { core: "enabled", dark: "enabled" },
      },
      {
        name: "high-contrast",
        selectedTokenSets: { core: "enabled", "high-contrast": "enabled" },
      },
    ];

    it("should select theme by name", () => {
      const theme = selectTheme(themes as any, "dark");
      expect(theme).toBeDefined();
      expect(theme?.name).toBe("dark");
    });

    it("should return undefined if theme not found", () => {
      const theme = selectTheme(themes as any, "nonexistent");
      expect(theme).toBeUndefined();
    });

    it("should select first theme when name matches", () => {
      const theme = selectTheme(themes as any, "light");
      expect(theme).toBeDefined();
      expect(theme?.name).toBe("light");
    });

    it("should select last theme when name matches", () => {
      const theme = selectTheme(themes as any, "high-contrast");
      expect(theme).toBeDefined();
      expect(theme?.name).toBe("high-contrast");
    });

    it("should handle empty array", () => {
      const theme = selectTheme([], "any");
      expect(theme).toBeUndefined();
    });

    it("should be case-sensitive", () => {
      const theme = selectTheme(themes as any, "Dark");
      expect(theme).toBeUndefined();
    });
  });
});
