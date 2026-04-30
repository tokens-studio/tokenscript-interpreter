import { TemplateStringNode, ReferenceNode, StringNode, collectReferenceNodes } from "@interpreter/ast";
import { Interpreter } from "@interpreter/interpreter";
import { Lexer } from "@interpreter/lexer";
import { Parser } from "@interpreter/parser";
import {
  BooleanSymbol,
  ColorSymbol,
  DictionarySymbol,
  ListSymbol,
  NullSymbol,
  NumberSymbol,
  StringSymbol,
} from "@interpreter/symbols";
import { TokenType } from "@src/types";
import { describe, expect, it } from "vitest";

function parse(input: string) {
  const lexer = new Lexer(input);
  const parser = new Parser(lexer);
  return parser.parse(true);
}

function evalExpr(input: string, refs?: Record<string, any>) {
  const lexer = new Lexer(input);
  const parser = new Parser(lexer);
  const interp = new Interpreter(parser, { references: refs });
  return interp.interpret();
}

// =============================================================================
// Lexer tests
// =============================================================================

describe("Template String Lexer", () => {
  it("should tokenize a basic template string", () => {
    const lexer = new Lexer("`hello world`");
    const token = lexer.nextToken();
    expect(token.type).toBe(TokenType.TEMPLATE_STRING);
    expect(token.value).toBe("hello world");
  });

  it("should tokenize an empty template string", () => {
    const lexer = new Lexer("``");
    const token = lexer.nextToken();
    expect(token.type).toBe(TokenType.TEMPLATE_STRING);
    expect(token.value).toBe("");
  });

  it("should preserve reference markers in raw content", () => {
    const lexer = new Lexer("`color is {color.primary}`");
    const token = lexer.nextToken();
    expect(token.type).toBe(TokenType.TEMPLATE_STRING);
    expect(token.value).toBe("color is {color.primary}");
  });

  it("should preserve expression markers in raw content", () => {
    const lexer = new Lexer("`result is ${1 + 2}`");
    const token = lexer.nextToken();
    expect(token.type).toBe(TokenType.TEMPLATE_STRING);
    expect(token.value).toBe("result is ${1 + 2}");
  });

  it("should handle escape sequences", () => {
    const lexer = new Lexer("`\\{not a ref}`");
    const token = lexer.nextToken();
    expect(token.type).toBe(TokenType.TEMPLATE_STRING);
    expect(token.value).toBe("\\{not a ref}");
  });

  it("should error on unterminated template string", () => {
    const lexer = new Lexer("`hello world");
    expect(() => lexer.nextToken()).toThrow();
  });
});

// =============================================================================
// Parser tests
// =============================================================================

describe("Template String Parser", () => {
  it("should optimize literal-only template to StringNode", () => {
    const ast = parse("`hello world`");
    expect(ast).toBeInstanceOf(StringNode);
    expect((ast as StringNode).value).toBe("hello world");
  });

  it("should parse empty template as TemplateStringNode", () => {
    const ast = parse("``");
    expect(ast).toBeInstanceOf(TemplateStringNode);
    expect((ast as TemplateStringNode).parts).toHaveLength(0);
  });

  it("should parse template with reference", () => {
    const ast = parse("`color is {color.primary}`");
    expect(ast).toBeInstanceOf(TemplateStringNode);
    const tsn = ast as TemplateStringNode;
    expect(tsn.parts).toHaveLength(2);
    expect(tsn.parts[0]).toBeInstanceOf(StringNode);
    expect((tsn.parts[0] as StringNode).value).toBe("color is ");
    expect(tsn.parts[1]).toBeInstanceOf(ReferenceNode);
    expect((tsn.parts[1] as ReferenceNode).value).toBe("color.primary");
  });

  it("should parse template with expression", () => {
    const ast = parse("`sum is ${1 + 2}`");
    expect(ast).toBeInstanceOf(TemplateStringNode);
    const tsn = ast as TemplateStringNode;
    expect(tsn.parts).toHaveLength(2);
    expect(tsn.parts[0]).toBeInstanceOf(StringNode);
    expect((tsn.parts[0] as StringNode).value).toBe("sum is ");
  });

  it("should parse template with mixed parts", () => {
    const ast = parse("`hello {name}, you are ${1 + 1} years old`");
    expect(ast).toBeInstanceOf(TemplateStringNode);
    const tsn = ast as TemplateStringNode;
    // Parts: "hello ", {name}, ", you are ", (1+1), " years old"
    expect(tsn.parts).toHaveLength(5);
  });

  it("should handle escaped brace", () => {
    const ast = parse("`not a \\{reference}`");
    expect(ast).toBeInstanceOf(StringNode);
    expect((ast as StringNode).value).toBe("not a {reference}");
  });

  it("should handle escaped dollar-brace", () => {
    const ast = parse("`not \\${an expr}`");
    expect(ast).toBeInstanceOf(StringNode);
    expect((ast as StringNode).value).toBe("not ${an expr}");
  });

  it("should extract dependencies from template", () => {
    const ast = parse("`{color.primary} and ${1 + 1}`");
    const refs = collectReferenceNodes(ast!);
    expect(refs).toHaveLength(1);
    expect(refs[0].value).toBe("color.primary");
  });

  it("should extract dependencies from expression refs", () => {
    const lexer = new Lexer("`result: ${mix({a}, {b})}`");
    const parser = new Parser(lexer);
    parser.parse(true);
    expect(parser.requiredReferences.has("a")).toBe(true);
    expect(parser.requiredReferences.has("b")).toBe(true);
  });

  it("should error on unterminated reference in template", () => {
    expect(() => parse("`missing close {ref`")).toThrow();
  });

  it("should error on unterminated expression in template", () => {
    expect(() => parse("`missing close ${1 + 2`")).toThrow();
  });

  it("should error on nested template strings", () => {
    // The lexer terminates the outer template at the inner backtick,
    // causing an "Unterminated ${...}" parse error. Either way, nesting fails.
    expect(() => parse("`outer ${`inner`}`")).toThrow();
  });
});

// =============================================================================
// Interpreter tests
// =============================================================================

describe("Template String Interpreter", () => {
  it("should evaluate literal template", () => {
    const result = evalExpr("`hello world`");
    expect(result).toBeInstanceOf(StringSymbol);
    expect(result!.toString()).toBe("hello world");
  });

  it("should evaluate empty template", () => {
    const result = evalExpr("``");
    expect(result).toBeInstanceOf(StringSymbol);
    expect(result!.toString()).toBe("");
  });

  it("should evaluate template with reference", () => {
    const result = evalExpr("`color is {color.primary}`", {
      "color.primary": "#FF0000",
    });
    expect(result).toBeInstanceOf(StringSymbol);
    expect(result!.toString()).toBe("color is #FF0000");
  });

  it("should evaluate template with expression", () => {
    const result = evalExpr("`sum is ${1 + 2}`");
    expect(result).toBeInstanceOf(StringSymbol);
    expect(result!.toString()).toBe("sum is 3");
  });

  it("should evaluate mixed template", () => {
    const result = evalExpr("`hello {name}, ${1 + 1} items`", {
      name: "Alice",
    });
    expect(result).toBeInstanceOf(StringSymbol);
    expect(result!.toString()).toBe("hello Alice, 2 items");
  });

  it("should evaluate escaped brace as literal", () => {
    const result = evalExpr("`literal \\{brace}`");
    expect(result).toBeInstanceOf(StringSymbol);
    expect(result!.toString()).toBe("literal {brace}");
  });

  it("should evaluate escaped dollar-brace as literal", () => {
    const result = evalExpr("`literal \\${expr}`");
    expect(result).toBeInstanceOf(StringSymbol);
    expect(result!.toString()).toBe("literal ${expr}");
  });

  it("should preserve type for single-part reference", () => {
    const result = evalExpr("`{count}`", { count: 42 });
    expect(result).toBeInstanceOf(NumberSymbol);
    expect(result!.value).toBe(42);
  });

  it("should coerce number to string when mixed with text", () => {
    const result = evalExpr("`value: ${16 * 2}px`");
    expect(result).toBeInstanceOf(StringSymbol);
    expect(result!.toString()).toBe("value: 32px");
  });

  it("should coerce boolean to string", () => {
    const result = evalExpr("`is true: ${true}`");
    expect(result).toBeInstanceOf(StringSymbol);
    expect(result!.toString()).toBe("is true: true");
  });

  it("should coerce null to string", () => {
    const result = evalExpr("`value: ${null}`");
    expect(result).toBeInstanceOf(StringSymbol);
    expect(result!.toString()).toBe("value: null");
  });

  it("should error on undefined reference", () => {
    expect(() => evalExpr("`value: {undefined.ref}`")).toThrow();
  });

  // Type restriction tests

  it("should allow hex color in template", () => {
    const result = evalExpr("`color: {c}`", { c: "#FF0000" });
    expect(result).toBeInstanceOf(StringSymbol);
    expect(result!.toString()).toBe("color: #FF0000");
  });

  it("should reject list in template", () => {
    const lexer = new Lexer("`items: {items}`");
    const parser = new Parser(lexer);
    const interp = new Interpreter(parser);
    interp.setReference("items", new ListSymbol([new NumberSymbol(1), new NumberSymbol(2)], false));
    expect(() => interp.interpret()).toThrow();
  });

  it("should reject dictionary in template", () => {
    const lexer = new Lexer("`obj: {obj}`");
    const parser = new Parser(lexer);
    const interp = new Interpreter(parser);
    interp.setReference("obj", new DictionarySymbol({ a: new NumberSymbol(1) }));
    expect(() => interp.interpret()).toThrow();
  });

  it("should reject non-hex color in template", () => {
    const lexer = new Lexer("`color: {c}`");
    const parser = new Parser(lexer);
    const interp = new Interpreter(parser);
    interp.setReference("c", new ColorSymbol({ h: 180, s: 50, l: 50 }, "HSL"));
    expect(() => interp.interpret()).toThrow();
  });

  it("should reject non-hex color even in single-part template", () => {
    const lexer = new Lexer("`{c}`");
    const parser = new Parser(lexer);
    const interp = new Interpreter(parser);
    interp.setReference("c", new ColorSymbol({ l: 0.7, c: 0.15, h: 180 }, "OKLCH"));
    expect(() => interp.interpret()).toThrow();
  });
});
