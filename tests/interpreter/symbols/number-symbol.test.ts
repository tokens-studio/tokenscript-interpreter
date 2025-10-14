import { describe, expect, it } from "vitest";
import { NumberSymbol, StringSymbol } from "@src/interpreter/symbols";
import { InterpreterError } from "@src/interpreter/errors";

describe("NumberSymbol", () => {
  describe("constructor", () => {
    it("should create number from numeric value", () => {
      const num = new NumberSymbol(42);
      expect(num.value).toBe(42);
      expect(num.isFloat).toBe(false);
    });

    it("should create float number", () => {
      const num = new NumberSymbol(3.14, true);
      expect(num.value).toBe(3.14);
      expect(num.isFloat).toBe(true);
    });

    it("should create from another NumberSymbol", () => {
      const original = new NumberSymbol(42);
      const copy = new NumberSymbol(original);
      expect(copy.value).toBe(42);
    });

    it("should create null number", () => {
      const num = new NumberSymbol(null);
      expect(num.value).toBe(null);
    });

    it("should throw error for invalid types", () => {
      expect(() => new NumberSymbol("invalid" as any)).toThrow(InterpreterError);
    });
  });

  describe("deepCopy", () => {
    it("should create a deep copy of integer", () => {
      const original = new NumberSymbol(42);
      const copy = original.deepCopy();

      expect(copy).not.toBe(original);
      expect(copy.value).toBe(42);
      expect(copy.isFloat).toBe(false);
    });

    it("should create a deep copy of float", () => {
      const original = new NumberSymbol(3.14, true);
      const copy = original.deepCopy();

      expect(copy).not.toBe(original);
      expect(copy.value).toBe(3.14);
      expect(copy.isFloat).toBe(true);
    });

    it("should create a deep copy of null number", () => {
      const original = new NumberSymbol(null);
      const copy = original.deepCopy();

      expect(copy).not.toBe(original);
      expect(copy.value).toBe(null);
    });
  });

  describe("toString", () => {
    it("should convert integer to string", () => {
      const num = new NumberSymbol(42);
      expect(num.toString()).toBe("42");
    });

    it("should convert float to string", () => {
      const num = new NumberSymbol(3.14, true);
      expect(num.toString()).toBe("3.14");
    });

    it("should handle integer stored as float", () => {
      const num = new NumberSymbol(5.0, false);
      expect(num.toString()).toBe("5");
    });
  });

  describe("toStringImpl", () => {
    it("should convert to string without radix", () => {
      const num = new NumberSymbol(42);
      const result = num.toStringImpl();
      expect(result).toBeInstanceOf(StringSymbol);
      expect(result.value).toBe("42");
    });

    it("should convert to binary with radix 2", () => {
      const num = new NumberSymbol(10);
      const result = num.toStringImpl(new NumberSymbol(2));
      expect(result.value).toBe("1010");
    });

    it("should convert to hexadecimal with radix 16", () => {
      const num = new NumberSymbol(255);
      const result = num.toStringImpl(new NumberSymbol(16));
      expect(result.value).toBe("ff");
    });

    it("should handle fractional values in hex (rounds .5 down)", () => {
      const num = new NumberSymbol(15.5);
      const result = num.toStringImpl(new NumberSymbol(16));
      expect(result.value).toBe("f");
    });

    it("should handle other fractional values in hex (normal rounding)", () => {
      const num = new NumberSymbol(15.7);
      const result = num.toStringImpl(new NumberSymbol(16));
      expect(result.value).toBe("10");
    });

    it("should throw error for invalid radix", () => {
      const num = new NumberSymbol(42);
      expect(() => num.toStringImpl(new NumberSymbol(1))).toThrow(InterpreterError);
      expect(() => num.toStringImpl(new NumberSymbol(37))).toThrow(InterpreterError);
    });

    it("should throw error for null value", () => {
      const num = new NumberSymbol(null);
      expect(() => num.toStringImpl()).toThrow(InterpreterError);
    });
  });

  describe("validValue", () => {
    it("should validate numeric values", () => {
      const num = new NumberSymbol(42);
      expect(num.validValue(123)).toBe(true);
      expect(num.validValue(3.14)).toBe(true);
      expect(num.validValue(new NumberSymbol(42))).toBe(true);
      expect(num.validValue("string")).toBe(false);
    });
  });

  describe("attributes", () => {
    it("should support value attribute", () => {
      const num = new NumberSymbol(42);
      expect(num.hasAttribute("value")).toBe(true);
      expect(num.hasAttribute("other")).toBe(false);

      const attr = num.getAttribute("value");
      expect(attr?.value).toBe(42);
    });

    it("should throw error for unknown attributes", () => {
      const num = new NumberSymbol(42);
      expect(() => num.getAttribute("unknown")).toThrow(InterpreterError);
    });
  });

  describe("equals", () => {
    it("should compare numbers correctly", () => {
      const num1 = new NumberSymbol(42);
      const num2 = new NumberSymbol(42);
      const num3 = new NumberSymbol(43);

      expect(num1.equals(num2)).toBe(true);
      expect(num1.equals(num3)).toBe(false);
    });
  });

  describe("static methods", () => {
    it("should create empty number", () => {
      const empty = NumberSymbol.empty();
      expect(empty.value).toBe(null);
    });
  });
});