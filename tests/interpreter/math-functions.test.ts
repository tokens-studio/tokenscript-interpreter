import { describe, expect, it } from "vitest";
import { Interpreter } from "@interpreter/interpreter";
import { Lexer } from "@interpreter/lexer";
import { Parser } from "@interpreter/parser";

describe("Math Functions - Parse Int", () => {
  it("should handle parseint with base 16", () => {
    const text = `
    variable i: Number = parseint("ff", 16);
    variable j: Number = parseint("00", 16);
    variable k: Number = parseint("A0", 16);
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

  it("should handle parseint with base 10", () => {
    const text = `
    variable a: Number = parseint("123", 10);
    variable b: Number = parseint("0", 10);
    variable c: Number = parseint("999", 10);
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

  it("should handle parseint with base 2", () => {
    const text = `
    variable binary1: Number = parseint("1010", 2);
    variable binary2: Number = parseint("1111", 2);
    variable binary3: Number = parseint("0", 2);
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

  it("should implement banker's rounding (round half to even)", () => {
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

    // Banker's rounding: .5 rounds to nearest even number
    expect(interpreter.symbolTable.get("round_2_5")?.value).toBe(2); // 2.5 -> 2 (even)
    expect(interpreter.symbolTable.get("round_3_5")?.value).toBe(4); // 3.5 -> 4 (even)
    expect(interpreter.symbolTable.get("round_4_5")?.value).toBe(4); // 4.5 -> 4 (even)
    expect(interpreter.symbolTable.get("round_5_5")?.value).toBe(6); // 5.5 -> 6 (even)
    expect(interpreter.symbolTable.get("round_neg_2_5")?.value).toBe(-2); // -2.5 -> -2 (even)
    expect(interpreter.symbolTable.get("round_neg_3_5")?.value).toBe(-4); // -3.5 -> -4 (even)
  });
});

describe("Math Functions - RoundTo", () => {
  it("should handle roundTo function with default precision", () => {
    const text = `
    variable result1: Number = roundTo(3.14159);
    variable result2: Number = roundTo(2.71828);
    variable result3: Number = roundTo(1.41421);
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

  it("should handle roundTo function with specified precision", () => {
    const text = `
    variable result1: Number = roundTo(3.14159, 2);
    variable result2: Number = roundTo(2.71828, 3);
    variable result3: Number = roundTo(1.41421, 1);
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

  it("should handle roundTo function with zero precision", () => {
    const text = `
    variable result1: Number = roundTo(3.7, 0);
    variable result2: Number = roundTo(2.3, 0);
    variable result3: Number = roundTo(1.5, 0);
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

  it("should handle roundTo function with font size calculations", () => {
    const text = `
    variable base: Number = 16;
    variable ratio: Number = 1.25;
    variable h1: Number = roundTo(base * (ratio^5));
    variable h2: Number = roundTo(base * (ratio^4));
    variable h3: Number = roundTo(base * (ratio^3));
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

  it("should handle roundTo function with negative numbers", () => {
    const text = `
    variable result1: Number = roundTo(-3.7);
    variable result2: Number = roundTo(-2.3);
    variable result3: Number = roundTo(-1.5);
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
    expect(result3?.value).toBe(-2); // -1.5 rounds to -2 (banker's rounding to nearest even)
  });

  it("should handle roundTo function with precision and negative numbers", () => {
    const text = `
    variable result1: Number = roundTo(-3.14159, 2);
    variable result2: Number = roundTo(-2.71828, 3);
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

  it("should handle complex expressions with roundTo", () => {
    const text = `
    variable base: Number = 14;
    variable growthRatio: Number = 1.2;
    variable shrinkRatio: Number = 0.9;
    variable bodyL: Number = roundTo(base * (growthRatio^1));
    variable bodyS: Number = roundTo(base * (shrinkRatio^-1));
    variable headlineXL: Number = roundTo(base * (growthRatio^2));
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

    expect(() => interpreter.interpret()).toThrow("asin() argument must be between -1 and 1");
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

    expect(() => {
      const lexer = new Lexer(text1);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
      interpreter.interpret();
    }).toThrow("log() argument must be positive");

    expect(() => {
      const lexer = new Lexer(text2);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
      interpreter.interpret();
    }).toThrow("log() argument must be positive");

    expect(() => {
      const lexer = new Lexer(text3);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
      interpreter.interpret();
    }).toThrow("log() base must be positive and not equal to 1");
  });
});

describe("Math Functions - String Functions", () => {
  it("should handle rgba function", () => {
    const text = `
    variable red: Number = 255;
    variable green: Number = 128;
    variable blue: Number = 0;
    variable alpha: Number = 0.5;
    variable color: String = rgba(red, green, blue, alpha);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    const color = interpreter.symbolTable.get("color");
    expect(color?.value).toBe("rgba(255, 128, 0, 0.5)");
  });
});

describe("Math Functions - Enhanced RoundTo with Banker's Rounding", () => {
  it("should use banker's rounding for precision cases", () => {
    const text = `
    variable round_2_25: Number = roundTo(2.25, 1);
    variable round_2_35: Number = roundTo(2.35, 1);
    variable round_2_45: Number = roundTo(2.45, 1);
    variable round_2_55: Number = roundTo(2.55, 1);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    // Banker's rounding: .5 rounds to nearest even number
    expect(interpreter.symbolTable.get("round_2_25")?.value).toBe(2.2); // 2.25 -> 2.2 (even)
    expect(interpreter.symbolTable.get("round_2_35")?.value).toBe(2.4); // 2.35 -> 2.4 (even)
    expect(interpreter.symbolTable.get("round_2_45")?.value).toBe(2.4); // 2.45 -> 2.4 (even)
    expect(interpreter.symbolTable.get("round_2_55")?.value).toBe(2.6); // 2.55 -> 2.6 (even)
  });

  it("should use banker's rounding for integer precision", () => {
    const text = `
    variable round_12_5: Number = roundTo(12.5, 0);
    variable round_13_5: Number = roundTo(13.5, 0);
    variable round_14_5: Number = roundTo(14.5, 0);
    variable round_15_5: Number = roundTo(15.5, 0);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser);
    interpreter.interpret();

    // Banker's rounding: .5 rounds to nearest even number
    expect(interpreter.symbolTable.get("round_12_5")?.value).toBe(12); // 12.5 -> 12 (even)
    expect(interpreter.symbolTable.get("round_13_5")?.value).toBe(14); // 13.5 -> 14 (even)
    expect(interpreter.symbolTable.get("round_14_5")?.value).toBe(14); // 14.5 -> 14 (even)
    expect(interpreter.symbolTable.get("round_15_5")?.value).toBe(16); // 15.5 -> 16 (even)
  });
});
