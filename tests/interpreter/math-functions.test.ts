import { describe, it, expect } from 'vitest';
import { Lexer } from '../../interpreter/lexer';
import { Parser } from '../../interpreter/parser';
import { Interpreter } from '../../interpreter/interpreter';

describe('Math Functions - Parse Int', () => {
  it('should handle parse_int with base 16', () => {
    const text = `
    variable i: Number = parse_int("ff", 16);
    variable j: Number = parse_int("00", 16);
    variable k: Number = parse_int("A0", 16);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const i = interpreter.symbolTable.get("i");
    const j = interpreter.symbolTable.get("j");
    const k = interpreter.symbolTable.get("k");
    
    expect(i?.value).toBe(255);
    expect(j?.value).toBe(0);
    expect(k?.value).toBe(160);
  });

  it('should handle parse_int with base 10', () => {
    const text = `
    variable a: Number = parse_int("123", 10);
    variable b: Number = parse_int("0", 10);
    variable c: Number = parse_int("999", 10);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const a = interpreter.symbolTable.get("a");
    const b = interpreter.symbolTable.get("b");
    const c = interpreter.symbolTable.get("c");
    
    expect(a?.value).toBe(123);
    expect(b?.value).toBe(0);
    expect(c?.value).toBe(999);
  });

  it('should handle parse_int with base 2', () => {
    const text = `
    variable binary1: Number = parse_int("1010", 2);
    variable binary2: Number = parse_int("1111", 2);
    variable binary3: Number = parse_int("0", 2);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const binary1 = interpreter.symbolTable.get("binary1");
    const binary2 = interpreter.symbolTable.get("binary2");
    const binary3 = interpreter.symbolTable.get("binary3");
    
    expect(binary1?.value).toBe(10);
    expect(binary2?.value).toBe(15);
    expect(binary3?.value).toBe(0);
  });
});

describe('Math Functions - Power Operations', () => {
  it('should handle pow function', () => {
    const text = `
    variable result1: Number = pow(2, 3);
    variable result2: Number = pow(5, 2);
    variable result3: Number = pow(10, 0);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result1 = interpreter.symbolTable.get("result1");
    const result2 = interpreter.symbolTable.get("result2");
    const result3 = interpreter.symbolTable.get("result3");
    
    expect(result1?.value).toBe(8);
    expect(result2?.value).toBe(25);
    expect(result3?.value).toBe(1);
  });

  it('should handle pow with decimal numbers', () => {
    const text = `
    variable result1: Number = pow(2.5, 2);
    variable result2: Number = pow(4, 0.5);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const result1 = interpreter.symbolTable.get("result1");
    const result2 = interpreter.symbolTable.get("result2");
    
    expect(result1?.value).toBe(6.25);
    expect(result2?.value).toBe(2);
  });
});

describe('Math Functions - Trigonometric', () => {
  it('should handle basic trigonometric functions', () => {
    const text = `
    variable sin_result: Number = sin(0);
    variable cos_result: Number = cos(0);
    variable tan_result: Number = tan(0);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const sinResult = interpreter.symbolTable.get("sin_result");
    const cosResult = interpreter.symbolTable.get("cos_result");
    const tanResult = interpreter.symbolTable.get("tan_result");
    
    expect(sinResult?.value).toBe(0);
    expect(cosResult?.value).toBe(1);
    expect(tanResult?.value).toBe(0);
  });
});

describe('Math Functions - Rounding', () => {
  it('should handle rounding functions', () => {
    const text = `
    variable round_result: Number = round(3.7);
    variable floor_result: Number = floor(3.7);
    variable ceil_result: Number = ceil(3.2);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const roundResult = interpreter.symbolTable.get("round_result");
    const floorResult = interpreter.symbolTable.get("floor_result");
    const ceilResult = interpreter.symbolTable.get("ceil_result");
    
    expect(roundResult?.value).toBe(4);
    expect(floorResult?.value).toBe(3);
    expect(ceilResult?.value).toBe(4);
  });
});

describe('Math Functions - Complex Expressions', () => {
  it('should handle complex math expressions with functions', () => {
    const text = `
    variable complex: Number = sqrt(pow(3, 2) + pow(4, 2));
    variable nested: Number = round(sin(pi() / 2) * 100);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const complex = interpreter.symbolTable.get("complex");
    const nested = interpreter.symbolTable.get("nested");
    
    expect(complex?.value).toBe(5); // sqrt(9 + 16) = sqrt(25) = 5
    expect(nested?.value).toBe(100); // sin(π/2) = 1, * 100 = 100
  });

  it('should handle math functions in color conversion', () => {
    const text = `
    variable gamma: Number = 2.4;
    variable normalized: Number = 0.5;
    variable linear: Number = pow((normalized + 0.055) / 1.055, gamma);
    variable rounded: Number = round(linear * 1000) / 1000;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const linear = interpreter.symbolTable.get("linear");
    const rounded = interpreter.symbolTable.get("rounded");
    
    expect(linear?.value).toBeCloseTo(0.214, 3);
    expect(rounded?.value).toBeCloseTo(0.214, 3);
  });
});
