import { Config } from "@interpreter/config/config";
import {
  BooleanSymbol,
  ColorSymbol,
  ListSymbol,
  NullSymbol,
  NumberSymbol,
  NumberWithUnitSymbol,
  StringSymbol,
  getResultTypeName,
  isTokenscriptSymbol,
  typeEquals,
  typeName,
} from "@interpreter/symbols";
import { describe, expect, test } from "vitest";

describe("Symbol Utilities", () => {
  const config = new Config();

  describe("isTokenscriptSymbol", () => {
    test("returns true for ISymbolType instances", () => {
      expect(isTokenscriptSymbol(new NumberSymbol(42, config))).toBe(true);
      expect(isTokenscriptSymbol(new StringSymbol("test", config))).toBe(true);
      expect(isTokenscriptSymbol(new BooleanSymbol(true, config))).toBe(true);
      expect(isTokenscriptSymbol(new NullSymbol(config))).toBe(true);
    });

    test("returns false for non-symbol types", () => {
      expect(isTokenscriptSymbol(null)).toBe(false);
      expect(isTokenscriptSymbol(undefined)).toBe(false);
      expect(isTokenscriptSymbol("string")).toBe(false);
      expect(isTokenscriptSymbol(123)).toBe(false);
      expect(isTokenscriptSymbol({})).toBe(false);
      expect(isTokenscriptSymbol([])).toBe(false);
    });
  });

  describe("typeEquals", () => {
    test("compares types case-insensitively", () => {
      expect(typeEquals("number", "NUMBER")).toBe(true);
      expect(typeEquals("String", "string")).toBe(true);
      expect(typeEquals("Boolean", "BOOLEAN")).toBe(true);
    });

    test("returns false for different types", () => {
      expect(typeEquals("number", "string")).toBe(false);
      expect(typeEquals("Boolean", "Number")).toBe(false);
    });

    test("handles null values", () => {
      expect(typeEquals(null, null)).toBe(true);
      expect(typeEquals(null, "string")).toBe(false);
      expect(typeEquals("string", null)).toBe(false);
    });
  });

  describe("typeName", () => {
    test("capitalizes base type", () => {
      expect(typeName("number")).toBe("Number");
      expect(typeName("string")).toBe("String");
      expect(typeName("boolean")).toBe("Boolean");
    });

    test("formats compound types with subtype", () => {
      expect(typeName("color", "hex")).toBe("Color.Hex");
      expect(typeName("number", "px")).toBe("Number.Px");
    });
  });

  describe("getResultTypeName", () => {
    test("returns 'Null' for null", () => {
      expect(getResultTypeName(null)).toBe("Null");
    });

    test("returns 'String' for string values", () => {
      expect(getResultTypeName("hello")).toBe("String");
      expect(getResultTypeName("")).toBe("String");
    });

    test("returns type name from ISymbolType.getTypeName()", () => {
      expect(getResultTypeName(new NumberSymbol(42, config))).toBe("Number");
      expect(getResultTypeName(new StringSymbol("test", config))).toBe("String");
      expect(getResultTypeName(new BooleanSymbol(true, config))).toBe("Boolean");
      expect(getResultTypeName(new NullSymbol(config))).toBe("Null");
      expect(getResultTypeName(new NumberWithUnitSymbol(10, "px", config))).toBe("NumberWithUnit.Px");
      expect(getResultTypeName(new ColorSymbol("#ff0000", "Hex", config))).toBe("Color.Hex");
      expect(getResultTypeName(new ListSymbol([new NumberSymbol(1, config)], false, config))).toBe("List");
      expect(getResultTypeName(new ListSymbol([new NumberSymbol(1, config)], true, config))).toBe("List.Implicit");
    });

    test("returns 'Unknown' for objects without getTypeName", () => {
      expect(getResultTypeName({})).toBe("Unknown");
      expect(getResultTypeName({ a: 1 })).toBe("Unknown");
    });

    test("returns 'Unknown' for other types", () => {
      expect(getResultTypeName(123)).toBe("Unknown");
      expect(getResultTypeName(true)).toBe("Unknown");
      expect(getResultTypeName([])).toBe("Unknown");
      expect(getResultTypeName(undefined)).toBe("Unknown");
    });
  });
});
