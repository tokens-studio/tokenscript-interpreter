import { describe, expect, it } from "vitest";
import { Interpreter } from "@interpreter/interpreter";
import { Lexer } from "@interpreter/lexer";
import { Parser } from "@interpreter/parser";

describe("Parser - Implicit Lists", () => {
  it("should parse implicit list in return statement", () => {
    const code = `
variable x: Number = 10 + 5 * 8 + 22;
if(x == 72) [
   return "works" "implicitly";
] else [
   return "nonon";
]
`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer);

    // This should not throw an error
    expect(() => parser.parse()).not.toThrow();
  });

  it("should parse and interpret implicit list in return statement", () => {
    const code = `
variable x: Number = 10 + 5 * 8 + 22;
if(x == 72) [
   return "works" "implicitly";
] else [
   return "nonon";
]
`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);

    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("works implicitly");
  });

  it("should parse simple implicit list", () => {
    const code = `return "hello" "world";`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer);

    expect(() => parser.parse()).not.toThrow();
  });

  it("should interpret simple implicit list", () => {
    const code = `return "hello" "world";`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);

    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("hello world");
  });

  it("should parse implicit list with mixed types", () => {
    const code = `return "value" 42 "px";`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer);

    expect(() => parser.parse()).not.toThrow();
  });

  it("should interpret implicit list with mixed types", () => {
    const code = `return "value" 42 "px";`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);

    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("value 42 px");
  });

  it("should parse implicit list with references", () => {
    const code = `return {hello} {world} "test";`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer);

    expect(() => parser.parse()).not.toThrow();
  });

  it("should interpret implicit list with references", () => {
    const code = `return {hello} {world} "test";`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, { references: { hello: "hi", world: "there" } });

    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("hi there test");
  });

  it("should parse explicit list with implicit sublists", () => {
    const code = `return "a" "b", "c" "d";`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer);

    expect(() => parser.parse()).not.toThrow();
  });

  it("should interpret explicit list with implicit sublists", () => {
    const code = `return "a" "b", "c" "d";`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);

    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("a b, c d");
  });

  it("should handle the exact user example that was failing", () => {
    const code = `
variable x: Number = 10 + 5 * 8 + 22;
if(x == 72) [
   return "works" "implicitly";
] else [
   return "nonon";
]
`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer);

    // This should not throw the error: "Expected token type RBLOCK but got EXPLICIT_STRING"
    expect(() => parser.parse()).not.toThrow();

    // And it should interpret correctly
    const lexer2 = new Lexer(code);
    const parser2 = new Parser(lexer2);
    const interpreter = new Interpreter(parser2);

    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("works implicitly");
  });

  it("should parse function calls with implicit list arguments", () => {
    const code = `return SUM("a" "b", "c" "d");`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer);

    expect(() => parser.parse()).not.toThrow();
  });

  it("should parse variable assignments with implicit lists", () => {
    const code = `variable test: String = "hello" "world";`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer);

    expect(() => parser.parse()).not.toThrow();
  });
});

describe("Parser - Trailing Comments", () => {
  it("should parse simple number with trailing comment", () => {
    const code = "1 // Some comment here";

    const lexer = new Lexer(code);
    const parser = new Parser(lexer);

    expect(() => parser.parse()).not.toThrow();
  });

  it("should parse return statement with trailing comment", () => {
    const code = `return "hello"; // comment at end`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer);

    expect(() => parser.parse()).not.toThrow();
  });

  it("should parse expression with trailing comment", () => {
    const code = `{value} * 2px // multiply value by 2`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer);

    expect(() => parser.parse(true)).not.toThrow();
  });

  it("should parse variable declaration with trailing comment", () => {
    const code = `variable x: Number = 10; // set initial value`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer);

    expect(() => parser.parse()).not.toThrow();
  });

  it("should interpret expression with trailing comment", () => {
    const code = `return 10 + 5; // addition`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);

    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("15");
  });

  it("should parse multiple statements with trailing comments", () => {
    const code = `
variable x: Number = 10; // first statement
variable y: Number = 20; // second statement
return x + y; // final result
`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer);

    expect(() => parser.parse()).not.toThrow();
  });

  it("should parse block with statements having trailing comments", () => {
    const code = `
if(true) [
  return 1; // inside block
] // comment after block
`;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer);

    expect(() => parser.parse()).not.toThrow();
  });
});
