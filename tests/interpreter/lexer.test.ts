import { describe, expect, it } from "vitest";
import { Lexer } from "../../interpreter/lexer";
import { Operations, ReservedKeyword, SupportedFormats, TokenType } from "../../types";

describe("Lexer", () => {
  it("should tokenize a simple number", () => {
    const lexer = new Lexer("123");
    expect(lexer.getNextToken()).toEqual({ type: TokenType.NUMBER, value: "123", line: 1 });
    expect(lexer.getNextToken()).toEqual({ type: TokenType.EOF, value: null, line: 1 });
  });

  it("should tokenize a number with decimal", () => {
    const lexer = new Lexer("123.45");
    expect(lexer.getNextToken()).toEqual({ type: TokenType.NUMBER, value: "123.45", line: 1 });
  });

  it("should tokenize a number starting with decimal", () => {
    const lexer = new Lexer(".5");
    expect(lexer.getNextToken()).toEqual({ type: TokenType.NUMBER, value: "0.5", line: 1 });
  });

  it("should tokenize a simple reference", () => {
    const lexer = new Lexer("{hello}");
    expect(lexer.getNextToken()).toEqual({ type: TokenType.REFERENCE, value: "hello", line: 1 });
  });

  it("should tokenize a reference with spaces", () => {
    const lexer = new Lexer("{  myVar  }");
    expect(lexer.getNextToken()).toEqual({ type: TokenType.REFERENCE, value: "myVar", line: 1 });
  });

  it("should tokenize basic arithmetic operations", () => {
    const lexer = new Lexer("1 + 2");
    expect(lexer.getNextToken()).toEqual({ type: TokenType.NUMBER, value: "1", line: 1 });
    expect(lexer.getNextToken()).toEqual({
      type: TokenType.OPERATION,
      value: Operations.ADD,
      line: 1,
    });
    expect(lexer.getNextToken()).toEqual({ type: TokenType.NUMBER, value: "2", line: 1 });
  });

  it("should tokenize an identifier", () => {
    const lexer = new Lexer("myVariable");
    expect(lexer.getNextToken()).toEqual({ type: TokenType.STRING, value: "myVariable", line: 1 });
  });

  it("should tokenize an identifier with hyphens", () => {
    const lexer = new Lexer("my-variable-name");
    expect(lexer.getNextToken()).toEqual({
      type: TokenType.STRING,
      value: "my-variable-name",
      line: 1,
    });
  });

  it("should tokenize a reserved keyword (variable)", () => {
    const lexer = new Lexer("variable");
    expect(lexer.getNextToken()).toEqual({
      type: TokenType.RESERVED_KEYWORD,
      value: ReservedKeyword.VARIABLE,
      line: 1,
    });
  });

  it("should tokenize a reserved keyword (true)", () => {
    const lexer = new Lexer("true");
    expect(lexer.getNextToken()).toEqual({
      type: TokenType.RESERVED_KEYWORD,
      value: ReservedKeyword.TRUE,
      line: 1,
    });
  });

  it("should tokenize a format (px)", () => {
    const lexer = new Lexer("10px");
    expect(lexer.getNextToken()).toEqual({ type: TokenType.NUMBER, value: "10", line: 1 });
    expect(lexer.getNextToken()).toEqual({
      type: TokenType.FORMAT,
      value: SupportedFormats.PX,
      line: 1,
    });
  });

  it("should tokenize parentheses", () => {
    const lexer = new Lexer("(1)");
    expect(lexer.getNextToken()).toEqual({ type: TokenType.LPAREN, value: "(", line: 1 });
    expect(lexer.getNextToken()).toEqual({ type: TokenType.NUMBER, value: "1", line: 1 });
    expect(lexer.getNextToken()).toEqual({ type: TokenType.RPAREN, value: ")", line: 1 });
  });

  it("should tokenize a comma", () => {
    const lexer = new Lexer(",");
    expect(lexer.getNextToken()).toEqual({ type: TokenType.COMMA, value: ",", line: 1 });
  });

  it("should tokenize an explicit string with double quotes", () => {
    const lexer = new Lexer('"hello world"');
    expect(lexer.getNextToken()).toEqual({
      type: TokenType.EXPLICIT_STRING,
      value: "hello world",
      line: 1,
    });
  });

  it("should tokenize an explicit string with single quotes", () => {
    const lexer = new Lexer("'test string'");
    expect(lexer.getNextToken()).toEqual({
      type: TokenType.EXPLICIT_STRING,
      value: "test string",
      line: 1,
    });
  });

  it("should tokenize a hex color", () => {
    const lexer = new Lexer("#FF00AA");
    expect(lexer.getNextToken()).toEqual({ type: TokenType.HEX_COLOR, value: "#FF00AA", line: 1 });
  });

  it("should tokenize a short hex color", () => {
    const lexer = new Lexer("#F0A");
    expect(lexer.getNextToken()).toEqual({ type: TokenType.HEX_COLOR, value: "#F0A", line: 1 });
  });

  it("should tokenize assignment", () => {
    const lexer = new Lexer("x = 10");
    expect(lexer.getNextToken()).toEqual({ type: TokenType.STRING, value: "x", line: 1 });
    expect(lexer.getNextToken()).toEqual({ type: TokenType.ASSIGN, value: "=", line: 1 });
    expect(lexer.getNextToken()).toEqual({ type: TokenType.NUMBER, value: "10", line: 1 });
  });

  it("should tokenize equality operator", () => {
    const lexer = new Lexer("a == b");
    expect(lexer.getNextToken()).toEqual({ type: TokenType.STRING, value: "a", line: 1 });
    expect(lexer.getNextToken()).toEqual({ type: TokenType.IS_EQ, value: "==", line: 1 });
    expect(lexer.getNextToken()).toEqual({ type: TokenType.STRING, value: "b", line: 1 });
  });

  it("should tokenize logical AND", () => {
    const lexer = new Lexer("true && false");
    expect(lexer.getNextToken()).toEqual({
      type: TokenType.RESERVED_KEYWORD,
      value: ReservedKeyword.TRUE,
      line: 1,
    });
    expect(lexer.getNextToken()).toEqual({
      type: TokenType.LOGIC_AND,
      value: Operations.LOGIC_AND,
      line: 1,
    });
    expect(lexer.getNextToken()).toEqual({
      type: TokenType.RESERVED_KEYWORD,
      value: ReservedKeyword.FALSE,
      line: 1,
    });
  });

  it("should skip single line comments", () => {
    const lexer = new Lexer("// this is a comment\n123");
    expect(lexer.getNextToken()).toEqual({ type: TokenType.NUMBER, value: "123", line: 2 });
  });

  it("should tokenize a sequence of tokens", () => {
    const lexer = new Lexer("variable size: Number = {baseSize} * 2px;\nreturn size;");
    const tokens = [];
    let token = lexer.getNextToken();
    while (token.type !== TokenType.EOF) {
      tokens.push(token);
      token = lexer.getNextToken();
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
});

describe("Lexer - Additional Python Test Cases", () => {
  it("should tokenize multiple variables", () => {
    const text = "{hello} * {world} + {test}";
    const lexer = new Lexer(text);
    const result = [];
    let token = lexer.getNextToken();
    while (token.type !== TokenType.EOF) {
      result.push(token);
      token = lexer.getNextToken();
    }
    expect(result).toEqual([
      { type: TokenType.REFERENCE, value: "hello", line: 1 },
      { type: TokenType.OPERATION, value: Operations.MULTIPLY, line: 1 },
      { type: TokenType.REFERENCE, value: "world", line: 1 },
      { type: TokenType.OPERATION, value: Operations.ADD, line: 1 },
      { type: TokenType.REFERENCE, value: "test", line: 1 },
    ]);
  });

  it("should tokenize variables with format", () => {
    const text = "{hello} * {world} + {test}rem";
    const lexer = new Lexer(text);
    const result = [];
    let token = lexer.getNextToken();
    while (token.type !== TokenType.EOF) {
      result.push(token);
      token = lexer.getNextToken();
    }
    expect(result).toEqual([
      { type: TokenType.REFERENCE, value: "hello", line: 1 },
      { type: TokenType.OPERATION, value: Operations.MULTIPLY, line: 1 },
      { type: TokenType.REFERENCE, value: "world", line: 1 },
      { type: TokenType.OPERATION, value: Operations.ADD, line: 1 },
      { type: TokenType.REFERENCE, value: "test", line: 1 },
      { type: TokenType.FORMAT, value: SupportedFormats.REM, line: 1 },
    ]);
  });

  it("should tokenize function with multi input", () => {
    const text = "abs(-100px, 200px)";
    const lexer = new Lexer(text);
    const result = [];
    let token = lexer.getNextToken();
    while (token.type !== TokenType.EOF) {
      result.push(token);
      token = lexer.getNextToken();
    }
    expect(result).toEqual([
      { type: TokenType.STRING, value: "abs", line: 1 },
      { type: TokenType.LPAREN, value: "(", line: 1 },
      { type: TokenType.OPERATION, value: Operations.SUBTRACT, line: 1 },
      { type: TokenType.NUMBER, value: "100", line: 1 },
      { type: TokenType.FORMAT, value: SupportedFormats.PX, line: 1 },
      { type: TokenType.COMMA, value: ",", line: 1 },
      { type: TokenType.NUMBER, value: "200", line: 1 },
      { type: TokenType.FORMAT, value: SupportedFormats.PX, line: 1 },
      { type: TokenType.RPAREN, value: ")", line: 1 },
    ]);
  });

  it("should tokenize implicit list", () => {
    const text = "{hello} {world}";
    const lexer = new Lexer(text);
    const result = [];
    let token = lexer.getNextToken();
    while (token.type !== TokenType.EOF) {
      result.push(token);
      token = lexer.getNextToken();
    }
    expect(result).toEqual([
      { type: TokenType.REFERENCE, value: "hello", line: 1 },
      { type: TokenType.REFERENCE, value: "world", line: 1 },
    ]);
  });

  it("should tokenize format on group", () => {
    const text = "{hello} * ({world} + {test})rem";
    const lexer = new Lexer(text);
    const result = [];
    let token = lexer.getNextToken();
    while (token.type !== TokenType.EOF) {
      result.push(token);
      token = lexer.getNextToken();
    }
    expect(result).toEqual([
      { type: TokenType.REFERENCE, value: "hello", line: 1 },
      { type: TokenType.OPERATION, value: Operations.MULTIPLY, line: 1 },
      { type: TokenType.LPAREN, value: "(", line: 1 },
      { type: TokenType.REFERENCE, value: "world", line: 1 },
      { type: TokenType.OPERATION, value: Operations.ADD, line: 1 },
      { type: TokenType.REFERENCE, value: "test", line: 1 },
      { type: TokenType.RPAREN, value: ")", line: 1 },
      { type: TokenType.FORMAT, value: SupportedFormats.REM, line: 1 },
    ]);
  });

  it("should tokenize multiple strings", () => {
    const text = "allo hallo foo";
    const lexer = new Lexer(text);
    const result = [];
    let token = lexer.getNextToken();
    while (token.type !== TokenType.EOF) {
      result.push(token);
      token = lexer.getNextToken();
    }
    expect(result).toEqual([
      { type: TokenType.STRING, value: "allo", line: 1 },
      { type: TokenType.STRING, value: "hallo", line: 1 },
      { type: TokenType.STRING, value: "foo", line: 1 },
    ]);
  });

  it("should tokenize static number with format", () => {
    const text = "100px";
    const lexer = new Lexer(text);
    const result = [];
    let token = lexer.getNextToken();
    while (token.type !== TokenType.EOF) {
      result.push(token);
      token = lexer.getNextToken();
    }
    expect(result).toEqual([
      { type: TokenType.NUMBER, value: "100", line: 1 },
      { type: TokenType.FORMAT, value: SupportedFormats.PX, line: 1 },
    ]);
  });

  it("should tokenize function with multiple inputs", () => {
    const text = "abs(-100px, 200px)";
    const lexer = new Lexer(text);
    const result = [];
    let token = lexer.getNextToken();
    while (token.type !== TokenType.EOF) {
      result.push(token);
      token = lexer.getNextToken();
    }
    expect(result).toEqual([
      { type: TokenType.STRING, value: "abs", line: 1 },
      { type: TokenType.LPAREN, value: "(", line: 1 },
      { type: TokenType.OPERATION, value: Operations.SUBTRACT, line: 1 },
      { type: TokenType.NUMBER, value: "100", line: 1 },
      { type: TokenType.FORMAT, value: SupportedFormats.PX, line: 1 },
      { type: TokenType.COMMA, value: ",", line: 1 },
      { type: TokenType.NUMBER, value: "200", line: 1 },
      { type: TokenType.FORMAT, value: SupportedFormats.PX, line: 1 },
      { type: TokenType.RPAREN, value: ")", line: 1 },
    ]);
  });
});
