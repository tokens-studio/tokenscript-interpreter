import { NumberSymbol, StringSymbol } from "@interpreter/symbols";
import { MapBuilder } from "@src/processor/builders/MapBuilder";
import { FlatObjectBuilder, NestedObjectBuilder } from "@src/processor/builders/ObjectBuilder";
import { describe, expect, it } from "vitest";

describe("Token Builders", () => {
  describe("NestedObjectBuilder", () => {
    it("should build a nested object from flat token paths", () => {
      const builder = new NestedObjectBuilder();
      builder.onResolve("spacing.simple.1", new StringSymbol("1px"));
      builder.onResolve("spacing.simple.2", new StringSymbol("2px"));
      builder.onResolve("spacing-ref", new StringSymbol("1px"));

      const result = builder.getResult();

      expect(result).toEqual({
        spacing: {
          simple: {
            "1": "1px",
            "2": "2px",
          },
        },
        "spacing-ref": "1px",
      });
    });

    it("should handle errors by storing the original value", () => {
      const builder = new NestedObjectBuilder();
      builder.onResolve("color.primary", new NumberSymbol(123));
      builder.onError("color.secondary", new Error("Test Error"), "original-value");

      const result = builder.getResult();

      expect(result).toEqual({
        color: {
          primary: 123,
          secondary: "original-value",
        },
      });
    });
  });

  describe("FlatObjectBuilder", () => {
    it("should build a flat object from token paths", () => {
      const builder = new FlatObjectBuilder();
      builder.onResolve("spacing.simple.1", new StringSymbol("1px"));
      builder.onResolve("spacing.simple.2", new StringSymbol("2px"));
      builder.onResolve("spacing-ref", new StringSymbol("1px"));

      const result = builder.getResult();

      expect(result).toEqual({
        "spacing.simple.1": "1px",
        "spacing.simple.2": "2px",
        "spacing-ref": "1px",
      });
    });

    it("should handle errors by storing the original value", () => {
      const builder = new FlatObjectBuilder();
      builder.onResolve("color.primary", new NumberSymbol(123));
      builder.onError("color.secondary", new Error("Test Error"), "original-value");

      const result = builder.getResult();

      expect(result).toEqual({
        "color.primary": 123,
        "color.secondary": "original-value",
      });
    });
  });

  describe("MapBuilder", () => {
    it('should build a map with string values when output is "string"', () => {
      const builder = new MapBuilder("string");
      builder.onResolve("spacing.simple.1", new StringSymbol("1px"));
      builder.onResolve("spacing.simple.2", new StringSymbol("2px"));
      builder.onResolve("spacing-ref", new StringSymbol("1px"));

      const result = builder.getResult();
      expect(result).toEqual(
        new Map([
          ["spacing.simple.1", "1px"],
          ["spacing.simple.2", "2px"],
          ["spacing-ref", "1px"],
        ]),
      );
    });

    it('should build a map with symbol values when output is "symbols"', () => {
      const builder = new MapBuilder("symbols");
      const symbol1 = new StringSymbol("1px");
      const symbol2 = new StringSymbol("2px");
      const symbolRef = new StringSymbol("1px");
      builder.onResolve("spacing.simple.1", symbol1);
      builder.onResolve("spacing.simple.2", symbol2);
      builder.onResolve("spacing-ref", symbolRef);

      const result = builder.getResult();
      expect(result).toEqual(
        new Map([
          ["spacing.simple.1", symbol1],
          ["spacing.simple.2", symbol2],
          ["spacing-ref", symbolRef],
        ]),
      );
    });

    it("should handle errors by storing the original value", () => {
      const builder = new MapBuilder();
      builder.onError("a", new Error("Test Error"), "original-value");

      const result = builder.getResult();
      expect(result.get("a")).toBe("original-value");
    });

    it("should return resolved tokens", () => {
      const builder = new MapBuilder();
      const numSymbol = new NumberSymbol(123);
      builder.onResolve("a", numSymbol);
      builder.onError("b", new Error("Test Error"), "original-value");

      const result = builder.getResolvedTokens();
      expect(result.size).toBe(1);
      expect(result.get("a")).toBe(numSymbol);
    });
  });
});
