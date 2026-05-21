/**
 * Tests for greedy string parsing in inline mode.
 *
 * When greedyStrings is enabled (inline/token-value mode), unquoted strings
 * consume until whitespace or a structural delimiter, allowing values like
 * URLs and dotted paths to be parsed as a single string.
 */

import { Lexer } from "@src/interpreter/lexer";
import { TokenType } from "@src/types";
import { describe, expect, it } from "vitest";
import { interpret } from "../test-helpers";

/**
 * Helper: tokenize with greedy strings enabled and return token summaries.
 */
function tokenizeGreedy(input: string): string[] {
  const lexer = new Lexer(input, { greedyStrings: true });
  const tokens: string[] = [];
  let token = lexer.nextToken();
  while (token.type !== TokenType.EOF) {
    tokens.push(`${token.type}(${JSON.stringify(token.value)})`);
    token = lexer.nextToken();
  }
  return tokens;
}

/**
 * Helper: tokenize with default (non-greedy) strings.
 */
function tokenizeDefault(input: string): string[] {
  const lexer = new Lexer(input);
  const tokens: string[] = [];
  let token = lexer.nextToken();
  while (token.type !== TokenType.EOF) {
    tokens.push(`${token.type}(${JSON.stringify(token.value)})`);
    token = lexer.nextToken();
  }
  return tokens;
}

describe("Greedy Strings - Lexer", () => {
  describe("URLs", () => {
    it("should parse http:// URL as a single string", () => {
      const tokens = tokenizeGreedy("http://foo.bar");
      expect(tokens).toEqual(['STRING("http://foo.bar")']);
    });

    it("should parse https:// URL as a single string", () => {
      const tokens = tokenizeGreedy("https://example.com/path");
      expect(tokens).toEqual(['STRING("https://example.com/path")']);
    });

    it("should parse URL with query parameters", () => {
      const tokens = tokenizeGreedy("https://example.com/path?query=1&other=2");
      expect(tokens).toEqual(['STRING("https://example.com/path?query=1&other=2")']);
    });

    it("should parse URL with fragment", () => {
      const tokens = tokenizeGreedy("https://example.com/page#section");
      expect(tokens).toEqual(['STRING("https://example.com/page#section")']);
    });
  });

  describe("Dotted paths", () => {
    it("should parse dotted path as single string", () => {
      const tokens = tokenizeGreedy("foo.bar.baz");
      expect(tokens).toEqual(['STRING("foo.bar.baz")']);
    });

    it("should parse colon-separated value as single string", () => {
      const tokens = tokenizeGreedy("hello:world");
      expect(tokens).toEqual(['STRING("hello:world")']);
    });
  });

  describe("Structural delimiters still break strings", () => {
    it("should break at opening paren (function calls)", () => {
      const tokens = tokenizeGreedy("rgb(255)");
      expect(tokens).toEqual(['STRING("rgb")', 'LPAREN("(")', 'NUMBER("255")', 'RPAREN(")")']);
    });

    it("should break at comma", () => {
      const tokens = tokenizeGreedy("foo,bar");
      expect(tokens).toEqual(['STRING("foo")', 'COMMA(",")', 'STRING("bar")']);
    });

    it("should break at curly braces (references)", () => {
      const tokens = tokenizeGreedy("foo{ref}bar");
      expect(tokens).toEqual(['STRING("foo")', 'REFERENCE("ref")', 'STRING("bar")']);
    });

    it("should break at semicolon", () => {
      const tokens = tokenizeGreedy("foo;bar");
      expect(tokens).toEqual(['STRING("foo")', 'SEMICOLON(";")', 'STRING("bar")']);
    });

    it("should break at square brackets", () => {
      const tokens = tokenizeGreedy("foo[0]");
      expect(tokens).toEqual(['STRING("foo")', 'LBLOCK("[")', 'NUMBER("0")', 'RBLOCK("]")']);
    });

    it("should break at quotes", () => {
      const tokens = tokenizeGreedy('foo"bar"');
      expect(tokens).toEqual(['STRING("foo")', 'EXPLICIT_STRING("bar")']);
    });
  });

  describe("Whitespace still separates tokens", () => {
    it("should separate tokens at whitespace", () => {
      const tokens = tokenizeGreedy("http://foo.bar baz");
      expect(tokens).toEqual(['STRING("http://foo.bar")', 'STRING("baz")']);
    });

    it("should still create implicit lists with spaces", () => {
      const tokens = tokenizeGreedy("1px solid black");
      expect(tokens).toEqual(['NUMBER("1")', 'FORMAT("px")', 'STRING("solid")', 'STRING("black")']);
    });
  });

  describe("Keywords and formats still work for simple identifiers", () => {
    it("should recognize reserved keywords", () => {
      const tokens = tokenizeGreedy("true");
      expect(tokens).toEqual(['RESERVED_KEYWORD("true")']);
    });

    it("should recognize false keyword", () => {
      const tokens = tokenizeGreedy("false");
      expect(tokens).toEqual(['RESERVED_KEYWORD("false")']);
    });

    it("should recognize null keyword", () => {
      const tokens = tokenizeGreedy("null");
      expect(tokens).toEqual(['RESERVED_KEYWORD("null")']);
    });

    it("should recognize format units adjacent to numbers", () => {
      const tokens = tokenizeGreedy("3px");
      expect(tokens).toEqual(['NUMBER("3")', 'FORMAT("px")']);
    });

    it("should recognize format units with decimals", () => {
      const tokens = tokenizeGreedy("1.5rem");
      expect(tokens).toEqual(['NUMBER("1.5")', 'FORMAT("rem")']);
    });

    it("should NOT recognize keyword in dotted form", () => {
      const tokens = tokenizeGreedy("true.foo");
      expect(tokens).toEqual(['STRING("true.foo")']);
    });
  });

  describe("Numbers, hex colors, and references are unaffected", () => {
    it("should still lex numbers correctly", () => {
      const tokens = tokenizeGreedy("42");
      expect(tokens).toEqual(['NUMBER("42")']);
    });

    it("should still lex hex colors", () => {
      const tokens = tokenizeGreedy("#FF0000");
      expect(tokens).toEqual(['HEX_COLOR("#FF0000")']);
    });

    it("should still lex references with attribute access", () => {
      const tokens = tokenizeGreedy("{color}.lightness()");
      expect(tokens).toEqual(['REFERENCE("color")', 'DOT(".")', 'STRING("lightness")', 'LPAREN("(")', 'RPAREN(")")']);
    });

    it("should still handle arithmetic with references", () => {
      const tokens = tokenizeGreedy("{base} * 2");
      expect(tokens).toEqual(['REFERENCE("base")', 'OPERATION("*")', 'NUMBER("2")']);
    });
  });

  describe("Non-greedy mode is unchanged", () => {
    it("should still break on colon without greedy", () => {
      const tokens = tokenizeDefault("hello:world");
      expect(tokens).toEqual(['STRING("hello")', 'COLON(":")', 'STRING("world")']);
    });

    it("should still break on dot without greedy", () => {
      const tokens = tokenizeDefault("foo.bar");
      expect(tokens).toEqual(['STRING("foo")', 'DOT(".")', 'STRING("bar")']);
    });
  });
});

describe("Greedy Strings - End-to-End (interpret)", () => {
  describe("URLs as token values", () => {
    it("should interpret a URL as a single string", () => {
      expect(interpret("http://foo.bar")).toBe("http://foo.bar");
    });

    it("should interpret an https URL as a single string", () => {
      expect(interpret("https://example.com/path")).toBe("https://example.com/path");
    });

    it("should interpret URL with query params as a single string", () => {
      expect(interpret("https://example.com?q=1&v=2")).toBe("https://example.com?q=1&v=2");
    });
  });

  describe("Dotted values as token values", () => {
    it("should interpret dotted path as a single string", () => {
      expect(interpret("foo.bar.baz")).toBe("foo.bar.baz");
    });

    it("should interpret colon-separated value as a single string", () => {
      expect(interpret("hello:world")).toBe("hello:world");
    });
  });

  describe("Existing behavior preserved", () => {
    it("should still handle CSS shorthand", () => {
      expect(interpret("1px solid black")).toBe("1px solid black");
    });

    it("should still handle function calls", () => {
      expect(interpret("rgb(255, 0, 0)")).toBe("rgb(255, 0, 0)");
    });

    it("should still handle arithmetic with spaces", () => {
      expect(interpret("1 + 2")).toBe("3");
    });

    it("should still handle references", () => {
      expect(interpret("{base} * 2", { base: "4" })).toBe("8");
    });

    it("should still handle simple implicit strings", () => {
      expect(interpret("hello")).toBe("hello");
      expect(interpret("my-variable")).toBe("my-variable");
    });

    it("should still handle implicit lists with spaces", () => {
      expect(interpret("hello world")).toBe("hello world");
    });

    it("should still handle hex colors", () => {
      expect(interpret("#FF0000")).toBe("#FF0000");
    });

    it("should still handle booleans", () => {
      expect(interpret("true")).toBe("true");
      expect(interpret("false")).toBe("false");
    });

    it("should still handle explicit strings", () => {
      expect(interpret('"hello world"')).toBe("hello world");
    });

    it("should still handle units", () => {
      expect(interpret("3px + 2px")).toBe("5px");
      expect(interpret("1.5rem")).toBe("1.5rem");
    });
  });
});
