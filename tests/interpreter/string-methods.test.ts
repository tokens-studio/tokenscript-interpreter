import { describe, expect, it } from "vitest";
import { Interpreter } from "../../interpreter/interpreter";
import { Lexer } from "../../interpreter/lexer";
import { Parser } from "../../interpreter/parser";

describe("String Methods - Split Operations", () => {
  it("should handle string split method", () => {
    const text = `
    variable parts: List = "hello-world".split("-");
    variable color_parts: List = "#000000".split("#");
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const parts = interpreter.symbolTable.get("parts");
    const colorParts = interpreter.symbolTable.get("color_parts");

    expect(parts?.elements.map((e) => e.toString())).toEqual(["hello", "world"]);
    expect(colorParts?.elements.map((e) => e.toString())).toEqual(["", "000000"]);
  });

  it("should handle split with multiple delimiters", () => {
    const text = `
    variable text: String = "a,b,c,d";
    variable parts: List = text.split(",");
    variable length: Number = parts.length();
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const parts = interpreter.symbolTable.get("parts");
    const length = interpreter.symbolTable.get("length");

    expect(parts?.elements.map((e) => e.toString())).toEqual(["a", "b", "c", "d"]);
    expect(length?.value).toBe(4);
  });

  it("should handle split with no delimiter found", () => {
    const text = `
    variable text: String = "hello world";
    variable parts: List = text.split(",");
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const parts = interpreter.symbolTable.get("parts");

    expect(parts?.elements.map((e) => e.toString())).toEqual(["hello world"]);
  });

  it("should handle split without delimiter (character split)", () => {
    const text = `
    variable text: String = "abc";
    variable chars: List = text.split();
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const chars = interpreter.symbolTable.get("chars");

    expect(chars?.elements.map((e) => e.toString())).toEqual(["a", "b", "c"]);
  });
});

describe("String Methods - Concatenation", () => {
  it("should handle string concat method", () => {
    const text = `
    variable hello: String = "hello";
    variable world: String = "world";
    variable result: String = hello.concat(" ").concat(world);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const result = interpreter.symbolTable.get("result");

    expect(result?.toString()).toBe("hello world");
  });

  it("should handle chained concat operations", () => {
    const text = `
    variable a: String = "a";
    variable b: String = "b";
    variable c: String = "c";
    variable result: String = a.concat(b).concat(c);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const result = interpreter.symbolTable.get("result");

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
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const upper = interpreter.symbolTable.get("upper");
    const lower = interpreter.symbolTable.get("lower");

    expect(upper?.toString()).toBe("HELLO WORLD");
    expect(lower?.toString()).toBe("hello world");
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
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const len = interpreter.symbolTable.get("len");
    const emptyLen = interpreter.symbolTable.get("empty_len");

    expect(len?.value).toBe(5);
    expect(emptyLen?.value).toBe(0);
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
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const rHex = interpreter.symbolTable.get("r_hex");
    const gHex = interpreter.symbolTable.get("g_hex");
    const bHex = interpreter.symbolTable.get("b_hex");

    expect(rHex?.toString()).toBe("FF");
    expect(gHex?.toString()).toBe("57");
    expect(bHex?.toString()).toBe("33");
  });
});
