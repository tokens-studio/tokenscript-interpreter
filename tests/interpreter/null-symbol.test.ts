import { describe, expect, it } from "vitest";

import { 
  NullSymbol, 
  jsValueToSymbolType, 
  NumberSymbol,
  StringSymbol,
  BooleanSymbol,
  NumberWithUnitSymbol,
  ColorSymbol,
  ListSymbol,
  DictionarySymbol
} from "@src/interpreter/symbols";
import { Interpreter } from "@interpreter/interpreter";
import { Lexer } from "@interpreter/lexer";
import { Parser } from "@interpreter/parser";

// Helper function to run interpreter code and return the result
const run = (code: string, references?: Record<string, any>) => {
  const lexer = new Lexer(code);
  const parser = new Parser(lexer);
  const interpreter = new Interpreter(parser, { references });
  return interpreter.interpret();
};

describe("NullSymbol", () => {
  it("should create a NullSymbol instance", () => {
    const nullSym = new NullSymbol();
    
    expect(nullSym.type).toBe("Null");
    expect(nullSym.value).toBe(null);
    expect(nullSym.toString()).toBe("null");
  });

  it("should create empty NullSymbol", () => {
    const emptySym = NullSymbol.empty();
    
    expect(emptySym).toBeInstanceOf(NullSymbol);
    expect(emptySym.type).toBe("Null");
    expect(emptySym.value).toBe(null);
  });

  it("should handle equals correctly", () => {
    const null1 = new NullSymbol();
    const null2 = new NullSymbol();
    
    expect(null1.equals(null2)).toBe(true);
    expect(null2.equals(null1)).toBe(true);
  });

  it("should accept any value as valid", () => {
    const nullSym = new NullSymbol();
    
    expect(nullSym.validValue(null)).toBe(true);
    expect(nullSym.validValue(undefined)).toBe(true);
    expect(nullSym.validValue("string")).toBe(false);
    expect(nullSym.validValue(42)).toBe(false);
    expect(nullSym.validValue({})).toBe(false);
  });

  it("should be created from jsValueToSymbolType for null/undefined", () => {
    const nullSym = jsValueToSymbolType(null);
    const undefinedSym = jsValueToSymbolType(undefined);
    
    expect(nullSym).toBeInstanceOf(NullSymbol);
    expect(undefinedSym).toBeInstanceOf(NullSymbol);
    expect(nullSym.type).toBe("Null");
    expect(undefinedSym.type).toBe("Null");
  });
});

describe("Null Coercion", () => {
  // Helper function to test null coercion for a given type
  const testNullCoercion = (typeName: string, expectedType: string, expectedValue: any = null) => {
    const text = `
      variable c: Dictionary;
      variable foo: ${typeName} = c.get("foo");
      return foo;
    `;
    
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    const result = interpreter.interpret();
    
    expect(result?.type).toBe(expectedType);
    expect(result?.value).toBe(expectedValue);
    
    // Also verify it's in the symbol table
    const foo = interpreter.symbolTable.get("foo");
    expect(foo?.type).toBe(expectedType);
    expect(foo?.value).toBe(expectedValue);
  };

  it("should coerce NullSymbol to Number", () => {
    testNullCoercion("Number", "Number", null);
  });

  it("should coerce NullSymbol to String", () => {
    testNullCoercion("String", "String", null);
  });

  it("should coerce NullSymbol to Boolean", () => {
    testNullCoercion("Boolean", "Boolean", null);
  });

  it("should coerce NullSymbol to NumberWithUnit", () => {
    testNullCoercion("NumberWithUnit", "NumberWithUnit", null);
  });

  it("should coerce NullSymbol to Color", () => {
    testNullCoercion("Color", "Color", null);
  });

  it("should coerce NullSymbol to List", () => {
    // For lists, we expect an empty array rather than null
    const text = `
      variable c: Dictionary;
      variable foo: List = c.get("foo");
      return foo;
    `;
    
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    const result = interpreter.interpret();
    
    expect(result).toBeInstanceOf(ListSymbol);
    expect((result as ListSymbol).elements).toEqual([]);
    expect(result?.type).toBe("List");
  });

  it("should coerce NullSymbol to Dictionary", () => {
    const text = `
      variable c: Dictionary;
      variable foo: Dictionary = c.get("foo");
      return foo;
    `;
    
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    const result = interpreter.interpret();
    
    expect(result).toBeInstanceOf(DictionarySymbol);
    expect((result as DictionarySymbol).value).toEqual({});
  });

  it("should handle null coercion in variable declaration without assignment", () => {
    const text = `
      variable foo: String;
      return foo;
    `;
    
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    const result = interpreter.interpret();
    
    expect(result?.type).toBe("String");
    expect(result?.value).toBe(null);
  });

  it("should handle complex null coercion scenarios", () => {
    const text = `
      variable dict: Dictionary;
      variable str: String = dict.get("nonexistent");
      variable num: Number = dict.get("alsoNonexistent");
      variable bool: Boolean = dict.get("missing");
      
      return str, num, bool;
    `;
    
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    const result = interpreter.interpret();
    
    expect(result).toBeInstanceOf(ListSymbol);
    const list = result as ListSymbol;
    
    expect(list.elements).toHaveLength(3);
    expect(list.elements[0]).toBeInstanceOf(StringSymbol);
    expect(list.elements[0].value).toBe(null);
    expect(list.elements[1]).toBeInstanceOf(NumberSymbol);
    expect(list.elements[1].value).toBe(null);
    expect(list.elements[2]).toBeInstanceOf(BooleanSymbol);
    expect(list.elements[2].value).toBe(null);
  });

  it("should handle null coercion with NumberWithUnit subtypes", () => {
    const text = `
      variable dict: Dictionary;
      variable number: NumberWithUnit = dict.get("foo");
      return number;
    `;
    
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    const result = interpreter.interpret();
    
    expect(result).toBeInstanceOf(NumberWithUnitSymbol);
    const nwu = result as NumberWithUnitSymbol;
    expect(nwu.value).toBe(null);
    expect(nwu.unit).toBe("px");
  });

  it("should handle null coercion with Color subtypes", () => {
    const text = `
      variable dict: Dictionary;
      variable hexColor: Color.Hex = dict.get("foo");
      return hexColor;
    `;
    
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    const result = interpreter.interpret();
    
    expect(result).toBeInstanceOf(ColorSymbol);
    const color = result as ColorSymbol;
    expect(color.value).toBe(null);
    expect(color.subType).toBe("Hex");
  });

  it("should disallow reassignment of null values between different types", () => {
    const text = `
      variable dict: Dictionary;
      variable str: String = dict.get("nonexistent");
      variable num: Number = str;
    `;
    
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    
    expect(() => interpreter.interpret()).toThrow(/Invalid value.*for variable 'num'/);
  });

  it("should disallow cross-type null assignments in various combinations", () => {
    // String to Number
    expect(() => {
      const text = `
        variable dict: Dictionary;
        variable str: String = dict.get("foo");
        variable num: Number = str;
      `;
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
      interpreter.interpret();
    }).toThrow(/Invalid value.*for variable 'num'/);

    // Number to Boolean
    expect(() => {
      const text = `
        variable dict: Dictionary;
        variable num: Number = dict.get("foo");
        variable bool: Boolean = num;
      `;
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
      interpreter.interpret();
    }).toThrow(/Invalid value.*for variable 'bool'/);

    // Boolean to String
    expect(() => {
      const text = `
        variable dict: Dictionary;
        variable bool: Boolean = dict.get("foo");
        variable str: String = bool;
      `;
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
      interpreter.interpret();
    }).toThrow(/Invalid value.*for variable 'str'/);
  });

  it("should allow assignment of same type null values", () => {
    const text = `
      variable dict: Dictionary;
      variable str1: String = dict.get("foo");
      variable str2: String = str1;
      return str2;
    `;
    
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    const result = interpreter.interpret();
    
    expect(result).toBeInstanceOf(StringSymbol);
    expect(result?.type).toBe("String");
    expect(result?.value).toBe(null);
  });
});

describe("Null Comparison Tests", () => {
  describe("Nullable Types - Should return true when comparing null values to null", () => {
    it("should compare String null value to null", () => {
      const result = run(`
        variable a: String;
        return a == null;
      `);
      
      expect(result).toBeInstanceOf(BooleanSymbol);
      expect(result?.value).toBe(true);
    });

    it("should compare Number null value to null", () => {
      const result = run(`
        variable a: Number;
        return a == null;
      `);
      
      expect(result).toBeInstanceOf(BooleanSymbol);
      expect(result?.value).toBe(true);
    });

    it("should compare Boolean null value to null", () => {
      const result = run(`
        variable a: Boolean;
        return a == null;
      `);
      
      expect(result).toBeInstanceOf(BooleanSymbol);
      expect(result?.value).toBe(true);
    });

    it("should compare NumberWithUnit null value to null", () => {
      const result = run(`
        variable a: NumberWithUnit;
        return a == null;
      `);
      
      expect(result).toBeInstanceOf(BooleanSymbol);
      expect(result?.value).toBe(true);
    });

    it("should compare Color null value to null", () => {
      const result = run(`
        variable a: Color;
        return a == null;
      `);
      
      expect(result).toBeInstanceOf(BooleanSymbol);
      expect(result?.value).toBe(true);
    });

    it("should compare Color.Hex null value to null", () => {
      const result = run(`
        variable a: Color.Hex;
        return a == null;
      `);
      
      expect(result).toBeInstanceOf(BooleanSymbol);
      expect(result?.value).toBe(true);
    });
  });

  describe("Nullable Types - Should return false when comparing non-null values to null", () => {
    it("should compare String with value to null", () => {
      const result = run(`
        variable a: String = "hello";
        return a == null;
      `);
      
      expect(result).toBeInstanceOf(BooleanSymbol);
      expect(result?.value).toBe(false);
    });

    it("should compare Number with value to null", () => {
      const result = run(`
        variable a: Number = 42;
        return a == null;
      `);
      
      expect(result).toBeInstanceOf(BooleanSymbol);
      expect(result?.value).toBe(false);
    });

    it("should compare Boolean with value to null", () => {
      const result = run(`
        variable a: Boolean = true;
        return a == null;
      `);
      
      expect(result).toBeInstanceOf(BooleanSymbol);
      expect(result?.value).toBe(false);
    });

    it("should compare NumberWithUnit with value to null", () => {
      const result = run(`
        variable a: NumberWithUnit = 10px;
        return a == null;
      `);
      
      expect(result).toBeInstanceOf(BooleanSymbol);
      expect(result?.value).toBe(false);
    });

    it("should compare Color with value to null", () => {
      const result = run(`
        variable a: Color = #ff0000;
        return a == null;
      `);
      
      expect(result).toBeInstanceOf(BooleanSymbol);
      expect(result?.value).toBe(false);
    });
  });

  describe("Non-nullable Types - List and Dictionary cannot have null values", () => {
    it("should compare empty List to null (should return false)", () => {
      const result = run(`
        variable a: List;
        return a == null;
      `);
      
      expect(result).toBeInstanceOf(BooleanSymbol);
      expect(result?.value).toBe(false);
    });

    it("should compare List with elements to null (should return false)", () => {
      const result = run(`
        variable a: List = 1, 2, 3;
        return a == null;
      `);
      
      expect(result).toBeInstanceOf(BooleanSymbol);
      expect(result?.value).toBe(false);
    });

    it("should compare empty Dictionary to null (should return false)", () => {
      const result = run(`
        variable a: Dictionary;
        return a == null;
      `);
      
      expect(result).toBeInstanceOf(BooleanSymbol);
      expect(result?.value).toBe(false);
    });

    it("should compare Dictionary with values to null (should return false)", () => {
      const result = run(`
        variable a: Dictionary;
        a.set("key", "value");
        return a == null;
      `);
      
      expect(result).toBeInstanceOf(BooleanSymbol);
      expect(result?.value).toBe(false);
    });
  });

  describe("Inequality comparison with null", () => {
    it("should handle != null comparison for nullable types", () => {
      const resultNull = run(`
        variable a: String;
        return a != null;
      `);
      
      expect(resultNull).toBeInstanceOf(BooleanSymbol);
      expect(resultNull?.value).toBe(false);

      const resultValue = run(`
        variable a: String = "hello";
        return a != null;
      `);
      
      expect(resultValue).toBeInstanceOf(BooleanSymbol);
      expect(resultValue?.value).toBe(true);
    });

    it("should handle != null comparison for non-nullable types", () => {
      const result = run(`
        variable a: List;
        return a != null;
      `);
      
      expect(result).toBeInstanceOf(BooleanSymbol);
      expect(result?.value).toBe(true);
    });
  });

  describe("Complex null comparison scenarios", () => {
    it("should handle multiple null comparisons in one expression", () => {
      const result = run(`
        variable a: String;
        variable b: Number;
        variable c: List;
        return (a == null) && (b == null) && (c != null);
      `);
      
      expect(result).toBeInstanceOf(BooleanSymbol);
      expect(result?.value).toBe(true);
    });

    it("should handle null comparison in if statements", () => {
      const result = run(`
        variable a: String;
        if (a == null) [
          return "is null";
        ] else [
          return "not null";
        ];
      `);
      
      expect(result).toBeInstanceOf(StringSymbol);
      expect(result?.value).toBe("is null");
    });

    it("should handle null comparison with method results", () => {
      const result = run(`
        variable dict: Dictionary;
        variable retrieved: String = dict.get("nonexistent");
        return retrieved == null;
      `);
      
      expect(result).toBeInstanceOf(BooleanSymbol);
      expect(result?.value).toBe(true);
    });
  });
});
