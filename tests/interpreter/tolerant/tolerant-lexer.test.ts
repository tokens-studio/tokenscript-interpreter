import { Lexer } from "@interpreter/lexer";
import { TokenType } from "@src/types";
import { describe, expect, it } from "vitest";

describe("Tolerant Lexer", () => {
  describe("Partial References", () => {
    it("should return partial reference token for unclosed reference", () => {
      const lexer = new Lexer("{color", { tolerant: true });
      const token = lexer.nextToken();

      expect(token.type).toBe(TokenType.PARTIAL_REFERENCE);
      expect(token.value).toBe("color");
    });

    it("should return partial reference token for unclosed reference with dot path", () => {
      const lexer = new Lexer("{foo.bar", { tolerant: true });
      const token = lexer.nextToken();

      expect(token.type).toBe(TokenType.PARTIAL_REFERENCE);
      expect(token.value).toBe("foo.bar");
    });

    it("should return partial reference token for empty unclosed reference", () => {
      const lexer = new Lexer("{", { tolerant: true });
      const token = lexer.nextToken();

      expect(token.type).toBe(TokenType.PARTIAL_REFERENCE);
      expect(token.value).toBe("");
    });

    it("should return partial reference with whitespace handling", () => {
      const lexer = new Lexer("{ color . primary", { tolerant: true });
      const token = lexer.nextToken();

      expect(token.type).toBe(TokenType.PARTIAL_REFERENCE);
      expect(token.value).toBe("color.primary");
    });

    it("should still parse complete references correctly", () => {
      const lexer = new Lexer("{color}", { tolerant: true });
      const token = lexer.nextToken();

      expect(token.type).toBe(TokenType.REFERENCE);
      expect(token.value).toBe("color");
    });
  });

  describe("Partial Strings", () => {
    it("should return partial string token for unclosed double-quoted string", () => {
      const lexer = new Lexer('"hello', { tolerant: true });
      const token = lexer.nextToken();

      expect(token.type).toBe(TokenType.PARTIAL_STRING);
      expect(token.value).toBe("hello");
    });

    it("should return partial string token for unclosed single-quoted string", () => {
      const lexer = new Lexer("'hello", { tolerant: true });
      const token = lexer.nextToken();

      expect(token.type).toBe(TokenType.PARTIAL_STRING);
      expect(token.value).toBe("hello");
    });

    it("should return partial string for empty unclosed string", () => {
      const lexer = new Lexer('"', { tolerant: true });
      const token = lexer.nextToken();

      expect(token.type).toBe(TokenType.PARTIAL_STRING);
      expect(token.value).toBe("");
    });

    it("should still parse complete strings correctly", () => {
      const lexer = new Lexer('"hello"', { tolerant: true });
      const token = lexer.nextToken();

      expect(token.type).toBe(TokenType.EXPLICIT_STRING);
      expect(token.value).toBe("hello");
    });
  });

  describe("Partial Hex Colors", () => {
    it("should accept partial hex colors in tolerant mode", () => {
      const lexer = new Lexer("#FF", { tolerant: true });
      const token = lexer.nextToken();

      expect(token.type).toBe(TokenType.HEX_COLOR);
      expect(token.value).toBe("#FF");
    });

    it("should accept single character hex in tolerant mode", () => {
      const lexer = new Lexer("#F", { tolerant: true });
      const token = lexer.nextToken();

      expect(token.type).toBe(TokenType.HEX_COLOR);
      expect(token.value).toBe("#F");
    });

    it("should still parse complete hex colors correctly", () => {
      const lexer = new Lexer("#FFF", { tolerant: true });
      const token = lexer.nextToken();

      expect(token.type).toBe(TokenType.HEX_COLOR);
      expect(token.value).toBe("#FFF");
    });
  });

  describe("tokenizeAll", () => {
    it("should tokenize complete input into array", () => {
      const lexer = new Lexer("{color} + 5", { tolerant: true });
      const tokens = lexer.tokenizeAll();

      expect(tokens).toHaveLength(4); // REFERENCE, OPERATION, NUMBER, EOF
      expect(tokens[0].type).toBe(TokenType.REFERENCE);
      expect(tokens[1].type).toBe(TokenType.OPERATION);
      expect(tokens[2].type).toBe(TokenType.NUMBER);
      expect(tokens[3].type).toBe(TokenType.EOF);
    });

    it("should tokenize incomplete input with partial tokens", () => {
      const lexer = new Lexer("{color} + {foo", { tolerant: true });
      const tokens = lexer.tokenizeAll();

      expect(tokens).toHaveLength(4); // REFERENCE, OPERATION, PARTIAL_REFERENCE, EOF
      expect(tokens[0].type).toBe(TokenType.REFERENCE);
      expect(tokens[1].type).toBe(TokenType.OPERATION);
      expect(tokens[2].type).toBe(TokenType.PARTIAL_REFERENCE);
      expect(tokens[3].type).toBe(TokenType.EOF);
    });
  });

  describe("getAllTokens", () => {
    it("should collect all tokens during parsing", () => {
      const lexer = new Lexer("{a} + {b}", { tolerant: true });

      // Consume all tokens
      while (lexer.nextToken().type !== TokenType.EOF) {
        // Keep consuming
      }

      const tokens = lexer.getAllTokens();
      expect(tokens).toHaveLength(4); // REFERENCE, OPERATION, REFERENCE, EOF
    });

    it("should not duplicate tokens when peekToken is called", () => {
      const lexer = new Lexer("{a} + {b}", { tolerant: true });

      lexer.nextToken(); // REFERENCE {a}
      lexer.peekToken(); // peek at OPERATION (should not add to collected)
      lexer.nextToken(); // OPERATION +
      lexer.peekToken(); // peek at REFERENCE {b} (should not add to collected)
      lexer.nextToken(); // REFERENCE {b}
      lexer.nextToken(); // EOF

      const tokens = lexer.getAllTokens();
      expect(tokens).toHaveLength(4); // REFERENCE, OPERATION, REFERENCE, EOF
    });

    it("should not duplicate tokens when peekTokens is called", () => {
      const lexer = new Lexer("1 + 2 * 3", { tolerant: true });

      lexer.nextToken(); // NUMBER 1
      lexer.peekTokens(3); // peek ahead (should not add to collected)
      lexer.nextToken(); // OPERATION +
      lexer.nextToken(); // NUMBER 2
      lexer.nextToken(); // OPERATION *
      lexer.nextToken(); // NUMBER 3
      lexer.nextToken(); // EOF

      const tokens = lexer.getAllTokens();
      expect(tokens).toHaveLength(6); // NUMBER, OPERATION, NUMBER, OPERATION, NUMBER, EOF
    });
  });

  describe("Invalid characters in tolerant mode", () => {
    it("should skip invalid characters and continue", () => {
      const lexer = new Lexer("1 @ 2", { tolerant: true });
      const tokens = lexer.tokenizeAll();

      // @ should be skipped, so we get NUMBER, NUMBER, EOF
      expect(tokens.filter((t) => t.type === TokenType.NUMBER)).toHaveLength(2);
    });
  });

  describe("Strict mode (non-tolerant)", () => {
    it("should throw error for unclosed reference in strict mode", () => {
      const lexer = new Lexer("{color");

      expect(() => {
        let token = lexer.nextToken();
        while (token.type !== TokenType.EOF) {
          token = lexer.nextToken();
        }
      }).toThrow();
    });

    it("should throw error for unclosed string in strict mode", () => {
      const lexer = new Lexer('"hello');

      expect(() => {
        let token = lexer.nextToken();
        while (token.type !== TokenType.EOF) {
          token = lexer.nextToken();
        }
      }).toThrow();
    });

    it("should throw error for invalid hex color in strict mode", () => {
      const lexer = new Lexer("#FF");

      expect(() => {
        lexer.nextToken();
      }).toThrow();
    });
  });
});
