import { describe, expect, it } from "vitest";
import { BooleanSymbol } from "@src/interpreter/symbols";
import { InterpreterError } from "@src/interpreter/errors";

describe("BooleanSymbol", () => {
  describe("constructor", () => {
    it("should create boolean from boolean value", () => {
      const bool = new BooleanSymbol(true);
      expect(bool.value).toBe(true);
    });

    it("should create false boolean", () => {
      const bool = new BooleanSymbol(false);
      expect(bool.value).toBe(false);
    });

    it("should create from another BooleanSymbol", () => {
      const original = new BooleanSymbol(true);
      const copy = new BooleanSymbol(original);
      expect(copy.value).toBe(true);
    });

    it("should create null boolean", () => {
      const bool = new BooleanSymbol(null);
      expect(bool.value).toBe(null);
    });

    it("should throw error for invalid types", () => {
      expect(() => new BooleanSymbol("true" as any)).toThrow(InterpreterError);
      expect(() => new BooleanSymbol(1 as any)).toThrow(InterpreterError);
    });
  });

  describe("deepCopy", () => {
    it("should create a deep copy of true", () => {
      const original = new BooleanSymbol(true);
      const copy = original.deepCopy();

      expect(copy).not.toBe(original);
      expect(copy.value).toBe(true);
    });

    it("should create a deep copy of false", () => {
      const original = new BooleanSymbol(false);
      const copy = original.deepCopy();

      expect(copy).not.toBe(original);
      expect(copy.value).toBe(false);
    });

    it("should create a deep copy of null boolean", () => {
      const original = new BooleanSymbol(null);
      const copy = original.deepCopy();

      expect(copy).not.toBe(original);
      expect(copy.value).toBe(null);
    });
  });

  describe("toString", () => {
    it("should convert true to string", () => {
      const bool = new BooleanSymbol(true);
      expect(bool.toString()).toBe("true");
    });

    it("should convert false to string", () => {
      const bool = new BooleanSymbol(false);
      expect(bool.toString()).toBe("false");
    });

    it("should handle null value", () => {
      const bool = new BooleanSymbol(null);
      expect(bool.toString()).toBe("null");
    });
  });

  describe("validValue", () => {
    it("should validate boolean values", () => {
      const bool = new BooleanSymbol(true);
      expect(bool.validValue(true)).toBe(true);
      expect(bool.validValue(false)).toBe(true);
      expect(bool.validValue(new BooleanSymbol(true))).toBe(true);
      expect(bool.validValue("true")).toBe(false);
      expect(bool.validValue(1)).toBe(false);
    });
  });

  describe("equals", () => {
    it("should compare booleans correctly", () => {
      const bool1 = new BooleanSymbol(true);
      const bool2 = new BooleanSymbol(true);
      const bool3 = new BooleanSymbol(false);

      expect(bool1.equals(bool2)).toBe(true);
      expect(bool1.equals(bool3)).toBe(false);
    });

    it("should handle null values", () => {
      const bool1 = new BooleanSymbol(null);
      const bool2 = new BooleanSymbol(null);
      const bool3 = new BooleanSymbol(true);

      expect(bool1.equals(bool2)).toBe(true);
      expect(bool1.equals(bool3)).toBe(false);
    });
  });

  describe("expectSafeValue", () => {
    it("should not throw for valid boolean values", () => {
      const bool = new BooleanSymbol(true);
      expect(() => bool.expectSafeValue(true)).not.toThrow();
      expect(() => bool.expectSafeValue(false)).not.toThrow();
    });

    it("should throw for null/undefined values", () => {
      const bool = new BooleanSymbol(true);
      expect(() => bool.expectSafeValue(null)).toThrow(InterpreterError);
      expect(() => bool.expectSafeValue(undefined)).toThrow(InterpreterError);
    });
  });

  describe("static methods", () => {
    it("should create empty boolean", () => {
      const empty = BooleanSymbol.empty();
      expect(empty.value).toBe(null);
    });
  });
});