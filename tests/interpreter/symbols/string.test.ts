import { InterpreterError } from "@interpreter/errors";
import { ListSymbol, NumberSymbol, StringSymbol } from "@interpreter/symbols";
import { interpretAndGetVariable, interpretAndGetVariables } from "@tests/interpreter/test-helpers";
import { describe, expect, it } from "vitest";

describe("StringSymbol - Unit Tests", () => {
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

  describe("upper", () => {
    it("should convert to uppercase", () => {
      const str = new StringSymbol("hello world");
      const result = str.upper();
      expect(result).toBeInstanceOf(StringSymbol);
      expect(result.value).toBe("HELLO WORLD");
    });

    it("should throw error for null value", () => {
      const str = new StringSymbol(null);
      expect(() => str.upper()).toThrow(InterpreterError);
    });
  });

  describe("lower", () => {
    it("should convert to lowercase", () => {
      const str = new StringSymbol("HELLO WORLD");
      const result = str.lower();
      expect(result).toBeInstanceOf(StringSymbol);
      expect(result.value).toBe("hello world");
    });

    it("should throw error for null value", () => {
      const str = new StringSymbol(null);
      expect(() => str.lower()).toThrow(InterpreterError);
    });
  });

  describe("length", () => {
    it("should return string length", () => {
      const str = new StringSymbol("hello");
      const result = str.length();
      expect(result).toBeInstanceOf(NumberSymbol);
      expect(result.value).toBe(5);
    });

    it("should return 0 for empty string", () => {
      const str = new StringSymbol("");
      const result = str.length();
      expect(result.value).toBe(0);
    });

    it("should throw error for null value", () => {
      const str = new StringSymbol(null);
      expect(() => str.length()).toThrow(InterpreterError);
    });
  });

  describe("concat", () => {
    it("should concatenate with another StringSymbol", () => {
      const str1 = new StringSymbol("hello");
      const str2 = new StringSymbol(" world");
      const result = str1.concat(str2);
      expect(result).toBeInstanceOf(StringSymbol);
      expect(result.value).toBe("hello world");
    });

    it("should throw error for non-string types", () => {
      const str = new StringSymbol("hello");
      expect(() => str.concat(42 as any)).toThrow(InterpreterError);
    });

    it("should throw error for null value", () => {
      const str = new StringSymbol(null);
      expect(() => str.concat(new StringSymbol("test"))).toThrow(InterpreterError);
    });
  });

  describe("split", () => {
    it("should split by delimiter", () => {
      const str = new StringSymbol("a,b,c");
      const result = str.split(new StringSymbol(","));
      expect(result).toBeInstanceOf(ListSymbol);
      expect(result.value.length).toBe(3);
      expect(result.value.map((e) => e.value)).toEqual(["a", "b", "c"]);
    });

    it("should split by string delimiter", () => {
      const str = new StringSymbol("a,b,c");
      const result = str.split(",");
      expect(result.value.length).toBe(3);
      expect(result.value.map((e) => e.value)).toEqual(["a", "b", "c"]);
    });

    it("should split into characters when no delimiter", () => {
      const str = new StringSymbol("abc");
      const result = str.split();
      expect(result.value.length).toBe(3);
      expect(result.value.map((e) => e.value)).toEqual(["a", "b", "c"]);
    });

    it("should split into characters when delimiter is null", () => {
      const str = new StringSymbol("abc");
      const result = str.split(null);
      expect(result.value.length).toBe(3);
      expect(result.value.map((e) => e.value)).toEqual(["a", "b", "c"]);
    });

    it("should throw error for invalid delimiter type", () => {
      const str = new StringSymbol("abc");
      expect(() => str.split(42 as any)).toThrow(InterpreterError);
    });

    it("should throw error for null value", () => {
      const str = new StringSymbol(null);
      expect(() => str.split()).toThrow(InterpreterError);
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

describe("String Methods - Split Operations", () => {
  it("should handle string split method", () => {
    const text = `
    variable parts: List = "hello-world".split("-");
    variable color_parts: List = "#000000".split("#");
    `;
    const vars = interpretAndGetVariables(text, ["parts", "color_parts"]);

    expect(vars.parts?.value.map((e) => e.toString())).toEqual(["hello", "world"]);
    expect(vars.color_parts?.value.map((e) => e.toString())).toEqual(["", "000000"]);
  });

  it("should handle split with multiple delimiters", () => {
    const text = `
    variable text: String = "a,b,c,d";
    variable parts: List = text.split(",");
    variable length: Number = parts.length();
    `;
    const vars = interpretAndGetVariables(text, ["parts", "length"]);

    expect(vars.parts?.value.map((e) => e.toString())).toEqual(["a", "b", "c", "d"]);
    expect(vars.length?.value).toBe(4);
  });

  it("should handle split with no delimiter found", () => {
    const text = `
    variable text: String = "hello world";
    variable parts: List = text.split(",");
    `;
    const parts = interpretAndGetVariable(text, "parts");

    expect(parts?.value.map((e) => e.toString())).toEqual(["hello world"]);
  });

  it("should handle split without delimiter (character split)", () => {
    const text = `
    variable text: String = "abc";
    variable chars: List = text.split();
    `;
    const chars = interpretAndGetVariable(text, "chars");

    expect(chars?.value.map((e) => e.toString())).toEqual(["a", "b", "c"]);
  });
});

describe("String Methods - Concatenation", () => {
  it("should handle string concat method", () => {
    const text = `
    variable hello: String = "hello";
    variable world: String = "world";
    variable result: String = hello.concat(" ").concat(world);
    `;
    const result = interpretAndGetVariable(text, "result");

    expect(result?.toString()).toBe("hello world");
  });

  it("should handle chained concat operations", () => {
    const text = `
    variable a: String = "a";
    variable b: String = "b";
    variable c: String = "c";
    variable result: String = a.concat(b).concat(c);
    `;
    const result = interpretAndGetVariable(text, "result");

    expect(result?.toString()).toBe("abc");
  });
});

describe("String Methods - Case Conversion", () => {
  it("should handle upper and lower case methods", () => {
    const text = `
    variable text: String = "Hello World";
    variable upper: String = text.upper();
    variable lower: String = text.lower();
    `;
    const vars = interpretAndGetVariables(text, ["upper", "lower"]);

    expect(vars.upper?.toString()).toBe("HELLO WORLD");
    expect(vars.lower?.toString()).toBe("hello world");
  });
});

describe("String Methods - Length", () => {
  it("should handle string length method", () => {
    const text = `
    variable text: String = "hello";
    variable len: Number = text.length();
    variable empty: String = "";
    variable empty_len: Number = empty.length();
    `;
    const vars = interpretAndGetVariables(text, ["len", "empty_len"]);

    expect(vars.len?.value).toBe(5);
    expect(vars.empty_len?.value).toBe(0);
  });
});

describe("String Methods - Complex Operations", () => {
  it("should handle complex string operations for color parsing", () => {
    const text = `
    variable hex: String = "#FF5733";
    variable without_hash: List = hex.split("#");
    variable color_part: String = without_hash.get(1);
    variable chars: List = color_part.split();
    variable r_hex: String = chars.get(0).concat(chars.get(1));
    variable g_hex: String = chars.get(2).concat(chars.get(3));
    variable b_hex: String = chars.get(4).concat(chars.get(5));
    `;
    const vars = interpretAndGetVariables(text, ["r_hex", "g_hex", "b_hex"]);

    expect(vars.r_hex?.toString()).toBe("FF");
    expect(vars.g_hex?.toString()).toBe("57");
    expect(vars.b_hex?.toString()).toBe("33");
  });
});
