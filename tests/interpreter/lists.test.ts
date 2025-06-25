import { describe, it, expect } from 'vitest';
import { Lexer } from '../../interpreter/lexer';
import { Parser } from '../../interpreter/parser';
import { Interpreter } from '../../interpreter/interpreter';
import { InterpreterError } from '../../interpreter/errors';

describe('Lists - Creation and Basic Operations', () => {
  it('should create a list', () => {
    const text = `
    variable x: List = 1, 2, 3;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("x");
    expect(result).toBeDefined();
    expect(result?.elements).toBeDefined();
    expect(result?.elements.length).toBe(3);
    expect(result?.elements.map(e => e.value)).toEqual([1, 2, 3]);
  });

  it('should handle list with mixed types', () => {
    const text = `
    variable x: List = 1, "hello", true;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("x");
    expect(result).toBeDefined();
    expect(result?.elements).toBeDefined();
    expect(result?.elements.length).toBe(3);
    expect(result?.elements[0].value).toBe(1);
    expect(result?.elements[1].toString()).toBe("hello");
    expect(result?.elements[2].value).toBe(true);
  });
});

describe('Lists - Methods', () => {
  it('should handle list append', () => {
    const text = `
    variable x: List = 1, 2;
    x.append(3);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("x");
    expect(result?.elements.map(e => e.value)).toEqual([1, 2, 3]);
  });

  it('should handle list extend', () => {
    const text = `
    variable x: List = 1, 2;
    variable y: List = 3, 4;
    x.extend(y);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("x");
    expect(result?.elements.map(e => e.value)).toEqual([1, 2, 3, 4]);
  });

  it('should handle list insert', () => {
    const text = `
    variable x: List = 1, 2, 4;
    x.insert(2, 3);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("x");
    expect(result?.elements.map(e => e.value)).toEqual([1, 2, 3, 4]);
  });

  it('should handle list delete', () => {
    const text = `
    variable x: List = 1, 2, 3, 4;
    x.delete(2);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("x");
    expect(result?.elements.map(e => e.value)).toEqual([1, 2, 4]);
  });

  it('should handle list length', () => {
    const text = `
    variable x: List = 1, 2, 3, 4;
    variable len: Number = x.length();
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("len");
    expect(result?.value).toBe(4);
  });

  it('should handle list index', () => {
    const text = `
    variable x: List = 1, 2, 3, 4;
    variable idx: Number = x.index(3);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("idx");
    expect(result?.value).toBe(2);
  });

  it('should handle list index not found', () => {
    const text = `
    variable x: List = 1, 2, 3, 4;
    variable idx: Number = x.index(5);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("idx");
    expect(result?.value).toBe(-1);
  });

  it('should handle list get method', () => {
    const text = `
    variable x: List = 1, 2, 3, 4;
    variable item: Number = x.get(2);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("item");
    expect(result?.value).toBe(3);
  });

  it('should handle list update method', () => {
    const text = `
    variable x: List = 1, 2, 3, 4;
    x.update(2, 99);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("x");
    expect(result?.elements.map(e => e.value)).toEqual([1, 2, 99, 4]);
  });
});

describe('Lists - Method Chaining', () => {
  it('should handle chaining methods', () => {
    const text = `
    variable x: List = 1, 2;
    x.append(3).append(4);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("x");
    expect(result?.elements.map(e => e.value)).toEqual([1, 2, 3, 4]);
  });
});

describe('Lists - Error Cases', () => {
  it('should throw error for insert out of range', () => {
    const text = `
    variable x: List = 1, 2, 3;
    x.insert(5, 4);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow();
  });

  it('should throw error for delete out of range', () => {
    const text = `
    variable x: List = 1, 2, 3;
    x.delete(5);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow();
  });

  it('should throw error for get out of range', () => {
    const text = `
    variable x: List = 1, 2, 3;
    variable item: Number = x.get(5);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow();
  });

  it('should throw error for update out of range', () => {
    const text = `
    variable x: List = 1, 2, 3;
    x.update(5, 99);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow();
  });
});
