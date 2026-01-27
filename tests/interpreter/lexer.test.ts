import { Lexer } from "@interpreter/lexer";
import { Operations, ReservedKeyword, SupportedFormats, TokenType } from "@src/types";
import { describe, expect, it } from "vitest";

describe("Lexer", () => {
  it("should tokenize a simple number", () => {
    const lexer = new Lexer("123");
    const token = lexer.nextToken();
    expect(token).toMatchObject({ type: TokenType.NUMBER, value: "123", line: 1 });
    expect(token.pos).toBe(0);
    expect(token.endPos).toBe(3);
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.EOF, value: null, line: 1 });
  });

  it("should tokenize a number with decimal", () => {
    const lexer = new Lexer("123.45");
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.NUMBER, value: "123.45", line: 1 });
  });

  it("should tokenize a number starting with decimal", () => {
    const lexer = new Lexer(".5");
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.NUMBER, value: "0.5", line: 1 });
  });

  it("should tokenize a simple reference", () => {
    const lexer = new Lexer("{hello}");
    const token = lexer.nextToken();
    expect(token).toMatchObject({ type: TokenType.REFERENCE, value: "hello", line: 1 });
    expect(token.pos).toBe(1);
    expect(token.endPos).toBe(6);
  });

  it("should tokenize a reference with spaces", () => {
    const lexer = new Lexer("{  myVar  }");
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.REFERENCE, value: "myVar", line: 1 });
  });

  it("should tokenize basic arithmetic operations", () => {
    const lexer = new Lexer("1 + 2");
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.NUMBER, value: "1", line: 1 });
    expect(lexer.nextToken()).toMatchObject({
      type: TokenType.OPERATION,
      value: Operations.ADD,
      line: 1,
    });
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.NUMBER, value: "2", line: 1 });
  });

  it("should tokenize an identifier", () => {
    const lexer = new Lexer("myVariable");
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.STRING, value: "myVariable", line: 1 });
  });

  it("should tokenize an identifier with hyphens", () => {
    const lexer = new Lexer("my-variable-name");
    expect(lexer.nextToken()).toMatchObject({
      type: TokenType.STRING,
      value: "my-variable-name",
      line: 1,
    });
  });

  it("should tokenize a reserved keyword (variable)", () => {
    const lexer = new Lexer("variable");
    expect(lexer.nextToken()).toMatchObject({
      type: TokenType.RESERVED_KEYWORD,
      value: ReservedKeyword.VARIABLE,
      line: 1,
    });
  });

  it("should tokenize a reserved keyword (true)", () => {
    const lexer = new Lexer("true");
    expect(lexer.nextToken()).toMatchObject({
      type: TokenType.RESERVED_KEYWORD,
      value: ReservedKeyword.TRUE,
      line: 1,
    });
  });

  it("should tokenize a format (px)", () => {
    const lexer = new Lexer("10px");
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.NUMBER, value: "10", line: 1 });
    expect(lexer.nextToken()).toMatchObject({
      type: TokenType.FORMAT,
      value: SupportedFormats.PX,
      line: 1,
    });
  });

  it("should tokenize parentheses", () => {
    const lexer = new Lexer("(1)");
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.LPAREN, value: "(", line: 1 });
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.NUMBER, value: "1", line: 1 });
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.RPAREN, value: ")", line: 1 });
  });

  it("should tokenize a comma", () => {
    const lexer = new Lexer(",");
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.COMMA, value: ",", line: 1 });
  });

  it("should tokenize an explicit string with double quotes", () => {
    const lexer = new Lexer('"hello world"');
    expect(lexer.nextToken()).toMatchObject({
      type: TokenType.EXPLICIT_STRING,
      value: "hello world",
      line: 1,
    });
  });

  it("should tokenize an explicit string with single quotes", () => {
    const lexer = new Lexer("'test string'");
    expect(lexer.nextToken()).toMatchObject({
      type: TokenType.EXPLICIT_STRING,
      value: "test string",
      line: 1,
    });
  });

  it("should tokenize a hex color", () => {
    const lexer = new Lexer("#FF00AA");
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.HEX_COLOR, value: "#FF00AA", line: 1 });
  });

  it("should tokenize a short hex color", () => {
    const lexer = new Lexer("#F0A");
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.HEX_COLOR, value: "#F0A", line: 1 });
  });

  it("should tokenize a hex4 color (with alpha)", () => {
    const lexer = new Lexer("#F0A8");
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.HEX_COLOR, value: "#F0A8", line: 1 });
  });

  it("should tokenize a hex8 color (with alpha)", () => {
    const lexer = new Lexer("#FF00AA80");
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.HEX_COLOR, value: "#FF00AA80", line: 1 });
  });

  it("should tokenize assignment", () => {
    const lexer = new Lexer("x = 10");
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.STRING, value: "x", line: 1 });
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.ASSIGN, value: "=", line: 1 });
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.NUMBER, value: "10", line: 1 });
  });

  it("should tokenize equality operator", () => {
    const lexer = new Lexer("a == b");
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.STRING, value: "a", line: 1 });
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.IS_EQ, value: "==", line: 1 });
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.STRING, value: "b", line: 1 });
  });

  it("should tokenize logical AND", () => {
    const lexer = new Lexer("true && false");
    expect(lexer.nextToken()).toMatchObject({
      type: TokenType.RESERVED_KEYWORD,
      value: ReservedKeyword.TRUE,
      line: 1,
    });
    expect(lexer.nextToken()).toMatchObject({
      type: TokenType.LOGIC_AND,
      value: Operations.LOGIC_AND,
      line: 1,
    });
    expect(lexer.nextToken()).toMatchObject({
      type: TokenType.RESERVED_KEYWORD,
      value: ReservedKeyword.FALSE,
      line: 1,
    });
  });

  it("should skip single line comments", () => {
    const lexer = new Lexer("// this is a comment\n123");
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.NUMBER, value: "123", line: 2 });
  });

  it("should allow trailing comments at end of line", () => {
    const lexer = new Lexer("123 // this is a trailing comment");
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.NUMBER, value: "123", line: 1 });
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.EOF, value: null, line: 1 });
  });

  it("should allow trailing comments at end of statement", () => {
    const lexer = new Lexer("123; // comment");
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.NUMBER, value: "123", line: 1 });
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.SEMICOLON, value: ";", line: 1 });
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.EOF, value: null, line: 1 });
  });

  it("should handle trailing comments with newline", () => {
    const lexer = new Lexer("123 // trailing comment\n456");
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.NUMBER, value: "123", line: 1 });
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.NUMBER, value: "456", line: 2 });
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.EOF, value: null, line: 2 });
  });

  it("should handle multiple statements with trailing comments", () => {
    const lexer = new Lexer("1 // comment1\n2 // comment2");
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.NUMBER, value: "1", line: 1 });
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.NUMBER, value: "2", line: 2 });
    expect(lexer.nextToken()).toMatchObject({ type: TokenType.EOF, value: null, line: 2 });
  });

  it("should allow trailing comments on complex expressions", () => {
    const lexer = new Lexer("1 + 2 * 3 // complex expression");
    const tokens = [];
    let token = lexer.nextToken();
    while (token.type !== TokenType.EOF) {
      tokens.push({ type: token.type, value: token.value, line: token.line });
      token = lexer.nextToken();
    }
    expect(tokens).toEqual([
      { type: TokenType.NUMBER, value: "1", line: 1 },
      { type: TokenType.OPERATION, value: Operations.ADD, line: 1 },
      { type: TokenType.NUMBER, value: "2", line: 1 },
      { type: TokenType.OPERATION, value: Operations.MULTIPLY, line: 1 },
      { type: TokenType.NUMBER, value: "3", line: 1 },
    ]);
  });

  it("should tokenize a sequence of tokens", () => {
    const lexer = new Lexer("variable size: Number = {baseSize} * 2px;\nreturn size;");
    const tokens = [];
    let token = lexer.nextToken();
    while (token.type !== TokenType.EOF) {
      tokens.push({ type: token.type, value: token.value, line: token.line });
      token = lexer.nextToken();
    }
    expect(tokens).toEqual([
      { type: TokenType.RESERVED_KEYWORD, value: ReservedKeyword.VARIABLE, line: 1 },
      { type: TokenType.STRING, value: "size", line: 1 },
      { type: TokenType.COLON, value: ":", line: 1 },
      { type: TokenType.STRING, value: "Number", line: 1 },
      { type: TokenType.ASSIGN, value: "=", line: 1 },
      { type: TokenType.REFERENCE, value: "baseSize", line: 1 },
      { type: TokenType.OPERATION, value: Operations.MULTIPLY, line: 1 },
      { type: TokenType.NUMBER, value: "2", line: 1 },
      { type: TokenType.FORMAT, value: SupportedFormats.PX, line: 1 },
      { type: TokenType.SEMICOLON, value: ";", line: 1 },
      { type: TokenType.RESERVED_KEYWORD, value: ReservedKeyword.RETURN, line: 2 },
      { type: TokenType.STRING, value: "size", line: 2 },
      { type: TokenType.SEMICOLON, value: ";", line: 2 },
    ]);
  });

  describe("Nested references should not be allowed", () => {
    it("should throw error for nested reference with simple inner reference", () => {
      const lexer = new Lexer("{color.{theme}.primary}");
      expect(() => lexer.nextToken()).toThrow();
    });

    it("should throw error for nested reference at start", () => {
      const lexer = new Lexer("{{nested}.value}");
      expect(() => lexer.nextToken()).toThrow();
    });

    it("should throw error for nested reference at end", () => {
      const lexer = new Lexer("{value.{nested}}");
      expect(() => lexer.nextToken()).toThrow();
    });

    it("should throw error for multiple nested references", () => {
      const lexer = new Lexer("{a.{b}.{c}.d}");
      expect(() => lexer.nextToken()).toThrow();
    });

    it("should throw error for deeply nested references", () => {
      const lexer = new Lexer("{outer.{middle.{inner}}}");
      expect(() => lexer.nextToken()).toThrow();
    });

    it("should throw error for nested reference in expression", () => {
      const lexer = new Lexer("variable x: Number = {a.{b}} + 5;");
      expect(() => {
        let token = lexer.nextToken();
        while (token.type !== TokenType.EOF) {
          token = lexer.nextToken();
        }
      }).toThrow();
    });
  });
});
