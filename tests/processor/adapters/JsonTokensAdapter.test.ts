import { describe, expect, it } from "vitest";
import { JsonTokensAdapter } from "@src/processor/adapters/JsonTokensAdapter";

describe("JsonTokensAdapter", () => {
  describe("flat tokens", () => {
    it("should handle flat token structure", () => {
      const adapter = JsonTokensAdapter();
      const input = {
        "color.primary": "#FF0000",
        "color.secondary": "#00FF00",
        "spacing.base": "8",
      };

      const result = adapter(input);

      expect(result.get("color.primary")).toBe("#FF0000");
      expect(result.get("color.secondary")).toBe("#00FF00");
      expect(result.get("spacing.base")).toBe("8");
    });

    it("should convert all values to strings", () => {
      const adapter = JsonTokensAdapter();
      const input = {
        number: 42,
        boolean: true,
        string: "text",
      };

      const result = adapter(input);

      expect(result.get("number")).toBe("42");
      expect(result.get("boolean")).toBe("true");
      expect(result.get("string")).toBe("text");
    });
  });

  describe("nested tokens", () => {
    it("should flatten nested tokens with $value", () => {
      const adapter = JsonTokensAdapter();
      const input = {
        color: {
          primary: {
            $value: "#FF0000",
            $type: "color",
          },
          secondary: {
            $value: "#00FF00",
            $type: "color",
          },
        },
      };

      const result = adapter(input);

      expect(result.get("color.primary")).toBe("#FF0000");
      expect(result.get("color.secondary")).toBe("#00FF00");
    });

    it("should skip metadata keys starting with $", () => {
      const adapter = JsonTokensAdapter();
      const input = {
        $schema: "https://example.com/schema.json",
        $metadata: { version: "1.0" },
        color: {
          primary: {
            $value: "#FF0000",
          },
        },
      };

      const result = adapter(input);

      expect(result.has("$schema")).toBe(false);
      expect(result.has("$metadata")).toBe(false);
      expect(result.get("color.primary")).toBe("#FF0000");
    });

    it("should handle deeply nested structure", () => {
      const adapter = JsonTokensAdapter();
      const input = {
        design: {
          tokens: {
            color: {
              brand: {
                primary: {
                  $value: "#FF0000",
                },
              },
            },
          },
        },
      };

      const result = adapter(input);

      expect(result.get("design.tokens.color.brand.primary")).toBe("#FF0000");
    });

    it("should handle legacy value property", () => {
      const adapter = JsonTokensAdapter();
      const input = {
        color: {
          primary: {
            value: "#FF0000",
          },
        },
      };

      const result = adapter(input);

      expect(result.get("color.primary")).toBe("#FF0000");
    });

    it("should handle mixed nested and flat", () => {
      const adapter = JsonTokensAdapter();
      const input = {
        color: {
          primary: {
            $value: "#FF0000",
          },
        },
        spacing: {
          base: {
            $value: "8",
          },
          double: {
            $value: "{spacing.base} * 2",
          },
        },
      };

      const result = adapter(input);

      expect(result.get("color.primary")).toBe("#FF0000");
      expect(result.get("spacing.base")).toBe("8");
      expect(result.get("spacing.double")).toBe("{spacing.base} * 2");
    });
  });

  describe("options", () => {
    it("should apply prefix to all tokens", () => {
      const adapter = JsonTokensAdapter({ prefix: "theme" });
      const input = {
        color: {
          primary: {
            $value: "#FF0000",
          },
        },
      };

      const result = adapter(input);

      expect(result.get("theme.color.primary")).toBe("#FF0000");
      expect(result.has("color.primary")).toBe(false);
    });

    it("should include metadata when skipMetadata is false", () => {
      const adapter = JsonTokensAdapter({ skipMetadata: false });
      const input = {
        $schema: "https://example.com/schema.json",
        color: {
          primary: {
            $value: "#FF0000",
          },
        },
      };

      const result = adapter(input);

      expect(result.get("$schema")).toBe("https://example.com/schema.json");
      expect(result.get("color.primary")).toBe("#FF0000");
    });
  });

  describe("error handling", () => {
    it("should throw on null input", () => {
      const adapter = JsonTokensAdapter();
      expect(() => adapter(null as any)).toThrow("Expected an object");
    });

    it("should throw on non-object input", () => {
      const adapter = JsonTokensAdapter();
      expect(() => adapter("string" as any)).toThrow("Expected an object");
    });
  });
});
