import { describe, expect, it } from "vitest";
import { JsonTokensAdapter, ThemeTokensAdapter, TokenProcessor } from "@src/processor";

// Helper to extract value from Symbol or return as-is
const getValue = (v: any) => (v && typeof v === "object" && "value" in v ? v.value : v);

describe("TokenProcessor Integration", () => {
  describe("with JsonTokensAdapter", () => {
    it("should process nested JSON tokens", () => {
      const processor = new TokenProcessor();
      const adapter = JsonTokensAdapter();

      const input = {
        spacing: {
          base: {
            $value: "8",
          },
          small: {
            $value: "{spacing.base} / 2",
          },
          large: {
            $value: "{spacing.base} * 2",
          },
        },
      };

      const result = processor.build(input, adapter);

      expect(getValue(result.tokens.get("spacing.base"))).toBe(8);
      expect(getValue(result.tokens.get("spacing.small"))).toBe(4);
      expect(getValue(result.tokens.get("spacing.large"))).toBe(16);
      expect(result.errors.size).toBe(0);
    });

    it("should process flat JSON tokens", () => {
      const processor = new TokenProcessor();
      const adapter = JsonTokensAdapter();

      const input = {
        "color.primary": "#FF0000",
        "color.secondary": "{color.primary}",
      };

      const result = processor.build(input, adapter);

      expect(getValue(result.tokens.get("color.primary"))).toBe("#FF0000");
      expect(getValue(result.tokens.get("color.secondary"))).toBe("#FF0000");
      expect(result.errors.size).toBe(0);
    });

    it("should handle complex expressions with references", () => {
      const processor = new TokenProcessor();
      const adapter = JsonTokensAdapter();

      const input = {
        values: {
          a: { $value: "10" },
          b: { $value: "20" },
          sum: { $value: "{values.a} + {values.b}" },
          product: { $value: "{values.a} * {values.b}" },
          complex: { $value: "({values.sum} + {values.product}) / 2" },
        },
      };

      const result = processor.build(input, adapter);

      expect(getValue(result.tokens.get("values.a"))).toBe(10);
      expect(getValue(result.tokens.get("values.b"))).toBe(20);
      expect(getValue(result.tokens.get("values.sum"))).toBe(30);
      expect(getValue(result.tokens.get("values.product"))).toBe(200);
      expect(getValue(result.tokens.get("values.complex"))).toBe(115);
      expect(result.errors.size).toBe(0);
    });

    it("should handle errors gracefully", () => {
      const processor = new TokenProcessor();
      const adapter = JsonTokensAdapter();

      const input = {
        valid: {
          $value: "10",
        },
        invalid: {
          $value: "{nonexistent} + 5",
        },
      };

      const result = processor.build(input, adapter);

      expect(getValue(result.tokens.get("valid"))).toBe(10);
      expect(result.tokens.get("invalid")).toBe("{nonexistent} + 5");
      expect(result.errors.size).toBe(2); // nonexistent + invalid
    });
  });

  describe("with ThemeTokensAdapter", () => {
    it("should process theme-based tokens", () => {
      const processor = new TokenProcessor();
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
            text: {
              $value: "#000000",
            },
          },
        },
      };

      const result = processor.build(input, adapter);

      expect(getValue(result.tokens.get("spacing.base"))).toBe(8);
      expect(getValue(result.tokens.get("color.background"))).toBe("#FFFFFF");
      expect(getValue(result.tokens.get("color.text"))).toBe("#000000");
      expect(result.errors.size).toBe(0);
    });

    it("should resolve references across token sets", () => {
      const processor = new TokenProcessor();
      const adapter = ThemeTokensAdapter({ themeName: "light" });

      const input = {
        $themes: [
          {
            name: "light",
            selectedTokenSets: {
              base: "enabled",
              derived: "enabled",
            },
          },
        ],
        base: {
          spacing: {
            base: {
              $value: "8",
            },
          },
        },
        derived: {
          spacing: {
            double: {
              $value: "{spacing.base} * 2",
            },
            triple: {
              $value: "{spacing.base} * 3",
            },
          },
        },
      };

      const result = processor.build(input, adapter);

      expect(getValue(result.tokens.get("spacing.base"))).toBe(8);
      expect(getValue(result.tokens.get("spacing.double"))).toBe(16);
      expect(getValue(result.tokens.get("spacing.triple"))).toBe(24);
      expect(result.errors.size).toBe(0);
    });
  });

  describe("with direct Map input", () => {
    it("should process flat token map directly", () => {
      const processor = new TokenProcessor();

      const tokens = new Map([
        ["a", "10"],
        ["b", "{a} * 2"],
        ["c", "{a} + {b}"],
      ]);

      const result = processor.build(tokens);

      expect(getValue(result.tokens.get("a"))).toBe(10);
      expect(getValue(result.tokens.get("b"))).toBe(20);
      expect(getValue(result.tokens.get("c"))).toBe(30);
      expect(result.errors.size).toBe(0);
    });
  });

  describe("custom adapters", () => {
    it("should work with custom adapter functions", () => {
      const processor = new TokenProcessor();

      // Custom adapter that prefixes all keys with "custom."
      const customAdapter = (input: Record<string, string>): Map<string, string> => {
        const map = new Map<string, string>();
        for (const [key, value] of Object.entries(input)) {
          map.set(`custom.${key}`, value);
        }
        return map;
      };

      const input = {
        a: "10",
        b: "{custom.a} * 2",
      };

      const result = processor.build(input, customAdapter);

      expect(getValue(result.tokens.get("custom.a"))).toBe(10);
      expect(getValue(result.tokens.get("custom.b"))).toBe(20);
      expect(result.errors.size).toBe(0);
    });

    it("should compose adapters", () => {
      const processor = new TokenProcessor();

      // Create a composed adapter that flattens then prefixes
      const composedAdapter = (input: Record<string, any>): Map<string, string> => {
        const jsonAdapter = JsonTokensAdapter();
        const tokens = jsonAdapter(input);

        // Add prefix to all tokens
        const prefixed = new Map<string, string>();
        for (const [key, value] of tokens) {
          prefixed.set(`app.${key}`, value);
        }
        return prefixed;
      };

      const input = {
        color: {
          primary: {
            $value: "#FF0000",
          },
        },
      };

      const result = processor.build(input, composedAdapter);

      expect(getValue(result.tokens.get("app.color.primary"))).toBe("#FF0000");
      expect(result.errors.size).toBe(0);
    });
  });
});
