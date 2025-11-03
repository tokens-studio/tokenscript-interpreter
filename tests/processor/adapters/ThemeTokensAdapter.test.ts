import { describe, expect, it } from "vitest";
import { ThemeTokensAdapter } from "@src/processor/adapters/ThemeTokensAdapter";

describe("ThemeTokensAdapter", () => {
  describe("basic theme extraction", () => {
    it("should extract tokens from first theme by default", () => {
      const adapter = ThemeTokensAdapter();
      const input = {
        $themes: [
          {
            name: "light",
            selectedTokenSets: {
              global: "enabled",
            },
          },
        ],
        global: {
          color: {
            primary: {
              $value: "#FF0000",
            },
          },
        },
      };

      const result = adapter(input);

      expect(result.get("color.primary")).toBe("#FF0000");
    });

    it("should extract tokens from named theme", () => {
      const adapter = ThemeTokensAdapter({ themeName: "dark" });
      const input = {
        $themes: [
          {
            name: "light",
            selectedTokenSets: {
              light: "enabled",
            },
          },
          {
            name: "dark",
            selectedTokenSets: {
              dark: "enabled",
            },
          },
        ],
        light: {
          color: {
            background: {
              $value: "#FFFFFF",
            },
          },
        },
        dark: {
          color: {
            background: {
              $value: "#000000",
            },
          },
        },
      };

      const result = adapter(input);

      expect(result.get("color.background")).toBe("#000000");
      expect(result.has("color.background")).toBe(true);
    });

    it("should merge multiple token sets", () => {
      const adapter = ThemeTokensAdapter({ themeName: "light" });
      const input = {
        $themes: [
          {
            name: "light",
            selectedTokenSets: {
              global: "enabled",
              light: "enabled",
            },
          },
        ],
        global: {
          spacing: {
            base: {
              $value: "8",
            },
          },
        },
        light: {
          color: {
            background: {
              $value: "#FFFFFF",
            },
          },
        },
      };

      const result = adapter(input);

      expect(result.get("spacing.base")).toBe("8");
      expect(result.get("color.background")).toBe("#FFFFFF");
    });

    it("should override tokens from earlier sets", () => {
      const adapter = ThemeTokensAdapter({ themeName: "theme" });
      const input = {
        $themes: [
          {
            name: "theme",
            selectedTokenSets: {
              base: "enabled",
              override: "enabled",
            },
          },
        ],
        base: {
          color: {
            primary: {
              $value: "#FF0000",
            },
          },
        },
        override: {
          color: {
            primary: {
              $value: "#00FF00",
            },
          },
        },
      };

      const result = adapter(input);

      expect(result.get("color.primary")).toBe("#00FF00");
    });
  });

  describe("array format for selectedTokenSets", () => {
    it("should handle array format with id and status", () => {
      const adapter = ThemeTokensAdapter({ themeName: "light" });
      const input = {
        $themes: [
          {
            name: "light",
            selectedTokenSets: [
              { id: "global", status: "enabled" },
              { id: "light", status: "source" },
            ],
          },
        ],
        global: {
          spacing: {
            base: {
              $value: "8",
            },
          },
        },
        light: {
          color: {
            background: {
              $value: "#FFFFFF",
            },
          },
        },
      };

      const result = adapter(input);

      expect(result.get("spacing.base")).toBe("8");
      expect(result.get("color.background")).toBe("#FFFFFF");
    });

    it("should skip disabled token sets", () => {
      const adapter = ThemeTokensAdapter({ themeName: "theme" });
      const input = {
        $themes: [
          {
            name: "theme",
            selectedTokenSets: [
              { id: "enabled-set", status: "enabled" },
              { id: "disabled-set", status: "disabled" },
            ],
          },
        ],
        "enabled-set": {
          color: {
            primary: {
              $value: "#FF0000",
            },
          },
        },
        "disabled-set": {
          color: {
            secondary: {
              $value: "#00FF00",
            },
          },
        },
      };

      const result = adapter(input);

      expect(result.get("color.primary")).toBe("#FF0000");
      expect(result.has("color.secondary")).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should throw on null input", () => {
      const adapter = ThemeTokensAdapter();
      expect(() => adapter(null as any)).toThrow("Expected an object");
    });

    it("should throw on missing $themes", () => {
      const adapter = ThemeTokensAdapter();
      const input = {
        color: {
          primary: {
            $value: "#FF0000",
          },
        },
      };

      expect(() => adapter(input)).toThrow("Expected $themes array");
    });

    it("should throw when theme not found", () => {
      const adapter = ThemeTokensAdapter({ themeName: "nonexistent" });
      const input = {
        $themes: [
          {
            name: "light",
            selectedTokenSets: {},
          },
        ],
      };

      expect(() => adapter(input)).toThrow("Theme 'nonexistent' not found");
    });

    it("should throw when no themes available", () => {
      const adapter = ThemeTokensAdapter();
      const input = {
        $themes: [],
      };

      expect(() => adapter(input)).toThrow("No themes found");
    });
  });
});
