import { FunctionsErrorCode, InterpreterError } from "@interpreter/errors";
import { Interpreter } from "@interpreter/interpreter";
import { Lexer } from "@interpreter/lexer";
import { Parser } from "@interpreter/parser";
import { describe, expect, it } from "vitest";

describe("Math Functions - Parse Int", () => {
  it("should handle parse_int with base 16", () => {
    const text = `
    variable i: Number = parse_int("ff", 16);
    variable j: Number = parse_int("00", 16);
    variable k: Number = parse_int("A0", 16);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const i = interpreter.symbolTable.get("i");
    const j = interpreter.symbolTable.get("j");
    const k = interpreter.symbolTable.get("k");

    expect(i?.value).toBe(255);
    expect(j?.value).toBe(0);
    expect(k?.value).toBe(160);
  });

  it("should handle parse_int with base 10", () => {
    const text = `
    variable a: Number = parse_int("123", 10);
    variable b: Number = parse_int("0", 10);
    variable c: Number = parse_int("999", 10);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const a = interpreter.symbolTable.get("a");
    const b = interpreter.symbolTable.get("b");
    const c = interpreter.symbolTable.get("c");

    expect(a?.value).toBe(123);
    expect(b?.value).toBe(0);
    expect(c?.value).toBe(999);
  });

  it("should handle parse_int with base 2", () => {
    const text = `
    variable binary1: Number = parse_int("1010", 2);
    variable binary2: Number = parse_int("1111", 2);
    variable binary3: Number = parse_int("0", 2);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const binary1 = interpreter.symbolTable.get("binary1");
    const binary2 = interpreter.symbolTable.get("binary2");
    const binary3 = interpreter.symbolTable.get("binary3");

    expect(binary1?.value).toBe(10);
    expect(binary2?.value).toBe(15);
    expect(binary3?.value).toBe(0);
  });
});

describe("Math Functions - Power Operations", () => {
  it("should handle pow function", () => {
    const text = `
    variable result1: Number = pow(2, 3);
    variable result2: Number = pow(5, 2);
    variable result3: Number = pow(10, 0);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const result1 = interpreter.symbolTable.get("result1");
    const result2 = interpreter.symbolTable.get("result2");
    const result3 = interpreter.symbolTable.get("result3");

    expect(result1?.value).toBe(8);
    expect(result2?.value).toBe(25);
    expect(result3?.value).toBe(1);
  });

  it("should handle pow with decimal numbers", () => {
    const text = `
    variable result1: Number = pow(2.5, 2);
    variable result2: Number = pow(4, 0.5);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const result1 = interpreter.symbolTable.get("result1");
    const result2 = interpreter.symbolTable.get("result2");

    expect(result1?.value).toBe(6.25);
    expect(result2?.value).toBe(2);
  });
});

describe("Math Functions - Trigonometric", () => {
  it("should handle basic trigonometric functions", () => {
    const text = `
    variable sin_result: Number = sin(0);
    variable cos_result: Number = cos(0);
    variable tan_result: Number = tan(0);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const sinResult = interpreter.symbolTable.get("sin_result");
    const cosResult = interpreter.symbolTable.get("cos_result");
    const tanResult = interpreter.symbolTable.get("tan_result");

    expect(sinResult?.value).toBe(0);
    expect(cosResult?.value).toBe(1);
    expect(tanResult?.value).toBe(0);
  });
});

describe("Math Functions - Rounding", () => {
  it("should handle rounding functions", () => {
    const text = `
    variable round_result: Number = round(3.7);
    variable floor_result: Number = floor(3.7);
    variable ceil_result: Number = ceil(3.2);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const roundResult = interpreter.symbolTable.get("round_result");
    const floorResult = interpreter.symbolTable.get("floor_result");
    const ceilResult = interpreter.symbolTable.get("ceil_result");

    expect(roundResult?.value).toBe(4);
    expect(floorResult?.value).toBe(3);
    expect(ceilResult?.value).toBe(4);
  });

  it("should implement standard rounding (round half up)", () => {
    const text = `
    variable round_2_5: Number = round(2.5);
    variable round_3_5: Number = round(3.5);
    variable round_4_5: Number = round(4.5);
    variable round_5_5: Number = round(5.5);
    variable round_neg_2_5: Number = round(-2.5);
    variable round_neg_3_5: Number = round(-3.5);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    // Standard rounding: .5 rounds away from zero
    expect(interpreter.symbolTable.get("round_2_5")?.value).toBe(3); // 2.5 -> 3
    expect(interpreter.symbolTable.get("round_3_5")?.value).toBe(4); // 3.5 -> 4
    expect(interpreter.symbolTable.get("round_4_5")?.value).toBe(5); // 4.5 -> 5
    expect(interpreter.symbolTable.get("round_5_5")?.value).toBe(6); // 5.5 -> 6
    expect(interpreter.symbolTable.get("round_neg_2_5")?.value).toBe(-2); // -2.5 -> -2 (JS rounds toward +infinity)
    expect(interpreter.symbolTable.get("round_neg_3_5")?.value).toBe(-3); // -3.5 -> -3 (JS rounds toward +infinity)
  });
});

describe("Math Functions - round_to", () => {
  it("should handle round_to function with default precision", () => {
    const text = `
    variable result1: Number = round_to(3.14159);
    variable result2: Number = round_to(2.71828);
    variable result3: Number = round_to(1.41421);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const result1 = interpreter.symbolTable.get("result1");
    const result2 = interpreter.symbolTable.get("result2");
    const result3 = interpreter.symbolTable.get("result3");

    expect(result1?.value).toBe(3); // Default rounds to nearest integer
    expect(result2?.value).toBe(3);
    expect(result3?.value).toBe(1);
  });

  it("should handle round_to function with specified precision", () => {
    const text = `
    variable result1: Number = round_to(3.14159, 2);
    variable result2: Number = round_to(2.71828, 3);
    variable result3: Number = round_to(1.41421, 1);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const result1 = interpreter.symbolTable.get("result1");
    const result2 = interpreter.symbolTable.get("result2");
    const result3 = interpreter.symbolTable.get("result3");

    expect(result1?.value).toBe(3.14);
    expect(result2?.value).toBe(2.718); // 2.71828 rounded to 3 decimal places
    expect(result3?.value).toBe(1.4);
  });

  it("should handle round_to function with zero precision", () => {
    const text = `
    variable result1: Number = round_to(3.7, 0);
    variable result2: Number = round_to(2.3, 0);
    variable result3: Number = round_to(1.5, 0);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const result1 = interpreter.symbolTable.get("result1");
    const result2 = interpreter.symbolTable.get("result2");
    const result3 = interpreter.symbolTable.get("result3");

    expect(result1?.value).toBe(4);
    expect(result2?.value).toBe(2);
    expect(result3?.value).toBe(2); // 1.5 rounds to 2 (JavaScript's round half up)
  });

  it("should handle round_to function with font size calculations", () => {
    const text = `
    variable base: Number = 16;
    variable ratio: Number = 1.25;
    variable h1: Number = round_to(base * (ratio^5));
    variable h2: Number = round_to(base * (ratio^4));
    variable h3: Number = round_to(base * (ratio^3));
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const h1 = interpreter.symbolTable.get("h1");
    const h2 = interpreter.symbolTable.get("h2");
    const h3 = interpreter.symbolTable.get("h3");

    // 16 * 1.25^5 = 16 * 3.0517578125 = 48.828125 -> 49
    expect(h1?.value).toBe(49);
    // 16 * 1.25^4 = 16 * 2.44140625 = 39.0625 -> 39
    expect(h2?.value).toBe(39);
    // 16 * 1.25^3 = 16 * 1.953125 = 31.25 -> 31
    expect(h3?.value).toBe(31);
  });

  it("should handle round_to function with negative numbers", () => {
    const text = `
    variable result1: Number = round_to(-3.7);
    variable result2: Number = round_to(-2.3);
    variable result3: Number = round_to(-1.5);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const result1 = interpreter.symbolTable.get("result1");
    const result2 = interpreter.symbolTable.get("result2");
    const result3 = interpreter.symbolTable.get("result3");

    expect(result1?.value).toBe(-4);
    expect(result2?.value).toBe(-2);
    expect(result3?.value).toBe(-1); // -1.5 rounds to -1 (JS Math.round rounds toward +infinity)
  });

  it("should handle round_to function with precision and negative numbers", () => {
    const text = `
    variable result1: Number = round_to(-3.14159, 2);
    variable result2: Number = round_to(-2.71828, 3);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const result1 = interpreter.symbolTable.get("result1");
    const result2 = interpreter.symbolTable.get("result2");

    expect(result1?.value).toBe(-3.14);
    expect(result2?.value).toBe(-2.718); // -2.71828 rounded to 3 decimal places
  });
});

describe("Math Functions - Complex Expressions", () => {
  it("should handle complex math expressions with functions", () => {
    const text = `
    variable complex: Number = sqrt(pow(3, 2) + pow(4, 2));
    variable nested: Number = round(sin(pi() / 2) * 100);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const complex = interpreter.symbolTable.get("complex");
    const nested = interpreter.symbolTable.get("nested");

    expect(complex?.value).toBe(5); // sqrt(9 + 16) = sqrt(25) = 5
    expect(nested?.value).toBe(100); // sin(π/2) = 1, * 100 = 100
  });

  it("should handle math functions in color conversion", () => {
    const text = `
    variable gamma: Number = 2.4;
    variable normalized: Number = 0.5;
    variable linear: Number = pow((normalized + 0.055) / 1.055, gamma);
    variable rounded: Number = round(linear * 1000) / 1000;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const linear = interpreter.symbolTable.get("linear");
    const rounded = interpreter.symbolTable.get("rounded");

    expect(linear?.value).toBeCloseTo(0.214, 3);
    expect(rounded?.value).toBeCloseTo(0.214, 3);
  });

  it("should handle complex expressions with round_to", () => {
    const text = `
    variable base: Number = 14;
    variable growthRatio: Number = 1.2;
    variable shrinkRatio: Number = 0.9;
    variable bodyL: Number = round_to(base * (growthRatio^1));
    variable bodyS: Number = round_to(base * (shrinkRatio^-1));
    variable headlineXL: Number = round_to(base * (growthRatio^2));
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const bodyL = interpreter.symbolTable.get("bodyL");
    const bodyS = interpreter.symbolTable.get("bodyS");
    const headlineXL = interpreter.symbolTable.get("headlineXL");

    // 14 * 1.2 = 16.8 -> 17
    expect(bodyL?.value).toBe(17);
    // 14 * (0.9^-1) = 14 * 1.111... = 15.555... -> 16
    expect(bodyS?.value).toBe(16);
    // 14 * 1.2^2 = 14 * 1.44 = 20.16 -> 20
    expect(headlineXL?.value).toBe(20);
  });
});

describe("Math Functions - Inverse Trigonometric", () => {
  it("should handle asin function", () => {
    const text = `
    variable asin_0: Number = asin(0);
    variable asin_half: Number = asin(0.5);
    variable asin_one: Number = asin(1);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    expect(interpreter.symbolTable.get("asin_0")?.value).toBeCloseTo(0, 5);
    expect(interpreter.symbolTable.get("asin_half")?.value).toBeCloseTo(Math.PI / 6, 5);
    expect(interpreter.symbolTable.get("asin_one")?.value).toBeCloseTo(Math.PI / 2, 5);
  });

  it("should handle acos function", () => {
    const text = `
    variable acos_0: Number = acos(0);
    variable acos_half: Number = acos(0.5);
    variable acos_one: Number = acos(1);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    expect(interpreter.symbolTable.get("acos_0")?.value).toBeCloseTo(Math.PI / 2, 5);
    expect(interpreter.symbolTable.get("acos_half")?.value).toBeCloseTo(Math.PI / 3, 5);
    expect(interpreter.symbolTable.get("acos_one")?.value).toBeCloseTo(0, 5);
  });

  it("should handle atan function", () => {
    const text = `
    variable atan_0: Number = atan(0);
    variable atan_1: Number = atan(1);
    variable atan_neg1: Number = atan(-1);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    expect(interpreter.symbolTable.get("atan_0")?.value).toBeCloseTo(0, 5);
    expect(interpreter.symbolTable.get("atan_1")?.value).toBeCloseTo(Math.PI / 4, 5);
    expect(interpreter.symbolTable.get("atan_neg1")?.value).toBeCloseTo(-Math.PI / 4, 5);
  });

  it("should throw error for asin/acos with invalid range", () => {
    const text = `variable invalid: Number = asin(2);`;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);

    expect(() => interpreter.interpret()).toThrow(InterpreterError);

    try {
      interpreter.interpret();
    } catch (error) {
      expect(error).toBeInstanceOf(InterpreterError);
      expect((error as InterpreterError).code).toBe(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE);
      expect((error as InterpreterError).data.functionName).toBe("asin");
    }
  });
});

describe("Math Functions - Logarithmic", () => {
  it("should handle natural logarithm", () => {
    const text = `
    variable log_e: Number = log(2.718281828);
    variable log_1: Number = log(1);
    variable log_10: Number = log(10);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    expect(interpreter.symbolTable.get("log_e")?.value).toBeCloseTo(1, 5);
    expect(interpreter.symbolTable.get("log_1")?.value).toBeCloseTo(0, 5);
    expect(interpreter.symbolTable.get("log_10")?.value).toBeCloseTo(Math.log(10), 5);
  });

  it("should handle logarithm with custom base", () => {
    const text = `
    variable log_base_10: Number = log(100, 10);
    variable log_base_2: Number = log(8, 2);
    variable log_base_e: Number = log(2.718281828, 2.718281828);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    expect(interpreter.symbolTable.get("log_base_10")?.value).toBeCloseTo(2, 5);
    expect(interpreter.symbolTable.get("log_base_2")?.value).toBeCloseTo(3, 5);
    expect(interpreter.symbolTable.get("log_base_e")?.value).toBeCloseTo(1, 5);
  });

  it("should throw error for invalid logarithm arguments", () => {
    const text1 = `variable invalid: Number = log(0);`;
    const text2 = `variable invalid: Number = log(-1);`;
    const text3 = `variable invalid: Number = log(10, 1);`;

    const lexer1 = new Lexer(text1);
    const parser1 = new Parser(lexer1);
    const interpreter1 = new Interpreter(parser1);
    expect(() => interpreter1.interpret()).toThrow(InterpreterError);

    try {
      interpreter1.interpret();
    } catch (error) {
      expect(error).toBeInstanceOf(InterpreterError);
      expect((error as InterpreterError).code).toBe(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE);
      expect((error as InterpreterError).data.functionName).toBe("log");
    }

    const lexer2 = new Lexer(text2);
    const parser2 = new Parser(lexer2);
    const interpreter2 = new Interpreter(parser2);
    expect(() => interpreter2.interpret()).toThrow(InterpreterError);

    try {
      interpreter2.interpret();
    } catch (error) {
      expect(error).toBeInstanceOf(InterpreterError);
      expect((error as InterpreterError).code).toBe(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE);
      expect((error as InterpreterError).data.functionName).toBe("log");
    }

    const lexer3 = new Lexer(text3);
    const parser3 = new Parser(lexer3);
    const interpreter3 = new Interpreter(parser3);
    expect(() => interpreter3.interpret()).toThrow(InterpreterError);

    try {
      interpreter3.interpret();
    } catch (error) {
      expect(error).toBeInstanceOf(InterpreterError);
      expect((error as InterpreterError).code).toBe(FunctionsErrorCode.INVALID_BASE);
      expect((error as InterpreterError).data.functionName).toBe("log");
    }
  });
});

describe("Math Functions - Enhanced round_to with Standard Rounding", () => {
  it("should use standard rounding for precision cases", () => {
    const text = `
    variable round_2_25: Number = round_to(2.25, 1);
    variable round_2_35: Number = round_to(2.35, 1);
    variable round_2_45: Number = round_to(2.45, 1);
    variable round_2_55: Number = round_to(2.55, 1);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    // Standard rounding: .5 rounds up (away from zero for positive numbers)
    expect(interpreter.symbolTable.get("round_2_25")?.value).toBe(2.3); // 2.25 -> 2.3
    expect(interpreter.symbolTable.get("round_2_35")?.value).toBe(2.4); // 2.35 -> 2.4
    expect(interpreter.symbolTable.get("round_2_45")?.value).toBe(2.5); // 2.45 -> 2.5
    expect(interpreter.symbolTable.get("round_2_55")?.value).toBe(2.6); // 2.55 -> 2.6
  });

  it("should use standard rounding for integer precision", () => {
    const text = `
    variable round_12_5: Number = round_to(12.5, 0);
    variable round_13_5: Number = round_to(13.5, 0);
    variable round_14_5: Number = round_to(14.5, 0);
    variable round_15_5: Number = round_to(15.5, 0);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    // Standard rounding: .5 rounds up
    expect(interpreter.symbolTable.get("round_12_5")?.value).toBe(13); // 12.5 -> 13
    expect(interpreter.symbolTable.get("round_13_5")?.value).toBe(14); // 13.5 -> 14
    expect(interpreter.symbolTable.get("round_14_5")?.value).toBe(15); // 14.5 -> 15
    expect(interpreter.symbolTable.get("round_15_5")?.value).toBe(16); // 15.5 -> 16
  });
});

describe("Math Functions - NumberWithUnit Support", () => {
  it("should handle round with NumberWithUnit", () => {
    const text = `
    variable rounded_px: NumberWithUnit = round(1.5px);
    variable rounded_rem: NumberWithUnit = round(2.7rem);
    variable rounded_em: NumberWithUnit = round(3.2em);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const roundedPx = interpreter.symbolTable.get("rounded_px");
    const roundedRem = interpreter.symbolTable.get("rounded_rem");
    const roundedEm = interpreter.symbolTable.get("rounded_em");

    expect(roundedPx?.value).toBe(2);
    expect(roundedPx?.toString()).toBe("2px");
    expect(roundedRem?.value).toBe(3);
    expect(roundedRem?.toString()).toBe("3rem");
    expect(roundedEm?.value).toBe(3);
    expect(roundedEm?.toString()).toBe("3em");
  });

  it("should handle floor with NumberWithUnit", () => {
    const text = `
    variable floored_px: NumberWithUnit = floor(1.9px);
    variable floored_rem: NumberWithUnit = floor(2.1rem);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const flooredPx = interpreter.symbolTable.get("floored_px");
    const flooredRem = interpreter.symbolTable.get("floored_rem");

    expect(flooredPx?.value).toBe(1);
    expect(flooredPx?.toString()).toBe("1px");
    expect(flooredRem?.value).toBe(2);
    expect(flooredRem?.toString()).toBe("2rem");
  });

  it("should handle ceil with NumberWithUnit", () => {
    const text = `
    variable ceiled_px: NumberWithUnit = ceil(1.1px);
    variable ceiled_rem: NumberWithUnit = ceil(2.9rem);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const ceiledPx = interpreter.symbolTable.get("ceiled_px");
    const ceiledRem = interpreter.symbolTable.get("ceiled_rem");

    expect(ceiledPx?.value).toBe(2);
    expect(ceiledPx?.toString()).toBe("2px");
    expect(ceiledRem?.value).toBe(3);
    expect(ceiledRem?.toString()).toBe("3rem");
  });

  it("should handle abs with NumberWithUnit", () => {
    const text = `
    variable abs_px: NumberWithUnit = abs(-5px);
    variable abs_rem: NumberWithUnit = abs(-2.5rem);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const absPx = interpreter.symbolTable.get("abs_px");
    const absRem = interpreter.symbolTable.get("abs_rem");

    expect(absPx?.value).toBe(5);
    expect(absPx?.toString()).toBe("5px");
    expect(absRem?.value).toBe(2.5);
    expect(absRem?.toString()).toBe("2.5rem");
  });

  it("should handle round_to with NumberWithUnit", () => {
    const text = `
    variable rounded_px: NumberWithUnit = round_to(1.567px, 2);
    variable rounded_rem: NumberWithUnit = round_to(2.5rem, 0);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const roundedPx = interpreter.symbolTable.get("rounded_px");
    const roundedRem = interpreter.symbolTable.get("rounded_rem");

    expect(roundedPx?.value).toBe(1.57);
    expect(roundedPx?.toString()).toBe("1.57px");
    expect(roundedRem?.value).toBe(3);
    expect(roundedRem?.toString()).toBe("3rem");
  });
});

describe("Math Functions - Inverse Hyperbolic", () => {
  it("should handle asinh function", () => {
    const text = `
    variable asinh_0: Number = asinh(0);
    variable asinh_1: Number = asinh(1);
    variable asinh_neg1: Number = asinh(-1);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    expect(interpreter.symbolTable.get("asinh_0")?.value).toBeCloseTo(0, 5);
    expect(interpreter.symbolTable.get("asinh_1")?.value).toBeCloseTo(0.881373587, 5);
    expect(interpreter.symbolTable.get("asinh_neg1")?.value).toBeCloseTo(-0.881373587, 5);
  });

  it("should handle acosh function", () => {
    const text = `
    variable acosh_1: Number = acosh(1);
    variable acosh_2: Number = acosh(2);
    variable acosh_10: Number = acosh(10);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    expect(interpreter.symbolTable.get("acosh_1")?.value).toBeCloseTo(0, 5);
    expect(interpreter.symbolTable.get("acosh_2")?.value).toBeCloseTo(1.316957897, 5);
    expect(interpreter.symbolTable.get("acosh_10")?.value).toBeCloseTo(2.993222846, 5);
  });

  it("should throw error for acosh with invalid range", () => {
    const text = `variable invalid: Number = acosh(0.5);`;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);

    let caughtError: unknown;
    try {
      interpreter.interpret();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(InterpreterError);
    expect((caughtError as InterpreterError).code).toBe(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE);
    expect((caughtError as InterpreterError).data.functionName).toBe("acosh");
  });

  it("should handle atanh function", () => {
    const text = `
    variable atanh_0: Number = atanh(0);
    variable atanh_half: Number = atanh(0.5);
    variable atanh_neg_half: Number = atanh(-0.5);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    expect(interpreter.symbolTable.get("atanh_0")?.value).toBeCloseTo(0, 5);
    expect(interpreter.symbolTable.get("atanh_half")?.value).toBeCloseTo(0.549306144, 5);
    expect(interpreter.symbolTable.get("atanh_neg_half")?.value).toBeCloseTo(-0.549306144, 5);
  });

  it("should throw error for atanh with invalid range", () => {
    const text1 = `variable invalid: Number = atanh(1);`;
    const lexer1 = new Lexer(text1);
    const parser1 = new Parser(lexer1);
    const interpreter1 = new Interpreter(parser1);

    let error1: unknown;
    try {
      interpreter1.interpret();
    } catch (error) {
      error1 = error;
    }

    expect(error1).toBeInstanceOf(InterpreterError);
    expect((error1 as InterpreterError).code).toBe(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE);
    expect((error1 as InterpreterError).data.functionName).toBe("atanh");

    const text2 = `variable invalid: Number = atanh(-1);`;
    const lexer2 = new Lexer(text2);
    const parser2 = new Parser(lexer2);
    const interpreter2 = new Interpreter(parser2);

    expect(() => interpreter2.interpret()).toThrow(InterpreterError);
  });
});

describe("Math Functions - Exponential", () => {
  it("should handle exp function", () => {
    const text = `
    variable exp_0: Number = exp(0);
    variable exp_1: Number = exp(1);
    variable exp_neg1: Number = exp(-1);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    expect(interpreter.symbolTable.get("exp_0")?.value).toBeCloseTo(1, 5);
    expect(interpreter.symbolTable.get("exp_1")?.value).toBeCloseTo(Math.E, 5);
    expect(interpreter.symbolTable.get("exp_neg1")?.value).toBeCloseTo(1 / Math.E, 5);
  });

  it("should handle expm1 function", () => {
    const text = `
    variable expm1_0: Number = expm1(0);
    variable expm1_1: Number = expm1(1);
    variable expm1_small: Number = expm1(0.0001);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    expect(interpreter.symbolTable.get("expm1_0")?.value).toBeCloseTo(0, 5);
    expect(interpreter.symbolTable.get("expm1_1")?.value).toBeCloseTo(Math.E - 1, 5);
    // expm1 is more accurate than exp(x)-1 for small x
    expect(interpreter.symbolTable.get("expm1_small")?.value).toBeCloseTo(0.00010000500017, 8);
  });
});

describe("Math Functions - Logarithmic Extended", () => {
  it("should handle ln function (natural logarithm)", () => {
    const text = `
    variable ln_1: Number = ln(1);
    variable ln_e: Number = ln(2.718281828);
    variable ln_10: Number = ln(10);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    expect(interpreter.symbolTable.get("ln_1")?.value).toBeCloseTo(0, 5);
    expect(interpreter.symbolTable.get("ln_e")?.value).toBeCloseTo(1, 5);
    expect(interpreter.symbolTable.get("ln_10")?.value).toBeCloseTo(Math.log(10), 5);
  });

  it("should throw error for ln with invalid argument", () => {
    const text1 = `variable invalid: Number = ln(0);`;
    const lexer1 = new Lexer(text1);
    const parser1 = new Parser(lexer1);
    const interpreter1 = new Interpreter(parser1);

    let error1: unknown;
    try {
      interpreter1.interpret();
    } catch (error) {
      error1 = error;
    }

    expect(error1).toBeInstanceOf(InterpreterError);
    expect((error1 as InterpreterError).code).toBe(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE);
    expect((error1 as InterpreterError).data.functionName).toBe("ln");

    const text2 = `variable invalid: Number = ln(-1);`;
    const lexer2 = new Lexer(text2);
    const parser2 = new Parser(lexer2);
    const interpreter2 = new Interpreter(parser2);

    expect(() => interpreter2.interpret()).toThrow(InterpreterError);
  });

  it("should handle log10 function", () => {
    const text = `
    variable log10_1: Number = log10(1);
    variable log10_10: Number = log10(10);
    variable log10_100: Number = log10(100);
    variable log10_1000: Number = log10(1000);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    expect(interpreter.symbolTable.get("log10_1")?.value).toBeCloseTo(0, 5);
    expect(interpreter.symbolTable.get("log10_10")?.value).toBeCloseTo(1, 5);
    expect(interpreter.symbolTable.get("log10_100")?.value).toBeCloseTo(2, 5);
    expect(interpreter.symbolTable.get("log10_1000")?.value).toBeCloseTo(3, 5);
  });

  it("should throw error for log10 with invalid argument", () => {
    const text = `variable invalid: Number = log10(0);`;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);

    let caughtError: unknown;
    try {
      interpreter.interpret();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(InterpreterError);
    expect((caughtError as InterpreterError).code).toBe(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE);
    expect((caughtError as InterpreterError).data.functionName).toBe("log10");
  });

  it("should handle log2 function", () => {
    const text = `
    variable log2_1: Number = log2(1);
    variable log2_2: Number = log2(2);
    variable log2_8: Number = log2(8);
    variable log2_1024: Number = log2(1024);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    expect(interpreter.symbolTable.get("log2_1")?.value).toBeCloseTo(0, 5);
    expect(interpreter.symbolTable.get("log2_2")?.value).toBeCloseTo(1, 5);
    expect(interpreter.symbolTable.get("log2_8")?.value).toBeCloseTo(3, 5);
    expect(interpreter.symbolTable.get("log2_1024")?.value).toBeCloseTo(10, 5);
  });

  it("should throw error for log2 with invalid argument", () => {
    const text = `variable invalid: Number = log2(-5);`;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);

    let error: unknown;

    try {
      interpreter.interpret();
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(InterpreterError);
    const interpreterError = error as InterpreterError;
    expect(interpreterError.code).toBe(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE);
    expect(interpreterError.data.functionName).toBe("log2");
  });

  it("should handle log1p function", () => {
    const text = `
    variable log1p_0: Number = log1p(0);
    variable log1p_e_minus_1: Number = log1p(1.718281828);
    variable log1p_small: Number = log1p(0.0001);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    expect(interpreter.symbolTable.get("log1p_0")?.value).toBeCloseTo(0, 5);
    expect(interpreter.symbolTable.get("log1p_e_minus_1")?.value).toBeCloseTo(1, 5);
    // log1p is more accurate than log(1+x) for small x
    expect(interpreter.symbolTable.get("log1p_small")?.value).toBeCloseTo(0.00009999500033, 8);
  });

  it("should handle log1p at boundary value -1 (returns -Infinity)", () => {
    const text = `variable log1p_neg1: Number = log1p(-1);`;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    // log1p(-1) = ln(0) = -Infinity is mathematically valid
    expect(interpreter.symbolTable.get("log1p_neg1")?.value).toBe(Number.NEGATIVE_INFINITY);
  });

  it("should throw error for log1p with invalid argument (less than -1)", () => {
    const text = `variable invalid: Number = log1p(-2);`;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);

    let caughtError: unknown;
    try {
      interpreter.interpret();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(InterpreterError);
    expect((caughtError as InterpreterError).code).toBe(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE);
    expect((caughtError as InterpreterError).data.functionName).toBe("log1p");
  });
});

describe("Math Functions - Cube Root", () => {
  it("should handle cbrt function", () => {
    const text = `
    variable cbrt_8: Number = cbrt(8);
    variable cbrt_27: Number = cbrt(27);
    variable cbrt_neg8: Number = cbrt(-8);
    variable cbrt_0: Number = cbrt(0);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    expect(interpreter.symbolTable.get("cbrt_8")?.value).toBeCloseTo(2, 5);
    expect(interpreter.symbolTable.get("cbrt_27")?.value).toBeCloseTo(3, 5);
    expect(interpreter.symbolTable.get("cbrt_neg8")?.value).toBeCloseTo(-2, 5);
    expect(interpreter.symbolTable.get("cbrt_0")?.value).toBeCloseTo(0, 5);
  });

  it("should handle cbrt with NumberWithUnit", () => {
    const text = `
    variable cbrt_px: NumberWithUnit = cbrt(8px);
    variable cbrt_rem: NumberWithUnit = cbrt(27rem);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const cbrtPx = interpreter.symbolTable.get("cbrt_px");
    const cbrtRem = interpreter.symbolTable.get("cbrt_rem");

    expect(cbrtPx?.value).toBeCloseTo(2, 5);
    expect(cbrtPx?.toString()).toBe("2px");
    expect(cbrtRem?.value).toBeCloseTo(3, 5);
    expect(cbrtRem?.toString()).toBe("3rem");
  });
});

describe("Math Functions - Sign", () => {
  it("should handle sign function", () => {
    const text = `
    variable sign_pos: Number = sign(42);
    variable sign_neg: Number = sign(-42);
    variable sign_zero: Number = sign(0);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    expect(interpreter.symbolTable.get("sign_pos")?.value).toBe(1);
    expect(interpreter.symbolTable.get("sign_neg")?.value).toBe(-1);
    expect(interpreter.symbolTable.get("sign_zero")?.value).toBe(0);
  });

  it("should handle sign with NumberWithUnit", () => {
    const text = `
    variable sign_px: NumberWithUnit = sign(-5px);
    variable sign_rem: NumberWithUnit = sign(3rem);
    variable sign_em: NumberWithUnit = sign(0em);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const signPx = interpreter.symbolTable.get("sign_px");
    const signRem = interpreter.symbolTable.get("sign_rem");
    const signEm = interpreter.symbolTable.get("sign_em");

    expect(signPx?.value).toBe(-1);
    expect(signPx?.toString()).toBe("-1px");
    expect(signRem?.value).toBe(1);
    expect(signRem?.toString()).toBe("1rem");
    expect(signEm?.value).toBe(0);
    expect(signEm?.toString()).toBe("0em");
  });
});

describe("Math Functions - Truncate", () => {
  it("should handle trunc function", () => {
    const text = `
    variable trunc_pos: Number = trunc(3.7);
    variable trunc_neg: Number = trunc(-3.7);
    variable trunc_small: Number = trunc(0.9);
    variable trunc_neg_small: Number = trunc(-0.9);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    expect(interpreter.symbolTable.get("trunc_pos")?.value).toBe(3);
    expect(interpreter.symbolTable.get("trunc_neg")?.value).toBe(-3);
    expect(interpreter.symbolTable.get("trunc_small")?.value).toBe(0);
    // Math.trunc(-0.9) returns -0 in JavaScript
    expect(Object.is(interpreter.symbolTable.get("trunc_neg_small")?.value, -0)).toBe(true);
  });

  it("should handle trunc with NumberWithUnit", () => {
    const text = `
    variable trunc_px: NumberWithUnit = trunc(3.7px);
    variable trunc_rem: NumberWithUnit = trunc(-2.3rem);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const truncPx = interpreter.symbolTable.get("trunc_px");
    const truncRem = interpreter.symbolTable.get("trunc_rem");

    expect(truncPx?.value).toBe(3);
    expect(truncPx?.toString()).toBe("3px");
    expect(truncRem?.value).toBe(-2);
    expect(truncRem?.toString()).toBe("-2rem");
  });
});

describe("Math Functions - Hypot", () => {
  it("should handle hypot with two arguments", () => {
    const text = `
    variable hypot_3_4: Number = hypot(3, 4);
    variable hypot_5_12: Number = hypot(5, 12);
    variable hypot_1_1: Number = hypot(1, 1);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    expect(interpreter.symbolTable.get("hypot_3_4")?.value).toBeCloseTo(5, 5);
    expect(interpreter.symbolTable.get("hypot_5_12")?.value).toBeCloseTo(13, 5);
    expect(interpreter.symbolTable.get("hypot_1_1")?.value).toBeCloseTo(Math.sqrt(2), 5);
  });

  it("should handle hypot with multiple arguments", () => {
    const text = `
    variable hypot_1_2_2: Number = hypot(1, 2, 2);
    variable hypot_3_args: Number = hypot(3, 4, 12);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    expect(interpreter.symbolTable.get("hypot_1_2_2")?.value).toBeCloseTo(3, 5);
    expect(interpreter.symbolTable.get("hypot_3_args")?.value).toBeCloseTo(13, 5);
  });

  it("should handle hypot with single argument", () => {
    const text = `
    variable hypot_5: Number = hypot(5);
    variable hypot_neg: Number = hypot(-3);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    expect(interpreter.symbolTable.get("hypot_5")?.value).toBeCloseTo(5, 5);
    expect(interpreter.symbolTable.get("hypot_neg")?.value).toBeCloseTo(3, 5);
  });
});

describe("Math Functions - Remainder", () => {
  it("should handle remainder function", () => {
    const text = `
    variable rem_7_3: Number = remainder(7, 3);
    variable rem_10_4: Number = remainder(10, 4);
    variable rem_9_3: Number = remainder(9, 3);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    expect(interpreter.symbolTable.get("rem_7_3")?.value).toBe(1);
    expect(interpreter.symbolTable.get("rem_10_4")?.value).toBe(2);
    expect(interpreter.symbolTable.get("rem_9_3")?.value).toBe(0);
  });

  it("should differ from mod for negative numbers", () => {
    const text = `
    variable rem_neg7_3: Number = remainder(-7, 3);
    variable mod_neg7_3: Number = mod(-7, 3);
    variable rem_7_neg3: Number = remainder(7, -3);
    variable mod_7_neg3: Number = mod(7, -3);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    // remainder uses JS % operator directly: -7 % 3 = -1
    expect(interpreter.symbolTable.get("rem_neg7_3")?.value).toBe(-1);
    // mod returns positive: ((-7 % 3) + 3) % 3 = 2
    expect(interpreter.symbolTable.get("mod_neg7_3")?.value).toBe(2);

    // remainder: 7 % -3 = 1
    expect(interpreter.symbolTable.get("rem_7_neg3")?.value).toBe(1);
    // mod: ((7 % -3) + -3) % -3 = -2
    expect(interpreter.symbolTable.get("mod_7_neg3")?.value).toBe(-2);
  });

  it("should throw error for remainder with zero divisor", () => {
    const text = `variable invalid: Number = remainder(5, 0);`;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);

    let caughtError: unknown;
    try {
      interpreter.interpret();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(InterpreterError);
    expect((caughtError as InterpreterError).code).toBe(FunctionsErrorCode.DIVISION_BY_ZERO);
    expect((caughtError as InterpreterError).data.functionName).toBe("remainder");
  });
});
