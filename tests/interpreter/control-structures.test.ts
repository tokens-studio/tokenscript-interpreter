import { describe, it, expect } from 'vitest';
import { Lexer } from '../../interpreter/lexer';
import { Parser } from '../../interpreter/parser';
import { Interpreter } from '../../interpreter/interpreter';
import { InterpreterError } from '../../interpreter/errors';

describe('Control Structures - While Loops', () => {
  it('should handle basic while loop', () => {
    const text = `
    variable i: Number = 0;
    while(i < 5) [
        i = i + 1;
    ];
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    const result = interpreter.symbolTable.get("i");
    expect(result?.value).toBe(5);
  });

  it('should handle nested while loops', () => {
    const text = `
    variable i: NumberWithUnit = 0px;
    variable j: Number = 0;
    while(i < 3) [
        j = 0;
        while(j < 2) [
            j = j + 1;
        ];
        i = i + 1;
    ];
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    const i = interpreter.symbolTable.get("i");
    const j = interpreter.symbolTable.get("j");
    expect(i?.toString()).toBe("3px");
    expect(j?.value).toBe(2);
  });

  it('should handle while loop with multiple statements', () => {
    const text = `
    variable i: NumberWithUnit = 0px;
    variable j: Number = 0;
    variable b: Boolean = true;
    while(i < 3 && b) [
        j = 0;
        while(j < 2) [
            j = j + 1;
        ];
        i = i + 1;
    ];
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    const i = interpreter.symbolTable.get("i");
    const j = interpreter.symbolTable.get("j");
    expect(i?.toString()).toBe("3px");
    expect(j?.value).toBe(2);
  });

  it('should throw error for infinite while loop', () => {
    const text = `
    variable j: Number = 0;
    while(true) [
        j = j + 1;
    ];
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });

  it('should throw error for non-boolean while condition', () => {
    const text = `
    variable i: Number = 0;
    while(5) [
        i = i + 1;
    ];
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });
});

describe('Control Structures - If Statements', () => {
  it('should handle basic if statement', () => {
    const text = `
    variable x: Number = 0;
    if(true) [
        x = 5;
    ];
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    const result = interpreter.symbolTable.get("x");
    expect(result?.value).toBe(5);
  });

  it('should handle if statement with false condition', () => {
    const text = `
    variable x: Number = 0;
    if(false) [
        x = 5;
    ];
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    const result = interpreter.symbolTable.get("x");
    expect(result?.value).toBe(0);
  });

  it('should handle if statement with complex condition', () => {
    const text = `
    variable x: Number = 0;
    variable y: Number = 5;
    if(x < y && true) [
        x = 10;
    ];
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    const result = interpreter.symbolTable.get("x");
    expect(result?.value).toBe(10);
  });

  it('should throw error for non-boolean if condition', () => {
    const text = `
    variable x: Number = 0;
    if(5) [
        x = 10;
    ];
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });

  it('should handle if-else statement', () => {
    const text = `
    variable x: Number = 0;
    if(false) [
        x = 5;
    ] else [
        x = 10;
    ];
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    const result = interpreter.symbolTable.get("x");
    expect(result?.value).toBe(10);
  });
});
