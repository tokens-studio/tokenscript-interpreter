import { describe, expect, it } from "vitest";
import { InterpreterError } from "../../interpreter/errors";
import { Interpreter } from "../../interpreter/interpreter";
import { Lexer } from "../../interpreter/lexer";
import { Parser } from "../../interpreter/parser";

describe("Error Handling - Lexer Errors", () => {
  it("should throw error for unterminated string", () => {
    const text = '"unterminated string';
    const lexer = new Lexer(text);
    expect(() => {
      let token = lexer.getNextToken();
      while (token.type !== "EOF") {
        token = lexer.getNextToken();
      }
    }).toThrow();
  });

  it("should throw error for invalid character", () => {
    const text = "@invalid";
    const lexer = new Lexer(text);
    expect(() => lexer.getNextToken()).toThrow();
  });

  it("should throw error for unterminated reference", () => {
    const text = "{unterminated";
    const lexer = new Lexer(text);
    expect(() => {
      let token = lexer.getNextToken();
      while (token.type !== "EOF") {
        token = lexer.getNextToken();
      }
    }).toThrow();
  });
});

describe("Error Handling - Parser Errors", () => {
  it("should throw error for missing semicolon", () => {
    const text = `
    variable x: Number = 5
    variable y: Number = 10;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    expect(() => parser.parse()).toThrow();
  });

  it("should throw error for missing closing bracket", () => {
    const text = `
    if(true) [
        variable x: Number = 5;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    expect(() => parser.parse()).toThrow();
  });

  it("should throw error for missing closing parenthesis", () => {
    const text = `
    variable x: Number = (5 + 3;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    expect(() => parser.parse()).toThrow();
  });

  it("should throw error for invalid expression", () => {
    const text = `
    variable x: Number = 5 +;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    expect(() => parser.parse()).toThrow();
  });

  it("should throw error for missing variable type", () => {
    const text = `
    variable x = 5;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    expect(() => parser.parse()).toThrow();
  });

  it("should throw error for missing variable name", () => {
    const text = `
    variable : Number = 5;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    expect(() => parser.parse()).toThrow();
  });
});

describe("Error Handling - Interpreter Errors", () => {
  it("should throw error for undefined variable", () => {
    const text = `
    undefined_var = 5;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });

  it("should throw error for type mismatch", () => {
    const text = `
    variable x: Number = "string";
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });

  it("should throw error for division by zero", () => {
    const text = `
    variable x: Number = 5 / 0;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });

  it("should throw error for invalid operation on strings", () => {
    const text = `
    variable x: String = "hello";
    variable y: String = "world";
    variable z: Number = x + y;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });

  it("should throw error for invalid function call", () => {
    const text = `
    variable x: Number = unknown_function(5);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });

  it("should throw error for wrong number of function arguments", () => {
    const text = `
    variable x: Number = SUM(5);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });

  it("should throw error for reassigning undefined variable", () => {
    const text = `
    undefined_var = 5;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });

  it("should throw error for duplicate variable declaration", () => {
    const text = `
    variable x: Number = 5;
    variable x: String = "hello";
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });

  it("should throw error for invalid list operation", () => {
    const text = `
    variable x: List = 1, 2, 3;
    x.get(10);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow();
  });

  it("should throw error for invalid string method", () => {
    const text = `
    variable x: String = "hello";
    x.invalid_method();
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });

  it("should throw error for non-boolean condition in if statement", () => {
    const text = `
    if(5) [
        variable x: Number = 10;
    ];
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });

  it("should throw error for non-boolean condition in while loop", () => {
    const text = `
    while("string") [
        variable x: Number = 10;
    ];
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });

  it("should throw error for infinite loop protection", () => {
    const text = `
    variable i: Number = 0;
    while(true) [
        i = i + 1;
    ];
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });

  it("should throw error for unsupported reference type", () => {
    const text = `
    variable x: Number = {complex_ref};
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    expect(() => new Interpreter(parser, { complex_ref: { nested: "object" } })).toThrow(
      InterpreterError
    );
  });

  it("should throw error for multiple units in expression", () => {
    const text = `
    variable x: NumberWithUnit = 10px^2rem;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow();
  });

  it("should throw error for invalid boolean operation", () => {
    const text = `
    variable x: Boolean = true + false;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });

  it("should throw error for invalid comparison", () => {
    const text = `
    variable x: Boolean = "hello" > 5;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });
});
