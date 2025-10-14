import { describe, expect, it } from "vitest";
import { StringSymbol, NumberSymbol, ListSymbol } from "@src/interpreter/symbols";
import { InterpreterError } from "@src/interpreter/errors";

describe("StringSymbol", () => {
  describe("constructor", () => {
    it("should create string from string value", () => {
      const str = new StringSymbol("hello");
      expect(str.value).toBe("hello");
    });

    it("should create from another StringSymbol", () => {
      const original = new StringSymbol("hello");
      const copy = new StringSymbol(original);
      expect(copy.value).toBe("hello");
    });

    it("should create null string", () => {
      const str = new StringSymbol(null);
      expect(str.value).toBe(null);
    });

    it("should throw error for invalid types", () => {
      expect(() => new StringSymbol(42 as any)).toThrow(InterpreterError);
    });
  });

  describe("deepCopy", () => {
    it("should create a deep copy", () => {
      const original = new StringSymbol("hello");
      const copy = original.deepCopy();

      expect(copy).not.toBe(original);
      expect(copy.value).toBe("hello");
    });

    it("should create a deep copy of null string", () => {
      const original = new StringSymbol(null);
      const copy = original.deepCopy();

      expect(copy).not.toBe(original);
      expect(copy.value).toBe(null);
    });
  });

  describe("upperImpl", () => {
    it("should convert to uppercase", () => {
      const str = new StringSymbol("hello world");
      const result = str.upperImpl();
      expect(result).toBeInstanceOf(StringSymbol);
      expect(result.value).toBe("HELLO WORLD");
    });

    it("should throw error for null value", () => {
      const str = new StringSymbol(null);
      expect(() => str.upperImpl()).toThrow(InterpreterError);
    });
  });

  describe("lowerImpl", () => {
    it("should convert to lowercase", () => {
      const str = new StringSymbol("HELLO WORLD");
      const result = str.lowerImpl();
      expect(result).toBeInstanceOf(StringSymbol);
      expect(result.value).toBe("hello world");
    });

    it("should throw error for null value", () => {
      const str = new StringSymbol(null);
      expect(() => str.lowerImpl()).toThrow(InterpreterError);
    });
  });

  describe("lengthImpl", () => {
    it("should return string length", () => {
      const str = new StringSymbol("hello");
      const result = str.lengthImpl();
      expect(result).toBeInstanceOf(NumberSymbol);
      expect(result.value).toBe(5);
    });

    it("should return 0 for empty string", () => {
      const str = new StringSymbol("");
      const result = str.lengthImpl();
      expect(result.value).toBe(0);
    });

    it("should throw error for null value", () => {
      const str = new StringSymbol(null);
      expect(() => str.lengthImpl()).toThrow(InterpreterError);
    });
  });

  describe("concatImpl", () => {
    it("should concatenate with another StringSymbol", () => {
      const str1 = new StringSymbol("hello");
      const str2 = new StringSymbol(" world");
      const result = str1.concatImpl(str2);
      expect(result).toBeInstanceOf(StringSymbol);
      expect(result.value).toBe("hello world");
    });

    it("should throw error for non-string types", () => {
      const str = new StringSymbol("hello");
      expect(() => str.concatImpl(42 as any)).toThrow(InterpreterError);
    });

    it("should throw error for null value", () => {
      const str = new StringSymbol(null);
      expect(() => str.concatImpl(new StringSymbol("test"))).toThrow(InterpreterError);
    });
  });

  describe("splitImpl", () => {
    it("should split by delimiter", () => {
      const str = new StringSymbol("a,b,c");
      const result = str.splitImpl(new StringSymbol(","));
      expect(result).toBeInstanceOf(ListSymbol);
      expect(result.elements.length).toBe(3);
      expect(result.elements.map(e => e.value)).toEqual(["a", "b", "c"]);
    });

    it("should split by string delimiter", () => {
      const str = new StringSymbol("a,b,c");
      const result = str.splitImpl(",");
      expect(result.elements.length).toBe(3);
      expect(result.elements.map(e => e.value)).toEqual(["a", "b", "c"]);
    });

    it("should split into characters when no delimiter", () => {
      const str = new StringSymbol("abc");
      const result = str.splitImpl();
      expect(result.elements.length).toBe(3);
      expect(result.elements.map(e => e.value)).toEqual(["a", "b", "c"]);
    });

    it("should split into characters when delimiter is null", () => {
      const str = new StringSymbol("abc");
      const result = str.splitImpl(null);
      expect(result.elements.length).toBe(3);
      expect(result.elements.map(e => e.value)).toEqual(["a", "b", "c"]);
    });

    it("should throw error for invalid delimiter type", () => {
      const str = new StringSymbol("abc");
      expect(() => str.splitImpl(42 as any)).toThrow(InterpreterError);
    });

    it("should throw error for null value", () => {
      const str = new StringSymbol(null);
      expect(() => str.splitImpl()).toThrow(InterpreterError);
    });
  });

  describe("toString", () => {
    it("should return string representation", () => {
      const str = new StringSymbol("hello");
      expect(str.toString()).toBe("hello");
    });

    it("should handle null value", () => {
      const str = new StringSymbol(null);
      expect(str.toString()).toBe("null");
    });
  });

  describe("validValue", () => {
    it("should validate string values", () => {
      const str = new StringSymbol("test");
      expect(str.validValue("hello")).toBe(true);
      expect(str.validValue(new StringSymbol("hello"))).toBe(true);
      expect(str.validValue(42)).toBe(false);
    });
  });

  describe("equals", () => {
    it("should compare strings correctly", () => {
      const str1 = new StringSymbol("hello");
      const str2 = new StringSymbol("hello");
      const str3 = new StringSymbol("world");

      expect(str1.equals(str2)).toBe(true);
      expect(str1.equals(str3)).toBe(false);
    });
  });

  describe("static methods", () => {
    it("should create empty string", () => {
      const empty = StringSymbol.empty();
      expect(empty.value).toBe(null);
    });
  });
});