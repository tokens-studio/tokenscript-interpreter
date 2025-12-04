import { NumberSymbol, StringSymbol, TokenSymbol } from "@interpreter/symbols";
import { createTokenSymbol, defaultObjectParsers, numberWithUnitParser, type ObjectParser } from "@src/processor/object-parsers";
import type { ISymbolType } from "@src/types";
import { describe, expect, it } from "vitest";

describe("Object Parsers", () => {
  describe("numberWithUnitParser", () => {
    it("should match valid NumberWithUnit objects", () => {
      expect(numberWithUnitParser.predicate({ value: 1, unit: "rem" })).toBe(true);
      expect(numberWithUnitParser.predicate({ value: 8, unit: "px" })).toBe(true);
      expect(numberWithUnitParser.predicate({ value: 1.5, unit: "em" })).toBe(true);
    });

    it("should not match invalid objects", () => {
      expect(numberWithUnitParser.predicate({ value: 1 })).toBe(false);
      expect(numberWithUnitParser.predicate({ unit: "rem" })).toBe(false);
      expect(numberWithUnitParser.predicate({ value: "1", unit: "rem" })).toBe(false);
      expect(numberWithUnitParser.predicate({ value: 1, unit: 2 })).toBe(false);
      expect(numberWithUnitParser.predicate({ value: 1, unit: "rem", extra: "field" })).toBe(false);
      expect(numberWithUnitParser.predicate(null)).toBe(false);
      expect(numberWithUnitParser.predicate(undefined)).toBe(false);
      expect(numberWithUnitParser.predicate(42)).toBe(false);
      expect(numberWithUnitParser.predicate("text")).toBe(false);
    });

    it("should convert to NumberWithUnitSymbol", () => {
      const symbol = numberWithUnitParser.toSymbol({ value: 8, unit: "px" });
      expect(symbol.getTypeName()).toBe("NumberWithUnit.Px");
      expect(symbol.toString()).toBe("8px");
    });
  });

  describe("defaultObjectParsers", () => {
    it("should be empty by default", () => {
      expect(defaultObjectParsers).toEqual([]);
    });
  });

  describe("createTokenSymbol with object parsers", () => {
    it("should parse NumberWithUnit objects in structured tokens", () => {
      const token = createTokenSymbol(
        {
          offsetX: { value: 8, unit: "px" },
          offsetY: { value: 2, unit: "rem" },
          blur: 16,
        },
        "shadow",
        undefined,
        [numberWithUnitParser],
      );

      expect(token).toBeInstanceOf(TokenSymbol);
      expect(token.getTypeName()).toBe("Token.Shadow");

      const offsetX = token.get(new StringSymbol("offsetX"));
      expect(offsetX.getTypeName()).toBe("NumberWithUnit.Px");
      expect(offsetX.toString()).toBe("8px");

      const offsetY = token.get(new StringSymbol("offsetY"));
      expect(offsetY.getTypeName()).toBe("NumberWithUnit.Rem");
      expect(offsetY.toString()).toBe("2rem");

      const blur = token.get(new StringSymbol("blur"));
      expect(blur).toBeInstanceOf(NumberSymbol);
      expect(blur.toString()).toBe("16");
    });

    it("should handle custom object parsers", () => {
      // Custom parser for color objects { r: number, g: number, b: number }
      const rgbParser: ObjectParser = {
        predicate: (value: unknown): boolean => {
          if (typeof value !== "object" || value === null) return false;
          const obj = value as Record<string, unknown>;
          return (
            "r" in obj &&
            "g" in obj &&
            "b" in obj &&
            typeof obj.r === "number" &&
            typeof obj.g === "number" &&
            typeof obj.b === "number" &&
            Object.keys(obj).length === 3
          );
        },
        toSymbol: (value: any): ISymbolType => {
          const { r, g, b } = value;
          const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
          return new StringSymbol(hex.toUpperCase());
        },
      };

      const token = createTokenSymbol(
        {
          primary: { r: 255, g: 0, b: 0 },
          secondary: { r: 0, g: 255, b: 0 },
        },
        "colors",
        undefined,
        [rgbParser],
      );

      const primary = token.get(new StringSymbol("primary"));
      expect(primary).toBeInstanceOf(StringSymbol);
      expect(primary.toString()).toBe("#FF0000");

      const secondary = token.get(new StringSymbol("secondary"));
      expect(secondary).toBeInstanceOf(StringSymbol);
      expect(secondary.toString()).toBe("#00FF00");
    });

    it("should apply parsers in order", () => {
      // First parser matches { value: number, unit: string }
      // Second parser (lower priority) also matches but won't be used
      const alwaysMatchParser: ObjectParser = {
        predicate: () => true,
        toSymbol: () => new StringSymbol("always-matched"),
      };

      const token = createTokenSymbol(
        {
          spacing: { value: 8, unit: "px" },
        },
        "test",
        undefined,
        [numberWithUnitParser, alwaysMatchParser],
      );

      const spacing = token.get(new StringSymbol("spacing"));
      // Should match numberWithUnitParser first
      expect(spacing.getTypeName()).toBe("NumberWithUnit.Px");
    });

    it("should fallback to default conversion when no parser matches", () => {
      const customParser: ObjectParser = {
        predicate: (_value) => false, // Never matches
        toSymbol: () => new StringSymbol("never-used"),
      };

      const token = createTokenSymbol(
        {
          text: "hello",
          count: 42,
          enabled: true,
        },
        "config",
        undefined,
        [customParser],
      );

      const text = token.get(new StringSymbol("text"));
      expect(text).toBeInstanceOf(StringSymbol);
      expect(text.toString()).toBe("hello");

      const count = token.get(new StringSymbol("count"));
      expect(count).toBeInstanceOf(NumberSymbol);
      expect(count.toString()).toBe("42");
    });
  });
});
