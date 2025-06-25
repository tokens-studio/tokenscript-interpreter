import { describe, it, expect } from 'vitest';
import { Lexer } from '../../interpreter/lexer';
import { Parser } from '../../interpreter/parser';
import { Interpreter } from '../../interpreter/interpreter';

describe('Color Objects - Hex Color Literals', () => {
  it('should handle hex color literals', () => {
    const text = `
    variable color: Color = #FF5733;
    return color;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    
    expect(result).toBeDefined();
    expect(result!.toString()).toBe("#FF5733");
  });

  it('should handle 3-digit hex color literals', () => {
    const text = `
    variable color: Color = #F53;
    return color;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    
    expect(result).toBeDefined();
    expect(result!.toString()).toBe("#F53");
  });

  it('should handle hex colors in expressions', () => {
    const text = `
    variable primary: Color = #FF0000;
    variable secondary: Color = #00FF00;
    variable colors: List = primary, secondary;
    return colors;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    
    expect(result).toBeDefined();
    expect(result!.toString()).toBe("#FF0000, #00FF00");
  });
});

describe('Color Objects - Color Type System', () => {
  it('should handle color variable declarations', () => {
    const text = `
    variable red: Color = #FF0000;
    variable green: Color = #00FF00;
    variable blue: Color = #0000FF;
    variable result: List = red, green, blue;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const red = interpreter.symbolTable.get("red");
    const green = interpreter.symbolTable.get("green");
    const blue = interpreter.symbolTable.get("blue");
    const result = interpreter.symbolTable.get("result");
    
    expect(red?.toString()).toBe("#FF0000");
    expect(green?.toString()).toBe("#00FF00");
    expect(blue?.toString()).toBe("#0000FF");
    expect(result?.toString()).toBe("#FF0000, #00FF00, #0000FF");
  });

  it('should handle color assignment', () => {
    const text = `
    variable color: Color = #FFFFFF;
    color = #000000;
    return color;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    
    expect(result).toBeDefined();
    expect(result!.toString()).toBe("#000000");
  });
});

describe('Color Objects - Color Operations', () => {
  it('should handle colors in conditional statements', () => {
    const text = `
    variable color1: Color = #FF0000;
    variable color2: Color = #FF0000;
    variable color3: Color = #00FF00;
    variable same: Boolean = color1 == color2;
    variable different: Boolean = color1 == color3;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const same = interpreter.symbolTable.get("same");
    const different = interpreter.symbolTable.get("different");
    
    expect(same?.value).toBe(true);
    expect(different?.value).toBe(false);
  });

  it('should handle colors in lists', () => {
    const text = `
    variable palette: List = #FF0000, #00FF00, #0000FF, #FFFF00;
    variable first: Color = palette.get(0);
    variable length: Number = palette.length();
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    
    const palette = interpreter.symbolTable.get("palette");
    const first = interpreter.symbolTable.get("first");
    const length = interpreter.symbolTable.get("length");
    
    expect(palette?.elements.length).toBe(4);
    expect(first?.toString()).toBe("#FF0000");
    expect(length?.value).toBe(4);
  });

  it('should handle color references', () => {
    const text = `
    variable theme_color: Color = {primary_color};
    return theme_color;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {"primary_color": "#3366CC"});
    const result = interpreter.interpret();
    
    expect(result).toBeDefined();
    expect(result!.toString()).toBe("#3366CC");
  });
});
