import { describe, expect, it } from "vitest";
import { NullSymbol } from "@src/interpreter/symbols";

describe("NullSymbol", () => {
  describe("constructor", () => {
    it("should create null symbol", () => {
      const nullSym = new NullSymbol();
      expect(nullSym.value).toBe(null);
      expect(nullSym.type).toBe("Null");
    });
  });

  describe("deepCopy", () => {
    it("should create a deep copy", () => {
      const original = new NullSymbol();
      const copy = original.deepCopy();

      expect(copy).not.toBe(original);
      expect(copy.value).toBe(null);
      expect(copy.type).toBe("Null");
    });
  });

  describe("toString", () => {
    it("should return 'null'", () => {
      const nullSym = new NullSymbol();
      expect(nullSym.toString()).toBe("null");
    });
  });

  describe("validValue", () => {
    it("should validate null/undefined values", () => {
      const nullSym = new NullSymbol();
      expect(nullSym.validValue(null)).toBe(true);
      expect(nullSym.validValue(undefined)).toBe(true);
      expect(nullSym.validValue("string")).toBe(false);
      expect(nullSym.validValue(42)).toBe(false);
      expect(nullSym.validValue(true)).toBe(false);
    });
  });

  describe("equals", () => {
    it("should equal other NullSymbol instances", () => {
      const null1 = new NullSymbol();
      const null2 = new NullSymbol();

      expect(null1.equals(null2)).toBe(true);
    });

    it("should not equal non-null symbols", () => {
      const nullSym = new NullSymbol();
      const mockSymbol = {
        type: "String",
        value: "test",
        validValue: () => false,
        deepCopy: () => mockSymbol,
        toString: () => "test",
        getTypeName: () => "String",
        typeEquals: () => false,
        equals: () => false,
      };

      expect(nullSym.equals(mockSymbol as any)).toBe(false);
    });
  });

  describe("getTypeName", () => {
    it("should return 'Null'", () => {
      const nullSym = new NullSymbol();
      expect(nullSym.getTypeName()).toBe("Null");
    });
  });

  describe("typeEquals", () => {
    it("should match other null types", () => {
      const null1 = new NullSymbol();
      const null2 = new NullSymbol();

      expect(null1.typeEquals(null2)).toBe(true);
    });

    it("should not match non-null types", () => {
      const nullSym = new NullSymbol();
      const mockSymbol = {
        type: "String",
        value: "test",
        validValue: () => false,
        deepCopy: () => mockSymbol,
        toString: () => "test",
        getTypeName: () => "String",
        typeEquals: () => false,
        equals: () => false,
      };

      expect(nullSym.typeEquals(mockSymbol as any)).toBe(false);
    });
  });

  describe("static methods", () => {
    it("should create empty null symbol", () => {
      const empty = NullSymbol.empty();
      expect(empty.value).toBe(null);
      expect(empty.type).toBe("Null");
    });
  });

  describe("static readonly type", () => {
    it("should have correct static type property", () => {
      expect(NullSymbol.type).toBe("Null");
    });
  });
});