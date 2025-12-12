import { DictionarySymbol, ListSymbol, TokenSymbol } from "@interpreter/symbols";
import { processTokens } from "@src/processor/process";
import { describe, expect, it } from "vitest";

/**
 * Tests to ensure structured tokens are properly wrapped in TokenScript-compatible types:
 * - Array elements that are objects should be DictionarySymbol instances
 * - Nested objects should be DictionarySymbol instances
 * - Nested arrays should be ListSymbol instances
 *
 * This ensures TokenScript can properly understand and manipulate the token structure.
 */
describe("Structured Tokens - TokenScript Type Wrapping", () => {
  it("should wrap array elements (objects) in DictionarySymbol", () => {
    const tokens = {
      "shadow.card": {
        $type: "shadow",
        $value: [
          {
            blur: "12px",
            color: "red",
          },
        ],
      },
    };

    const result = processTokens(tokens);
    const shadowCard = result.tokens.get("shadow.card");

    expect(shadowCard).toBeInstanceOf(TokenSymbol);
    expect(Array.isArray((shadowCard as any).value)).toBe(true);

    const firstElement = (shadowCard as any).value[0];
    expect(firstElement).toBeInstanceOf(DictionarySymbol);

    // Access fields via .get() method
    const blur = firstElement.get("blur");
    expect(blur.value).toBe(12);
  });

  it("should wrap nested objects in DictionarySymbol", () => {
    const tokens = {
      config: {
        $type: "config",
        $value: {
          theme: {
            primary: "red",
            secondary: "blue",
          },
        },
      },
    };

    const result = processTokens(tokens);
    const config = result.tokens.get("config");

    expect(config).toBeInstanceOf(TokenSymbol);

    // Access nested object via .get()
    const theme = (config as any).get("theme");
    expect(theme).toBeInstanceOf(DictionarySymbol);

    // Access nested field
    const primary = theme.get("primary");
    expect(primary.value).toBe("red");
  });

  it("should wrap nested arrays in ListSymbol", () => {
    const tokens = {
      data: {
        $type: "data",
        $value: {
          items: ["a", "b", "c"],
        },
      },
    };

    const result = processTokens(tokens);
    const data = result.tokens.get("data");

    expect(data).toBeInstanceOf(TokenSymbol);

    // Access nested array via .get()
    const items = (data as any).get("items");
    expect(items).toBeInstanceOf(ListSymbol);
    expect(items.value).toHaveLength(3);
    expect(items.value[0].value).toBe("a");
  });

  it("should handle complex nested structures with arrays of objects", () => {
    const tokens = {
      spread: "4px",
      shadows: {
        $type: "shadows",
        $value: {
          items: [
            { blur: "10px", spread: "{spread}" },
            { blur: "20px", spread: "8px" },
          ],
        },
      },
    };

    const result = processTokens(tokens);
    const shadows = result.tokens.get("shadows");

    expect(shadows).toBeInstanceOf(TokenSymbol);

    // Access nested array
    const items = (shadows as any).get("items");
    expect(items).toBeInstanceOf(ListSymbol);
    expect(items.value).toHaveLength(2);

    // Array elements should be DictionarySymbol
    const firstItem = items.value[0];
    expect(firstItem).toBeInstanceOf(DictionarySymbol);

    // Access fields from array element
    const blur = firstItem.get("blur");
    expect(blur.value).toBe(10);

    const spread = firstItem.get("spread");
    expect(spread.value).toBe(4); // Reference resolved
  });

  it("should wrap deeply nested structures correctly", () => {
    const tokens = {
      theme: {
        $type: "theme",
        $value: {
          colors: {
            primary: ["red", "blue"],
            secondary: {
              light: "yellow",
              dark: "orange",
            },
          },
        },
      },
    };

    const result = processTokens(tokens);
    const theme = result.tokens.get("theme");

    // Access nested object
    const colors = (theme as any).get("colors");
    expect(colors).toBeInstanceOf(DictionarySymbol);

    // Access nested array
    const primary = colors.get("primary");
    expect(primary).toBeInstanceOf(ListSymbol);
    expect(primary.value[0].value).toBe("red");

    // Access deeply nested object
    const secondary = colors.get("secondary");
    expect(secondary).toBeInstanceOf(DictionarySymbol);
    expect(secondary.get("light").value).toBe("yellow");
  });
});
