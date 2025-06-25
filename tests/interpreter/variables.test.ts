import { describe, it, expect } from 'vitest';
import { Lexer } from '../../interpreter/lexer';
import { Parser } from '../../interpreter/parser';
import { Interpreter } from '../../interpreter/interpreter';
import { InterpreterError } from '../../interpreter/errors';

describe('Variables - Assignment', () => {
  it('should handle variable assignment', () => {
    const text = `
    variable hello: String = abcd;
    variable world: Number = 123;
    variable complex: NumberWithUnit = (1 + 2 * 3)rem;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const hello = interpreter.symbolTable.get("hello");
    const world = interpreter.symbolTable.get("world");
    const complex = interpreter.symbolTable.get("complex");
    
    expect(hello?.toString()).toBe("abcd");
    expect(world?.toString()).toBe("123");
    expect(complex?.toString()).toBe("7rem");
  });

  it('should throw error for duplicate variable declaration', () => {
    const text = `
    variable hello: String = abcd;
    variable hello: String = efgh;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });

  it('should handle variable reassignment', () => {
    const text = `
    variable hello: String = abcd;
    hello = efgh;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const hello = interpreter.symbolTable.get("hello");
    expect(hello?.toString()).toBe("efgh");
  });

  it('should throw error for reassigning undefined variable', () => {
    const text = `
    hello = efgh;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });

  it('should throw error for invalid value assignment', () => {
    const text = `
    variable hello: String = abcd;
    hello = 123;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });

  it('should throw error for invalid type unit number assignment', () => {
    const text = `
    variable hello: String = abcd;
    hello = 123rem;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });

  it('should handle assigning variable from variable', () => {
    const text = `
    variable hello: String = abcd;
    variable world: String = hello;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const hello = interpreter.symbolTable.get("hello");
    const world = interpreter.symbolTable.get("world");
    expect(hello?.toString()).toBe("abcd");
    expect(world?.toString()).toBe("abcd");
  });

  it('should handle explicit string assignment', () => {
    const text = `
    variable hello: String = "abcd";
    hello = "abcdd 'sds'";
    variable world: String = 'efgh';
    variable blub: String = hello;
    variable lst: String = hello world;
    variable lst2: String = hello world blub;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const hello = interpreter.symbolTable.get("hello");
    const world = interpreter.symbolTable.get("world");
    const blub = interpreter.symbolTable.get("blub");
    const lst = interpreter.symbolTable.get("lst");
    const lst2 = interpreter.symbolTable.get("lst2");
    
    expect(hello?.toString()).toBe("abcdd 'sds'");
    expect(world?.toString()).toBe("efgh");
    expect(blub?.toString()).toBe("abcdd 'sds'");
    expect(lst?.toString()).toBe("abcdd 'sds' efgh");
    expect(lst2?.toString()).toBe("abcdd 'sds' efgh abcdd 'sds'");
  });

  it('should throw error for string to number assignment', () => {
    const text = `
    variable hello: String = "123";
    hello = 123;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });

  it('should throw error for string to number assignment with unit', () => {
    const text = `
    variable hello: String = "123rem";
    hello = 123;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });

  it('should throw error for list to number assignment', () => {
    const text = `
    variable hello: List = 1, 2, 3;
    hello = 123;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });
});

describe('Variables - Math Operations', () => {
  it('should throw error for math with strings', () => {
    const text = `
    variable hello: String = "123";
    variable world: String = "456";
    variable result: Number = hello + world;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });

  it('should handle math with numbers', () => {
    const text = `
    variable hello: Number = 123;
    variable world: Number = 456;
    variable result: NumberWithUnit = (hello + world)deg;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("result");
    expect(result?.toString()).toBe("579deg");
  });
});

describe('Variables - String Features', () => {
  it('should handle string methods', () => {
    const text = `
    variable hello: String = "HELLO";
    variable world: String = "world";
    variable result: String = hello.lower();
    variable result2: String = world.upper();
    variable result3: String = hello world;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("result");
    const result2 = interpreter.symbolTable.get("result2");
    const result3 = interpreter.symbolTable.get("result3");
    
    expect(result?.toString()).toBe("hello");
    expect(result2?.toString()).toBe("WORLD");
    expect(result3?.toString()).toBe("HELLO world");
  });

  it('should handle string concatenation', () => {
    const text = `
    variable hello: String = "HELLO";
    variable world: String = "world";
    variable result: String = hello.lower().concat(" ".concat(world));
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("result");
    expect(result?.toString()).toBe("hello world");
  });

  it('should handle string length', () => {
    const text = `
    variable hello: String = "HELLO";
    variable world: String = "world";
    variable result: Number = hello.concat(world).length();
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("result");
    expect(result?.toString()).toBe("10");
  });

  it('should handle string split', () => {
    const text = `
    variable hello: String = "HELLO world";
    variable result: List = hello.split(" ");
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("result");
    expect(result?.toString()).toBe("HELLO, world");
  });

  it('should handle string split empty', () => {
    const text = `
    variable hello: String = "";
    variable result: List = hello.split(" ");
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("result");
    expect(result?.toString()).toBe("");
  });

  it('should handle string split no delimiter', () => {
    const text = `
    variable hello: String = "HELLO world";
    variable result: List = hello.split();
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("result");
    expect(result?.toString()).toBe("H, E, L, L, O,  , w, o, r, l, d");
  });
});

describe('Variables - Number Features', () => {
  it('should handle number to string', () => {
    const text = `
    variable hello: Number = 123;
    variable result: String = hello.to_string();
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("result");
    expect(result?.toString()).toBe("123");
  });

  it('should handle number to string with unit', () => {
    const text = `
    variable hello: NumberWithUnit = 123rem;
    variable result: String = hello.to_string();
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("result");
    expect(result?.toString()).toBe("123rem");
  });
});

describe('Variables - Boolean Features', () => {
  it('should handle boolean operations', () => {
    const text = `
    variable hello: Boolean = true;
    variable world: Boolean = false;
    variable result: Boolean = hello && world;
    variable true_result: Boolean = hello || world;
    variable false_result: Boolean = world && hello;
    variable not_result: Boolean = !world;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("result");
    const trueResult = interpreter.symbolTable.get("true_result");
    const falseResult = interpreter.symbolTable.get("false_result");
    const notResult = interpreter.symbolTable.get("not_result");
    
    expect(result?.value).toBe(false);
    expect(trueResult?.value).toBe(true);
    expect(falseResult?.value).toBe(false);
    expect(notResult?.value).toBe(true);
  });

  it('should handle boolean comparison', () => {
    const text = `
    variable hello: Boolean = true;
    variable world: Boolean = false;
    variable result: Boolean = hello == world;
    variable not_result: Boolean = (hello != world) && !world;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("result");
    const notResult = interpreter.symbolTable.get("not_result");
    
    expect(result?.value).toBe(false);
    expect(notResult?.value).toBe(true);
  });

  it('should handle number comparison', () => {
    const text = `
    variable hello: Number = 123;
    variable world: Number = 456;
    variable result: Boolean = hello == world;
    variable not_result: Boolean = !(hello >= world) && !(1 > world);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result = interpreter.symbolTable.get("result");
    const notResult = interpreter.symbolTable.get("not_result");
    
    expect(result?.value).toBe(false);
    expect(notResult?.value).toBe(true);
  });
});
