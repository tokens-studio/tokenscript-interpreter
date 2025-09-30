import { describe, expect, it } from "vitest";
import { Interpreter } from "@src/interpreter/interpreter";
import { Lexer } from "@src/interpreter/lexer";
import { Parser } from "@src/interpreter/parser";
import { StringSymbol } from "@src/interpreter/symbols";

describe("Number Hexadecimal Rounding", () => {
  describe("Hexadecimal conversion with rounding", () => {
    it("should round .5 down for positive numbers in hexadecimal", () => {
      const text = `
        variable num: Number = 10.5;
        return num.toString(16);
      `;
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
      const result = interpreter.interpret();
      
      expect(result).toBeInstanceOf(StringSymbol);
      expect((result as StringSymbol).value).toBe("a"); // 10.5 rounds down to 10, which is 'a' in hex
    });

    it("should round .5 down for negative numbers in hexadecimal", () => {
      const text = `
        variable num: Number = -10.5;
        return num.toString(16);
      `;
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
      const result = interpreter.interpret();
      
      expect(result).toBeInstanceOf(StringSymbol);
      expect((result as StringSymbol).value).toBe("-b"); // -10.5 rounds down to -11, which is '-b' in hex
    });

    it("should round .3 down for positive numbers in hexadecimal", () => {
      const text = `
        variable num: Number = 15.3;
        return num.toString(16);
      `;
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
      const result = interpreter.interpret();
      
      expect(result).toBeInstanceOf(StringSymbol);
      expect((result as StringSymbol).value).toBe("f"); // 15.3 rounds down to 15, which is 'f' in hex
    });

    it("should round .7 up for positive numbers in hexadecimal", () => {
      const text = `
        variable num: Number = 15.7;
        return num.toString(16);
      `;
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
      const result = interpreter.interpret();
      
      expect(result).toBeInstanceOf(StringSymbol);
      expect((result as StringSymbol).value).toBe("10"); // 15.7 rounds up to 16, which is '10' in hex
    });

    it("should not round for non-hexadecimal bases (decimal)", () => {
      const text = `
        variable num: Number = 10.5;
        return num.toString(10);
      `;
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
      const result = interpreter.interpret();
      
      expect(result).toBeInstanceOf(StringSymbol);
      expect((result as StringSymbol).value).toBe("10.5"); // Should return string representation, not rounded
    });

    it("should not round for non-hexadecimal bases (binary)", () => {
      const text = `
        variable num: Number = 5.5;
        return num.toString(2);
      `;
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
      const result = interpreter.interpret();
      
      expect(result).toBeInstanceOf(StringSymbol);
      expect((result as StringSymbol).value).toBe("5.5"); // Should return string representation, not rounded
    });

    it("should handle integer values normally in hexadecimal", () => {
      const text = `
        variable num: Number = 255;
        return num.toString(16);
      `;
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
      const result = interpreter.interpret();
      
      expect(result).toBeInstanceOf(StringSymbol);
      expect((result as StringSymbol).value).toBe("ff"); // 255 in hex
    });

    it("should handle zero correctly in hexadecimal", () => {
      const text = `
        variable num: Number = 0.5;
        return num.toString(16);
      `;
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
      const result = interpreter.interpret();
      
      expect(result).toBeInstanceOf(StringSymbol);
      expect((result as StringSymbol).value).toBe("0"); // 0.5 rounds down to 0
    });
  });
});