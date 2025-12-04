import type { BaseSymbol } from "@interpreter/symbols";
import { numberWithUnitParser } from "@src/processor/object-parsers";
import { processTokens } from "@src/processor/process";
import { flattenTokensObject } from "@src/processor/utils/tokens";
import { describe, expect, it } from "vitest";

describe("Structured Tokens - Phase 1: Flattening", () => {
  it("should preserve object $value", () => {
    const input = {
      shadow: {
        $type: "shadow",
        $value: { offsetX: 2, offsetY: 4 },
      },
    };

    const result = flattenTokensObject(input);

    expect(result.get("shadow")).toEqual({
      $value: { offsetX: 2, offsetY: 4 },
      $type: "shadow",
    });
  });

  it("should preserve array $value", () => {
    const input = {
      gradient: {
        $type: "gradient",
        $value: [
          { color: "#FF0000", position: 0 },
          { color: "#00FF00", position: 1 },
        ],
      },
    };

    const result = flattenTokensObject(input);

    expect(result.get("gradient")).toEqual({
      $value: [
        { color: "#FF0000", position: 0 },
        { color: "#00FF00", position: 1 },
      ],
      $type: "gradient",
    });
  });

  it("should handle primitive $value", () => {
    const input = {
      color: {
        $value: "#FF0000",
      },
    };

    const result = flattenTokensObject(input);

    expect(result.get("color")).toEqual({
      $value: "#FF0000",
    });
  });

  it("should handle primitive $value with $type", () => {
    const input = {
      color: {
        $type: "color",
        $value: "#FF0000",
      },
    };

    const result = flattenTokensObject(input);

    expect(result.get("color")).toEqual({
      $value: "#FF0000",
      $type: "color",
    });
  });

  it("should handle nested token structure", () => {
    const input = {
      color: {
        primary: {
          $value: "#FF0000",
          $type: "color",
        },
        secondary: {
          $value: "#00FF00",
        },
      },
    };

    const result = flattenTokensObject(input);

    expect(result.get("color.primary")).toEqual({
      $value: "#FF0000",
      $type: "color",
    });
    expect(result.get("color.secondary")).toEqual({
      $value: "#00FF00",
    });
  });

  it("should handle number primitives without stringifying", () => {
    const input = {
      spacing: {
        $value: 8,
      },
    };

    const result = flattenTokensObject(input);

    expect(result.get("spacing")).toEqual({
      $value: 8,
    });
    expect(typeof result.get("spacing")?.$value).toBe("number");
  });

  it("should handle boolean primitives without stringifying", () => {
    const input = {
      flag: {
        $value: true,
      },
    };

    const result = flattenTokensObject(input);

    expect(result.get("flag")).toEqual({
      $value: true,
    });
    expect(typeof result.get("flag")?.$value).toBe("boolean");
  });

  it("should handle mixed primitive types at root level", () => {
    const input = {
      stringValue: "hello",
      numberValue: 42,
      boolValue: false,
    };

    const result = flattenTokensObject(input);

    expect(result.get("stringValue")).toEqual({ $value: "hello" });
    expect(result.get("numberValue")).toEqual({ $value: 42 });
    expect(result.get("boolValue")).toEqual({ $value: false });
  });

  it("should handle structured token with references", () => {
    const input = {
      shadow: {
        $type: "shadow",
        $value: {
          offsetX: 0,
          offsetY: "{spacing.base}",
          color: "{color.primary}",
          blur: 16,
        },
      },
    };

    const result = flattenTokensObject(input);

    expect(result.get("shadow")).toEqual({
      $value: {
        offsetX: 0,
        offsetY: "{spacing.base}",
        color: "{color.primary}",
        blur: 16,
      },
      $type: "shadow",
    });
  });
});

describe("Structured Tokens - End-to-End Resolution", () => {
  function getValue(v: unknown): unknown {
    return v && typeof v === "object" && "value" in v ? (v as BaseSymbol).value : v;
  }

  it("should resolve structured tokens with references", () => {
    const tokens = {
      "spacing.base": "8px",
      "color.primary": "#FF0000",
      "shadow.card": {
        $type: "shadow",
        $value: {
          offsetX: 0,
          offsetY: "{spacing.base}",
          color: "{color.primary}",
          blur: 16,
        },
      },
    };

    const result = processTokens(tokens, { output: "symbols" });

    const shadowCard = result.tokens.get("shadow.card");
    expect(shadowCard).toBeDefined();
    expect(shadowCard).not.toBeInstanceOf(Error);

    // shadowCard is a TokenSymbol, use .get() to access properties
    const offsetX = (shadowCard as any).get("offsetX");
    const offsetY = (shadowCard as any).get("offsetY");
    const blur = (shadowCard as any).get("blur");
    const color = (shadowCard as any).get("color");

    expect(getValue(offsetX)).toBe(0);
    expect(getValue(offsetY)).toBe(8);
    expect(getValue(blur)).toBe(16);
    expect(getValue(color)).toBe("#FF0000");
  });

  it("should handle structured tokens with only primitive values", () => {
    const tokens = {
      shadow: {
        $type: "shadow",
        $value: {
          offsetX: 2,
          offsetY: 4,
          blur: 8,
        },
      },
    };

    const result = processTokens(tokens, { output: "symbols" });

    const shadow = result.tokens.get("shadow");
    expect(shadow).toBeDefined();

    // shadow is a TokenSymbol, use .get() to access properties
    const offsetX = (shadow as any).get("offsetX");
    const offsetY = (shadow as any).get("offsetY");
    const blur = (shadow as any).get("blur");

    expect(getValue(offsetX)).toBe(2);
    expect(getValue(offsetY)).toBe(4);
    expect(getValue(blur)).toBe(8);
  });

  it("should handle structured tokens with chained references", () => {
    const tokens = {
      base: "4px",
      double: "{base} * 2",
      shadow: {
        $value: {
          offsetX: 0,
          offsetY: "{double}",
        },
      },
    };

    const result = processTokens(tokens, { output: "symbols" });

    const shadow = result.tokens.get("shadow");
    expect(shadow).toBeDefined();

    // shadow is a TokenSymbol, use .get() to access properties
    const offsetX = (shadow as any).get("offsetX");
    const offsetY = (shadow as any).get("offsetY");

    expect(getValue(offsetX)).toBe(0);
    expect(getValue(offsetY)).toBe(8);
  });

  it("should not include sub-field paths in output", () => {
    const tokens = {
      base: "8px",
      shadow: {
        $value: {
          offsetY: "{base}",
        },
      },
    };

    const result = processTokens(tokens, { output: "symbols" });

    // Main tokens should be present
    expect(result.tokens.has("base")).toBe(true);
    expect(result.tokens.has("shadow")).toBe(true);

    // Sub-field should NOT be in output
    expect(result.tokens.has("shadow.offsetY")).toBe(false);
  });

  it("should handle errors in sub-field resolution", () => {
    const tokens = {
      shadow: {
        $value: {
          offsetX: 0,
          offsetY: "{nonexistent}",
        },
      },
    };

    const result = processTokens(tokens, { output: "symbols" });

    // Check that the error is tracked for the parent token
    expect(result.errors.has("shadow")).toBe(true);
    expect(result.errors.get("shadow")).toBeInstanceOf(Error);

    // The sub-field error should NOT be in the final output (filtered out)
    expect(result.tokens.has("shadow.offsetY")).toBe(false);
    expect(result.errors.has("shadow.offsetY")).toBe(false);
  });

  it("should handle multiple structured tokens with cross-references", () => {
    const tokens = {
      "spacing.small": "4px",
      "spacing.large": "16px",
      "color.red": "#FF0000",
      "color.blue": "#0000FF",
      "shadow.small": {
        $value: {
          offsetY: "{spacing.small}",
          color: "{color.red}",
        },
      },
      "shadow.large": {
        $value: {
          offsetY: "{spacing.large}",
          color: "{color.blue}",
        },
      },
    };

    const result = processTokens(tokens, { output: "symbols" });

    const smallShadow = result.tokens.get("shadow.small");
    const largeShadow = result.tokens.get("shadow.large");

    expect(smallShadow).toBeDefined();
    expect(largeShadow).toBeDefined();

    // Use .get() to access properties from TokenSymbol
    const smallOffsetY = (smallShadow as any).get("offsetY");
    const smallColor = (smallShadow as any).get("color");
    const largeOffsetY = (largeShadow as any).get("offsetY");
    const largeColor = (largeShadow as any).get("color");

    expect(getValue(smallOffsetY)).toBe(4);
    expect(getValue(smallColor)).toBe("#FF0000");

    expect(getValue(largeOffsetY)).toBe(16);
    expect(getValue(largeColor)).toBe("#0000FF");
  });

  it("should handle non-string primitives in structured values", () => {
    const tokens = {
      config: {
        $value: {
          enabled: true,
          count: 42,
          ratio: 1.5,
        },
      },
    };

    const result = processTokens(tokens, { output: "symbols" });

    const config = result.tokens.get("config");
    expect(config).toBeDefined();

    // Use .get() to access properties from TokenSymbol
    const enabled = (config as any).get("enabled");
    const count = (config as any).get("count");
    const ratio = (config as any).get("ratio");

    expect(getValue(enabled)).toBe(true);
    expect(getValue(count)).toBe(42);
    expect(getValue(ratio)).toBe(1.5);
  });

  it("should handle nested structure references with key access", () => {
    const tokens = {
      shadow: {
        $value: { offsetX: 0 },
      },
      "shadow-offsetX": '{shadow}.get("offsetX")',
      "shadow-offsetInc": '{shadow}.get("offsetX") + 1',
    };

    const result = processTokens(tokens, { output: "symbols" });

    const someShadow = result.tokens.get("shadow");
    const testAccess = result.tokens.get("shadow-offsetX");
    const offsetXInc = result.tokens.get("shadow-offsetInc");

    expect(someShadow).toBeDefined();
    expect(testAccess).toBeDefined();

    // Use .get() to access properties from TokenSymbol
    const offsetX = (someShadow as any).get("offsetX");

    // shadow should have offsetX = 0
    expect(getValue(offsetX)).toBe(0);

    // shadow-offsetX should be able to access the offsetX key from the referenced structure using .get()
    expect(getValue(testAccess)).toBe(0);

    expect(getValue(offsetXInc)).toBe(1);
  });

  it("should parse NumberWithUnit objects using object parsers", () => {
    const tokens = {
      spacing: {
        $value: {
          small: { value: 8, unit: "px" },
          large: { value: 2, unit: "rem" },
          lol: { foo: 1 },
        },
      },
      "spacing-small": '{spacing}.get("small")',
    };

    const result = processTokens(tokens, { output: "symbols", objectParsers: [numberWithUnitParser] });

    const spacing = result.tokens.get("spacing");
    const spacingSmall = result.tokens.get("spacing-small");

    expect(spacing).toBeDefined();
    expect(spacingSmall).toBeDefined();

    // spacing-small should return a NumberWithUnitSymbol
    const smallValue = spacingSmall as BaseSymbol;
    expect(smallValue.getTypeName()).toBe("NumberWithUnit.Px");
    expect(smallValue.toString()).toBe("8px");
  });

  it("should resolve structured tokens with arrays of objects containing references", () => {
    const tokens = {
      spread: "4px",
      "shadow.card": {
        $type: "shadow",
        $value: [
          {
            blur: "12px",
            color: "red",
            inset: true,
            offsetX: "12px",
            offsetY: "1px",
            spread: "{spread}",
          },
        ],
      },
    };

    const result = processTokens(tokens, { output: "symbols" });

    const shadowCard = result.tokens.get("shadow.card");
    expect(shadowCard).toBeDefined();
    expect(shadowCard).not.toBeInstanceOf(Error);

    // shadowCard is a TokenSymbol containing an array
    const shadowArray = (shadowCard as any).value;
    expect(Array.isArray(shadowArray)).toBe(true);
    expect(shadowArray).toHaveLength(1);

    const firstShadow = shadowArray[0];
    expect(firstShadow).toBeDefined();
    expect(typeof firstShadow).toBe("object");

    // Check that fields are properly resolved
    expect(getValue(firstShadow.blur)).toBe(12);
    expect(getValue(firstShadow.color)).toBe("red");
    expect(getValue(firstShadow.inset)).toBe(true);
    expect(getValue(firstShadow.offsetX)).toBe(12);
    expect(getValue(firstShadow.offsetY)).toBe(1);
    expect(getValue(firstShadow.spread)).toBe(4); // Reference resolved

    // Sub-field paths should NOT be in the output
    expect(result.tokens.has("shadow.card[0].blur")).toBe(false);
    expect(result.tokens.has("shadow.card[0].spread")).toBe(false);
  });

  it("should handle multiple array elements with references", () => {
    const tokens = {
      "offset.small": "2px",
      "offset.large": "8px",
      "shadow.multi": {
        $type: "shadow",
        $value: [
          { offsetX: "{offset.small}", color: "red" },
          { offsetX: "{offset.large}", color: "blue" },
        ],
      },
    };

    const result = processTokens(tokens, { output: "symbols" });

    const shadowMulti = result.tokens.get("shadow.multi");
    expect(shadowMulti).toBeDefined();
    expect(shadowMulti).not.toBeInstanceOf(Error);

    const shadowArray = (shadowMulti as any).value;
    expect(Array.isArray(shadowArray)).toBe(true);
    expect(shadowArray).toHaveLength(2);

    expect(getValue(shadowArray[0].offsetX)).toBe(2);
    expect(getValue(shadowArray[0].color)).toBe("red");

    expect(getValue(shadowArray[1].offsetX)).toBe(8);
    expect(getValue(shadowArray[1].color)).toBe("blue");
  });

  it("should handle nested objects in arrays with expressions", () => {
    const tokens = {
      base: "4px",
      shadow: {
        $value: [
          {
            offsetX: "{base} * 2",
            offsetY: "{base} + 2px",
          },
        ],
      },
    };

    const result = processTokens(tokens, { output: "symbols" });

    const shadow = result.tokens.get("shadow");
    expect(shadow).toBeDefined();
    expect(shadow).not.toBeInstanceOf(Error);

    const shadowArray = (shadow as any).value;
    expect(Array.isArray(shadowArray)).toBe(true);

    expect(getValue(shadowArray[0].offsetX)).toBe(8);
    expect(getValue(shadowArray[0].offsetY)).toBe(6);
  });
});
