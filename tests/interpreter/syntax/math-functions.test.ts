import { FunctionsErrorCode, InterpreterError } from "@interpreter/errors";
import { describe, expect, it } from "vitest";
import { createInterpreter, interpretAndGetVariables } from "../test-helpers";

describe("Math Functions - Parse Int", () => {
  it("should handle parse_int with base 16", () => {
    const text = `
    variable i: Number = parse_int("ff", 16);
    variable j: Number = parse_int("00", 16);
    variable k: Number = parse_int("A0", 16);
    `;
    const vars = interpretAndGetVariables(text, ["i", "j", "k"]);

    expect(vars.i?.value).toBe(255);
    expect(vars.j?.value).toBe(0);
    expect(vars.k?.value).toBe(160);
  });

  it("should handle parse_int with base 10", () => {
    const text = `
    variable a: Number = parse_int("123", 10);
    variable b: Number = parse_int("0", 10);
    variable c: Number = parse_int("999", 10);
    `;
    const vars = interpretAndGetVariables(text, ["a", "b", "c"]);

    expect(vars.a?.value).toBe(123);
    expect(vars.b?.value).toBe(0);
    expect(vars.c?.value).toBe(999);
  });

  it("should handle parse_int with base 2", () => {
    const text = `
    variable binary1: Number = parse_int("1010", 2);
    variable binary2: Number = parse_int("1111", 2);
    variable binary3: Number = parse_int("0", 2);
    `;
    const vars = interpretAndGetVariables(text, ["binary1", "binary2", "binary3"]);

    expect(vars.binary1?.value).toBe(10);
    expect(vars.binary2?.value).toBe(15);
    expect(vars.binary3?.value).toBe(0);
  });
});

describe("Math Functions - Power Operations", () => {
  it("should handle pow function", () => {
    const text = `
    variable result1: Number = pow(2, 3);
    variable result2: Number = pow(5, 2);
    variable result3: Number = pow(10, 0);
    `;
    const vars = interpretAndGetVariables(text, ["result1", "result2", "result3"]);

    expect(vars.result1?.value).toBe(8);
    expect(vars.result2?.value).toBe(25);
    expect(vars.result3?.value).toBe(1);
  });

  it("should handle pow with decimal numbers", () => {
    const text = `
    variable result1: Number = pow(2.5, 2);
    variable result2: Number = pow(4, 0.5);
    `;
    const vars = interpretAndGetVariables(text, ["result1", "result2"]);

    expect(vars.result1?.value).toBe(6.25);
    expect(vars.result2?.value).toBe(2);
  });
});

describe("Math Functions - Trigonometric", () => {
  it("should handle basic trigonometric functions", () => {
    const text = `
    variable sin_result: Number = sin(0);
    variable cos_result: Number = cos(0);
    variable tan_result: Number = tan(0);
    `;
    const vars = interpretAndGetVariables(text, ["sin_result", "cos_result", "tan_result"]);

    expect(vars.sin_result?.value).toBe(0);
    expect(vars.cos_result?.value).toBe(1);
    expect(vars.tan_result?.value).toBe(0);
  });
});

describe("Math Functions - Rounding", () => {
  it("should handle rounding functions", () => {
    const text = `
    variable round_result: Number = round(3.7);
    variable floor_result: Number = floor(3.7);
    variable ceil_result: Number = ceil(3.2);
    `;
    const vars = interpretAndGetVariables(text, ["round_result", "floor_result", "ceil_result"]);

    expect(vars.round_result?.value).toBe(4);
    expect(vars.floor_result?.value).toBe(3);
    expect(vars.ceil_result?.value).toBe(4);
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
    const vars = interpretAndGetVariables(text, ["round_2_5", "round_3_5", "round_4_5", "round_5_5", "round_neg_2_5", "round_neg_3_5"]);

    // Standard rounding: .5 rounds away from zero
    expect(vars.round_2_5?.value).toBe(3); // 2.5 -> 3
    expect(vars.round_3_5?.value).toBe(4); // 3.5 -> 4
    expect(vars.round_4_5?.value).toBe(5); // 4.5 -> 5
    expect(vars.round_5_5?.value).toBe(6); // 5.5 -> 6
    expect(vars.round_neg_2_5?.value).toBe(-2); // -2.5 -> -2 (JS rounds toward +infinity)
    expect(vars.round_neg_3_5?.value).toBe(-3); // -3.5 -> -3 (JS rounds toward +infinity)
  });
});

describe("Math Functions - round_to", () => {
  it("should handle round_to function with default precision", () => {
    const text = `
    variable result1: Number = round_to(3.14159);
    variable result2: Number = round_to(2.71828);
    variable result3: Number = round_to(1.41421);
    `;
    const vars = interpretAndGetVariables(text, ["result1", "result2", "result3"]);

    expect(vars.result1?.value).toBe(3); // Default rounds to nearest integer
    expect(vars.result2?.value).toBe(3);
    expect(vars.result3?.value).toBe(1);
  });

  it("should handle round_to function with specified precision", () => {
    const text = `
    variable result1: Number = round_to(3.14159, 2);
    variable result2: Number = round_to(2.71828, 3);
    variable result3: Number = round_to(1.41421, 1);
    `;
    const vars = interpretAndGetVariables(text, ["result1", "result2", "result3"]);

    expect(vars.result1?.value).toBe(3.14);
    expect(vars.result2?.value).toBe(2.718); // 2.71828 rounded to 3 decimal places
    expect(vars.result3?.value).toBe(1.4);
  });

  it("should handle round_to function with zero precision", () => {
    const text = `
    variable result1: Number = round_to(3.7, 0);
    variable result2: Number = round_to(2.3, 0);
    variable result3: Number = round_to(1.5, 0);
    `;
    const vars = interpretAndGetVariables(text, ["result1", "result2", "result3"]);

    expect(vars.result1?.value).toBe(4);
    expect(vars.result2?.value).toBe(2);
    expect(vars.result3?.value).toBe(2); // 1.5 rounds to 2 (JavaScript's round half up)
  });

  it("should handle round_to function with font size calculations", () => {
    const text = `
    variable base: Number = 16;
    variable ratio: Number = 1.25;
    variable h1: Number = round_to(base * (ratio^5));
    variable h2: Number = round_to(base * (ratio^4));
    variable h3: Number = round_to(base * (ratio^3));
    `;
    const vars = interpretAndGetVariables(text, ["h1", "h2", "h3"]);

    // 16 * 1.25^5 = 16 * 3.0517578125 = 48.828125 -> 49
    expect(vars.h1?.value).toBe(49);
    // 16 * 1.25^4 = 16 * 2.44140625 = 39.0625 -> 39
    expect(vars.h2?.value).toBe(39);
    // 16 * 1.25^3 = 16 * 1.953125 = 31.25 -> 31
    expect(vars.h3?.value).toBe(31);
  });

  it("should handle round_to function with negative numbers", () => {
    const text = `
    variable result1: Number = round_to(-3.7);
    variable result2: Number = round_to(-2.3);
    variable result3: Number = round_to(-1.5);
    `;
    const vars = interpretAndGetVariables(text, ["result1", "result2", "result3"]);

    expect(vars.result1?.value).toBe(-4);
    expect(vars.result2?.value).toBe(-2);
    expect(vars.result3?.value).toBe(-1); // -1.5 rounds to -1 (JS Math.round rounds toward +infinity)
  });

  it("should handle round_to function with precision and negative numbers", () => {
    const text = `
    variable result1: Number = round_to(-3.14159, 2);
    variable result2: Number = round_to(-2.71828, 3);
    `;
    const vars = interpretAndGetVariables(text, ["result1", "result2"]);

    expect(vars.result1?.value).toBe(-3.14);
    expect(vars.result2?.value).toBe(-2.718); // -2.71828 rounded to 3 decimal places
  });
});

describe("Math Functions - Complex Expressions", () => {
  it("should handle complex math expressions with functions", () => {
    const text = `
    variable complex: Number = sqrt(pow(3, 2) + pow(4, 2));
    variable nested: Number = round(sin(pi() / 2) * 100);
    `;
    const vars = interpretAndGetVariables(text, ["complex", "nested"]);

    expect(vars.complex?.value).toBe(5); // sqrt(9 + 16) = sqrt(25) = 5
    expect(vars.nested?.value).toBe(100); // sin(π/2) = 1, * 100 = 100
  });

  it("should handle math functions in color conversion", () => {
    const text = `
    variable gamma: Number = 2.4;
    variable normalized: Number = 0.5;
    variable linear: Number = pow((normalized + 0.055) / 1.055, gamma);
    variable rounded: Number = round(linear * 1000) / 1000;
    `;
    const vars = interpretAndGetVariables(text, ["linear", "rounded"]);

    expect(vars.linear?.value).toBeCloseTo(0.214, 3);
    expect(vars.rounded?.value).toBeCloseTo(0.214, 3);
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
    const vars = interpretAndGetVariables(text, ["bodyL", "bodyS", "headlineXL"]);

    // 14 * 1.2 = 16.8 -> 17
    expect(vars.bodyL?.value).toBe(17);
    // 14 * (0.9^-1) = 14 * 1.111... = 15.555... -> 16
    expect(vars.bodyS?.value).toBe(16);
    // 14 * 1.2^2 = 14 * 1.44 = 20.16 -> 20
    expect(vars.headlineXL?.value).toBe(20);
  });
});

describe("Math Functions - Inverse Trigonometric", () => {
  it("should handle asin function", () => {
    const text = `
    variable asin_0: Number = asin(0);
    variable asin_half: Number = asin(0.5);
    variable asin_one: Number = asin(1);
    `;
    const vars = interpretAndGetVariables(text, ["asin_0", "asin_half", "asin_one"]);

    expect(vars.asin_0?.value).toBeCloseTo(0, 5);
    expect(vars.asin_half?.value).toBeCloseTo(Math.PI / 6, 5);
    expect(vars.asin_one?.value).toBeCloseTo(Math.PI / 2, 5);
  });

  it("should handle acos function", () => {
    const text = `
    variable acos_0: Number = acos(0);
    variable acos_half: Number = acos(0.5);
    variable acos_one: Number = acos(1);
    `;
    const vars = interpretAndGetVariables(text, ["acos_0", "acos_half", "acos_one"]);

    expect(vars.acos_0?.value).toBeCloseTo(Math.PI / 2, 5);
    expect(vars.acos_half?.value).toBeCloseTo(Math.PI / 3, 5);
    expect(vars.acos_one?.value).toBeCloseTo(0, 5);
  });

  it("should handle atan function", () => {
    const text = `
    variable atan_0: Number = atan(0);
    variable atan_1: Number = atan(1);
    variable atan_neg1: Number = atan(-1);
    `;
    const vars = interpretAndGetVariables(text, ["atan_0", "atan_1", "atan_neg1"]);

    expect(vars.atan_0?.value).toBeCloseTo(0, 5);
    expect(vars.atan_1?.value).toBeCloseTo(Math.PI / 4, 5);
    expect(vars.atan_neg1?.value).toBeCloseTo(-Math.PI / 4, 5);
  });

  it("should throw error for asin/acos with invalid range", () => {
    const text = `variable invalid: Number = asin(2);`;
    const interpreter = createInterpreter(text);

    let caughtError: unknown;
    try {
      interpreter.interpret();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(InterpreterError);
    expect((caughtError as InterpreterError).code).toBe(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE);
    expect((caughtError as InterpreterError).data.functionName).toBe("asin");
  });
});

describe("Math Functions - Logarithmic", () => {
  it("should handle natural logarithm", () => {
    const text = `
    variable log_e: Number = log(2.718281828);
    variable log_1: Number = log(1);
    variable log_10: Number = log(10);
    `;
    const vars = interpretAndGetVariables(text, ["log_e", "log_1", "log_10"]);

    expect(vars.log_e?.value).toBeCloseTo(1, 5);
    expect(vars.log_1?.value).toBeCloseTo(0, 5);
    expect(vars.log_10?.value).toBeCloseTo(Math.log(10), 5);
  });

  it("should handle logarithm with custom base", () => {
    const text = `
    variable log_base_10: Number = log(100, 10);
    variable log_base_2: Number = log(8, 2);
    variable log_base_e: Number = log(2.718281828, 2.718281828);
    `;
    const vars = interpretAndGetVariables(text, ["log_base_10", "log_base_2", "log_base_e"]);

    expect(vars.log_base_10?.value).toBeCloseTo(2, 5);
    expect(vars.log_base_2?.value).toBeCloseTo(3, 5);
    expect(vars.log_base_e?.value).toBeCloseTo(1, 5);
  });

  it("should throw error for invalid logarithm arguments", () => {
    // Test log(0) - argument out of range
    let caughtError1: unknown;
    try {
      createInterpreter(`variable invalid: Number = log(0);`).interpret();
    } catch (error) {
      caughtError1 = error;
    }

    expect(caughtError1).toBeInstanceOf(InterpreterError);
    expect((caughtError1 as InterpreterError).code).toBe(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE);
    expect((caughtError1 as InterpreterError).data.functionName).toBe("log");

    // Test log(-1) - argument out of range
    let caughtError2: unknown;
    try {
      createInterpreter(`variable invalid: Number = log(-1);`).interpret();
    } catch (error) {
      caughtError2 = error;
    }

    expect(caughtError2).toBeInstanceOf(InterpreterError);
    expect((caughtError2 as InterpreterError).code).toBe(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE);
    expect((caughtError2 as InterpreterError).data.functionName).toBe("log");

    // Test log(10, 1) - invalid base
    let caughtError3: unknown;
    try {
      createInterpreter(`variable invalid: Number = log(10, 1);`).interpret();
    } catch (error) {
      caughtError3 = error;
    }

    expect(caughtError3).toBeInstanceOf(InterpreterError);
    expect((caughtError3 as InterpreterError).code).toBe(FunctionsErrorCode.INVALID_BASE);
    expect((caughtError3 as InterpreterError).data.functionName).toBe("log");
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
    const vars = interpretAndGetVariables(text, ["round_2_25", "round_2_35", "round_2_45", "round_2_55"]);

    // Standard rounding: .5 rounds up (away from zero for positive numbers)
    expect(vars.round_2_25?.value).toBe(2.3); // 2.25 -> 2.3
    expect(vars.round_2_35?.value).toBe(2.4); // 2.35 -> 2.4
    expect(vars.round_2_45?.value).toBe(2.5); // 2.45 -> 2.5
    expect(vars.round_2_55?.value).toBe(2.6); // 2.55 -> 2.6
  });

  it("should use standard rounding for integer precision", () => {
    const text = `
    variable round_12_5: Number = round_to(12.5, 0);
    variable round_13_5: Number = round_to(13.5, 0);
    variable round_14_5: Number = round_to(14.5, 0);
    variable round_15_5: Number = round_to(15.5, 0);
    `;
    const vars = interpretAndGetVariables(text, ["round_12_5", "round_13_5", "round_14_5", "round_15_5"]);

    // Standard rounding: .5 rounds up
    expect(vars.round_12_5?.value).toBe(13); // 12.5 -> 13
    expect(vars.round_13_5?.value).toBe(14); // 13.5 -> 14
    expect(vars.round_14_5?.value).toBe(15); // 14.5 -> 15
    expect(vars.round_15_5?.value).toBe(16); // 15.5 -> 16
  });
});

describe("Math Functions - NumberWithUnit Support", () => {
  it("should handle round with NumberWithUnit", () => {
    const text = `
    variable rounded_px: NumberWithUnit = round(1.5px);
    variable rounded_rem: NumberWithUnit = round(2.7rem);
    variable rounded_em: NumberWithUnit = round(3.2em);
    `;
    const vars = interpretAndGetVariables(text, ["rounded_px", "rounded_rem", "rounded_em"]);

    expect(vars.rounded_px?.value).toBe(2);
    expect(vars.rounded_px?.toString()).toBe("2px");
    expect(vars.rounded_rem?.value).toBe(3);
    expect(vars.rounded_rem?.toString()).toBe("3rem");
    expect(vars.rounded_em?.value).toBe(3);
    expect(vars.rounded_em?.toString()).toBe("3em");
  });

  it("should handle floor with NumberWithUnit", () => {
    const text = `
    variable floored_px: NumberWithUnit = floor(1.9px);
    variable floored_rem: NumberWithUnit = floor(2.1rem);
    `;
    const vars = interpretAndGetVariables(text, ["floored_px", "floored_rem"]);

    expect(vars.floored_px?.value).toBe(1);
    expect(vars.floored_px?.toString()).toBe("1px");
    expect(vars.floored_rem?.value).toBe(2);
    expect(vars.floored_rem?.toString()).toBe("2rem");
  });

  it("should handle ceil with NumberWithUnit", () => {
    const text = `
    variable ceiled_px: NumberWithUnit = ceil(1.1px);
    variable ceiled_rem: NumberWithUnit = ceil(2.9rem);
    `;
    const vars = interpretAndGetVariables(text, ["ceiled_px", "ceiled_rem"]);

    expect(vars.ceiled_px?.value).toBe(2);
    expect(vars.ceiled_px?.toString()).toBe("2px");
    expect(vars.ceiled_rem?.value).toBe(3);
    expect(vars.ceiled_rem?.toString()).toBe("3rem");
  });

  it("should handle abs with NumberWithUnit", () => {
    const text = `
    variable abs_px: NumberWithUnit = abs(-5px);
    variable abs_rem: NumberWithUnit = abs(-2.5rem);
    `;
    const vars = interpretAndGetVariables(text, ["abs_px", "abs_rem"]);

    expect(vars.abs_px?.value).toBe(5);
    expect(vars.abs_px?.toString()).toBe("5px");
    expect(vars.abs_rem?.value).toBe(2.5);
    expect(vars.abs_rem?.toString()).toBe("2.5rem");
  });

  it("should handle round_to with NumberWithUnit", () => {
    const text = `
    variable rounded_px: NumberWithUnit = round_to(1.567px, 2);
    variable rounded_rem: NumberWithUnit = round_to(2.5rem, 0);
    `;
    const vars = interpretAndGetVariables(text, ["rounded_px", "rounded_rem"]);

    expect(vars.rounded_px?.value).toBe(1.57);
    expect(vars.rounded_px?.toString()).toBe("1.57px");
    expect(vars.rounded_rem?.value).toBe(3);
    expect(vars.rounded_rem?.toString()).toBe("3rem");
  });
});

describe("Math Functions - Inverse Hyperbolic", () => {
  it("should handle asinh function", () => {
    const text = `
    variable asinh_0: Number = asinh(0);
    variable asinh_1: Number = asinh(1);
    variable asinh_neg1: Number = asinh(-1);
    `;
    const vars = interpretAndGetVariables(text, ["asinh_0", "asinh_1", "asinh_neg1"]);

    expect(vars.asinh_0?.value).toBeCloseTo(0, 5);
    expect(vars.asinh_1?.value).toBeCloseTo(0.881373587, 5);
    expect(vars.asinh_neg1?.value).toBeCloseTo(-0.881373587, 5);
  });

  it("should handle acosh function", () => {
    const text = `
    variable acosh_1: Number = acosh(1);
    variable acosh_2: Number = acosh(2);
    variable acosh_10: Number = acosh(10);
    `;
    const vars = interpretAndGetVariables(text, ["acosh_1", "acosh_2", "acosh_10"]);

    expect(vars.acosh_1?.value).toBeCloseTo(0, 5);
    expect(vars.acosh_2?.value).toBeCloseTo(1.316957897, 5);
    expect(vars.acosh_10?.value).toBeCloseTo(2.993222846, 5);
  });

  it("should throw error for acosh with invalid range", () => {
    const interpreter = createInterpreter(`variable invalid: Number = acosh(0.5);`);

    expect(() => interpreter.interpret()).toThrow(InterpreterError);

    try {
      createInterpreter(`variable invalid: Number = acosh(0.5);`).interpret();
    } catch (error) {
      expect(error).toBeInstanceOf(InterpreterError);
      expect((error as InterpreterError).code).toBe(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE);
      expect((error as InterpreterError).data.functionName).toBe("acosh");
    }
  });

  it("should handle atanh function", () => {
    const text = `
    variable atanh_0: Number = atanh(0);
    variable atanh_half: Number = atanh(0.5);
    variable atanh_neg_half: Number = atanh(-0.5);
    `;
    const vars = interpretAndGetVariables(text, ["atanh_0", "atanh_half", "atanh_neg_half"]);

    expect(vars.atanh_0?.value).toBeCloseTo(0, 5);
    expect(vars.atanh_half?.value).toBeCloseTo(0.549306144, 5);
    expect(vars.atanh_neg_half?.value).toBeCloseTo(-0.549306144, 5);
  });

  it("should throw error for atanh with invalid range", () => {
    // Test atanh(1) - out of range (must be between -1 and 1 exclusive)
    expect(() => createInterpreter(`variable invalid: Number = atanh(1);`).interpret()).toThrow(InterpreterError);

    try {
      createInterpreter(`variable invalid: Number = atanh(1);`).interpret();
    } catch (error) {
      expect(error).toBeInstanceOf(InterpreterError);
      expect((error as InterpreterError).code).toBe(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE);
      expect((error as InterpreterError).data.functionName).toBe("atanh");
    }

    let caughtError2: unknown;
    try {
      createInterpreter(`variable invalid: Number = atanh(-1);`).interpret();
    } catch (error) {
      caughtError2 = error;
    }

    expect(caughtError2).toBeInstanceOf(InterpreterError);
    expect((caughtError2 as InterpreterError).code).toBe(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE);
    expect((caughtError2 as InterpreterError).data.functionName).toBe("atanh");
  });
});

describe("Math Functions - Exponential", () => {
  it("should handle exp function", () => {
    const text = `
    variable exp_0: Number = exp(0);
    variable exp_1: Number = exp(1);
    variable exp_neg1: Number = exp(-1);
    `;
    const vars = interpretAndGetVariables(text, ["exp_0", "exp_1", "exp_neg1"]);

    expect(vars.exp_0?.value).toBeCloseTo(1, 5);
    expect(vars.exp_1?.value).toBeCloseTo(Math.E, 5);
    expect(vars.exp_neg1?.value).toBeCloseTo(1 / Math.E, 5);
  });

  it("should handle expm1 function", () => {
    const text = `
    variable expm1_0: Number = expm1(0);
    variable expm1_1: Number = expm1(1);
    variable expm1_small: Number = expm1(0.0001);
    `;
    const vars = interpretAndGetVariables(text, ["expm1_0", "expm1_1", "expm1_small"]);

    expect(vars.expm1_0?.value).toBeCloseTo(0, 5);
    expect(vars.expm1_1?.value).toBeCloseTo(Math.E - 1, 5);
    // expm1 is more accurate than exp(x)-1 for small x
    expect(vars.expm1_small?.value).toBeCloseTo(0.00010000500017, 8);
  });
});

describe("Math Functions - Logarithmic Extended", () => {
  it("should handle ln function (natural logarithm)", () => {
    const text = `
    variable ln_1: Number = ln(1);
    variable ln_e: Number = ln(2.718281828);
    variable ln_10: Number = ln(10);
    `;
    const vars = interpretAndGetVariables(text, ["ln_1", "ln_e", "ln_10"]);

    expect(vars.ln_1?.value).toBeCloseTo(0, 5);
    expect(vars.ln_e?.value).toBeCloseTo(1, 5);
    expect(vars.ln_10?.value).toBeCloseTo(Math.log(10), 5);
  });

  it("should throw error for ln with invalid argument", () => {
    // Test ln(0) - argument must be positive
    expect(() => createInterpreter(`variable invalid: Number = ln(0);`).interpret()).toThrow(InterpreterError);

    try {
      createInterpreter(`variable invalid: Number = ln(0);`).interpret();
    } catch (error) {
      expect(error).toBeInstanceOf(InterpreterError);
      expect((error as InterpreterError).code).toBe(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE);
      expect((error as InterpreterError).data.functionName).toBe("ln");
    }

    let caughtError2: unknown;
    try {
      createInterpreter(`variable invalid: Number = ln(-1);`).interpret();
    } catch (error) {
      caughtError2 = error;
    }

    expect(caughtError2).toBeInstanceOf(InterpreterError);
    expect((caughtError2 as InterpreterError).code).toBe(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE);
    expect((caughtError2 as InterpreterError).data.functionName).toBe("ln");
  });

  it("should handle log10 function", () => {
    const text = `
    variable log10_1: Number = log10(1);
    variable log10_10: Number = log10(10);
    variable log10_100: Number = log10(100);
    variable log10_1000: Number = log10(1000);
    `;
    const vars = interpretAndGetVariables(text, ["log10_1", "log10_10", "log10_100", "log10_1000"]);

    expect(vars.log10_1?.value).toBeCloseTo(0, 5);
    expect(vars.log10_10?.value).toBeCloseTo(1, 5);
    expect(vars.log10_100?.value).toBeCloseTo(2, 5);
    expect(vars.log10_1000?.value).toBeCloseTo(3, 5);
  });

  it("should throw error for log10 with invalid argument", () => {
    const interpreter = createInterpreter(`variable invalid: Number = log10(0);`);

    expect(() => interpreter.interpret()).toThrow(InterpreterError);

    try {
      createInterpreter(`variable invalid: Number = log10(0);`).interpret();
    } catch (error) {
      expect(error).toBeInstanceOf(InterpreterError);
      expect((error as InterpreterError).code).toBe(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE);
      expect((error as InterpreterError).data.functionName).toBe("log10");
    }
  });

  it("should handle log2 function", () => {
    const text = `
    variable log2_1: Number = log2(1);
    variable log2_2: Number = log2(2);
    variable log2_8: Number = log2(8);
    variable log2_1024: Number = log2(1024);
    `;
    const vars = interpretAndGetVariables(text, ["log2_1", "log2_2", "log2_8", "log2_1024"]);

    expect(vars.log2_1?.value).toBeCloseTo(0, 5);
    expect(vars.log2_2?.value).toBeCloseTo(1, 5);
    expect(vars.log2_8?.value).toBeCloseTo(3, 5);
    expect(vars.log2_1024?.value).toBeCloseTo(10, 5);
  });

  it("should throw error for log2 with invalid argument", () => {
    const interpreter = createInterpreter(`variable invalid: Number = log2(-5);`);

    expect(() => interpreter.interpret()).toThrow(InterpreterError);

    try {
      createInterpreter(`variable invalid: Number = log2(-5);`).interpret();
    } catch (error) {
      expect(error).toBeInstanceOf(InterpreterError);
      expect((error as InterpreterError).code).toBe(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE);
      expect((error as InterpreterError).data.functionName).toBe("log2");
    }
  });

  it("should handle log1p function", () => {
    const text = `
    variable log1p_0: Number = log1p(0);
    variable log1p_e_minus_1: Number = log1p(1.718281828);
    variable log1p_small: Number = log1p(0.0001);
    `;
    const vars = interpretAndGetVariables(text, ["log1p_0", "log1p_e_minus_1", "log1p_small"]);

    expect(vars.log1p_0?.value).toBeCloseTo(0, 5);
    expect(vars.log1p_e_minus_1?.value).toBeCloseTo(1, 5);
    // log1p is more accurate than log(1+x) for small x
    expect(vars.log1p_small?.value).toBeCloseTo(0.00009999500033, 8);
  });

  it("should handle log1p at boundary value -1 (returns -Infinity)", () => {
    const vars = interpretAndGetVariables(`variable log1p_neg1: Number = log1p(-1);`, ["log1p_neg1"]);

    // log1p(-1) = ln(0) = -Infinity is mathematically valid
    expect(vars.log1p_neg1?.value).toBe(Number.NEGATIVE_INFINITY);
  });

  it("should throw error for log1p with invalid argument (less than -1)", () => {
    const interpreter = createInterpreter(`variable invalid: Number = log1p(-2);`);

    expect(() => interpreter.interpret()).toThrow(InterpreterError);

    try {
      createInterpreter(`variable invalid: Number = log1p(-2);`).interpret();
    } catch (error) {
      expect(error).toBeInstanceOf(InterpreterError);
      expect((error as InterpreterError).code).toBe(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE);
      expect((error as InterpreterError).data.functionName).toBe("log1p");
    }
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
    const vars = interpretAndGetVariables(text, ["cbrt_8", "cbrt_27", "cbrt_neg8", "cbrt_0"]);

    expect(vars.cbrt_8?.value).toBeCloseTo(2, 5);
    expect(vars.cbrt_27?.value).toBeCloseTo(3, 5);
    expect(vars.cbrt_neg8?.value).toBeCloseTo(-2, 5);
    expect(vars.cbrt_0?.value).toBeCloseTo(0, 5);
  });

  it("should handle cbrt with NumberWithUnit", () => {
    const text = `
    variable cbrt_px: NumberWithUnit = cbrt(8px);
    variable cbrt_rem: NumberWithUnit = cbrt(27rem);
    `;
    const vars = interpretAndGetVariables(text, ["cbrt_px", "cbrt_rem"]);

    expect(vars.cbrt_px?.value).toBeCloseTo(2, 5);
    expect(vars.cbrt_px?.toString()).toBe("2px");
    expect(vars.cbrt_rem?.value).toBeCloseTo(3, 5);
    expect(vars.cbrt_rem?.toString()).toBe("3rem");
  });
});

describe("Math Functions - Sign", () => {
  it("should handle sign function", () => {
    const text = `
    variable sign_pos: Number = sign(42);
    variable sign_neg: Number = sign(-42);
    variable sign_zero: Number = sign(0);
    `;
    const vars = interpretAndGetVariables(text, ["sign_pos", "sign_neg", "sign_zero"]);

    expect(vars.sign_pos?.value).toBe(1);
    expect(vars.sign_neg?.value).toBe(-1);
    expect(vars.sign_zero?.value).toBe(0);
  });

  it("should return Number even with NumberWithUnit input", () => {
    const text = `
    variable sign_px: Number = sign(-5px);
    variable sign_rem: Number = sign(3rem);
    variable sign_em: Number = sign(0em);
    `;
    const vars = interpretAndGetVariables(text, ["sign_px", "sign_rem", "sign_em"]);

    expect(vars.sign_px?.value).toBe(-1);
    expect(vars.sign_px?.toString()).toBe("-1");
    expect(vars.sign_rem?.value).toBe(1);
    expect(vars.sign_rem?.toString()).toBe("1");
    expect(vars.sign_em?.value).toBe(0);
    expect(vars.sign_em?.toString()).toBe("0");
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
    const vars = interpretAndGetVariables(text, ["trunc_pos", "trunc_neg", "trunc_small", "trunc_neg_small"]);

    expect(vars.trunc_pos?.value).toBe(3);
    expect(vars.trunc_neg?.value).toBe(-3);
    expect(vars.trunc_small?.value).toBe(0);
    // Math.trunc(-0.9) returns -0 in JavaScript
    expect(Object.is(vars.trunc_neg_small?.value, -0)).toBe(true);
  });

  it("should handle trunc with NumberWithUnit", () => {
    const text = `
    variable trunc_px: NumberWithUnit = trunc(3.7px);
    variable trunc_rem: NumberWithUnit = trunc(-2.3rem);
    `;
    const vars = interpretAndGetVariables(text, ["trunc_px", "trunc_rem"]);

    expect(vars.trunc_px?.value).toBe(3);
    expect(vars.trunc_px?.toString()).toBe("3px");
    expect(vars.trunc_rem?.value).toBe(-2);
    expect(vars.trunc_rem?.toString()).toBe("-2rem");
  });
});

describe("Math Functions - Hypot", () => {
  it("should handle hypot with two arguments", () => {
    const text = `
    variable hypot_3_4: Number = hypot(3, 4);
    variable hypot_5_12: Number = hypot(5, 12);
    variable hypot_1_1: Number = hypot(1, 1);
    `;
    const vars = interpretAndGetVariables(text, ["hypot_3_4", "hypot_5_12", "hypot_1_1"]);

    expect(vars.hypot_3_4?.value).toBeCloseTo(5, 5);
    expect(vars.hypot_5_12?.value).toBeCloseTo(13, 5);
    expect(vars.hypot_1_1?.value).toBeCloseTo(Math.sqrt(2), 5);
  });

  it("should handle hypot with multiple arguments", () => {
    const text = `
    variable hypot_1_2_2: Number = hypot(1, 2, 2);
    variable hypot_3_args: Number = hypot(3, 4, 12);
    `;
    const vars = interpretAndGetVariables(text, ["hypot_1_2_2", "hypot_3_args"]);

    expect(vars.hypot_1_2_2?.value).toBeCloseTo(3, 5);
    expect(vars.hypot_3_args?.value).toBeCloseTo(13, 5);
  });

  it("should handle hypot with single argument", () => {
    const text = `
    variable hypot_5: Number = hypot(5);
    variable hypot_neg: Number = hypot(-3);
    `;
    const vars = interpretAndGetVariables(text, ["hypot_5", "hypot_neg"]);

    expect(vars.hypot_5?.value).toBeCloseTo(5, 5);
    expect(vars.hypot_neg?.value).toBeCloseTo(3, 5);
  });
});

describe("Math Functions - Remainder", () => {
  it("should handle remainder function", () => {
    const text = `
    variable rem_7_3: Number = remainder(7, 3);
    variable rem_10_4: Number = remainder(10, 4);
    variable rem_9_3: Number = remainder(9, 3);
    `;
    const vars = interpretAndGetVariables(text, ["rem_7_3", "rem_10_4", "rem_9_3"]);

    expect(vars.rem_7_3?.value).toBe(1);
    expect(vars.rem_10_4?.value).toBe(2);
    expect(vars.rem_9_3?.value).toBe(0);
  });

  it("should differ from mod for negative numbers", () => {
    const text = `
    variable rem_neg7_3: Number = remainder(-7, 3);
    variable mod_neg7_3: Number = mod(-7, 3);
    variable rem_7_neg3: Number = remainder(7, -3);
    variable mod_7_neg3: Number = mod(7, -3);
    `;
    const vars = interpretAndGetVariables(text, ["rem_neg7_3", "mod_neg7_3", "rem_7_neg3", "mod_7_neg3"]);

    // remainder uses JS % operator directly: -7 % 3 = -1
    expect(vars.rem_neg7_3?.value).toBe(-1);
    // mod returns positive: ((-7 % 3) + 3) % 3 = 2
    expect(vars.mod_neg7_3?.value).toBe(2);

    // remainder: 7 % -3 = 1
    expect(vars.rem_7_neg3?.value).toBe(1);
    // mod: ((7 % -3) + -3) % -3 = -2
    expect(vars.mod_7_neg3?.value).toBe(-2);
  });

  it("should throw error for remainder with zero divisor", () => {
    const interpreter = createInterpreter(`variable invalid: Number = remainder(5, 0);`);

    expect(() => interpreter.interpret()).toThrow(InterpreterError);

    try {
      createInterpreter(`variable invalid: Number = remainder(5, 0);`).interpret();
    } catch (error) {
      expect(error).toBeInstanceOf(InterpreterError);
      expect((error as InterpreterError).code).toBe(FunctionsErrorCode.DIVISION_BY_ZERO);
      expect((error as InterpreterError).data.functionName).toBe("remainder");
    }
  });
});

describe("Math Functions - Error Handling Edge Cases", () => {
  it("should throw error for hypot with zero arguments", () => {
    let caughtError: unknown;
    try {
      createInterpreter(`variable invalid: Number = hypot();`).interpret();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(InterpreterError);
    expect((caughtError as InterpreterError).code).toBe(FunctionsErrorCode.REQUIRES_MIN_ARGUMENTS);
    expect((caughtError as InterpreterError).data.functionName).toBe("hypot");
  });

  it("should throw error for asinh with non-numeric argument", () => {
    let caughtError: unknown;
    try {
      createInterpreter(`variable invalid: Number = asinh("not a number");`).interpret();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(InterpreterError);
    expect((caughtError as InterpreterError).code).toBe(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS);
    expect((caughtError as InterpreterError).data.functionName).toBe("asinh");
  });

  it("should throw error for acosh with non-numeric argument", () => {
    let caughtError: unknown;
    try {
      createInterpreter(`variable invalid: Number = acosh("not a number");`).interpret();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(InterpreterError);
    expect((caughtError as InterpreterError).code).toBe(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS);
    expect((caughtError as InterpreterError).data.functionName).toBe("acosh");
  });

  it("should throw error for atanh with non-numeric argument", () => {
    let caughtError: unknown;
    try {
      createInterpreter(`variable invalid: Number = atanh("not a number");`).interpret();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(InterpreterError);
    expect((caughtError as InterpreterError).code).toBe(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS);
    expect((caughtError as InterpreterError).data.functionName).toBe("atanh");
  });

  it("should throw error for exp with non-numeric argument", () => {
    let caughtError: unknown;
    try {
      createInterpreter(`variable invalid: Number = exp("not a number");`).interpret();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(InterpreterError);
    expect((caughtError as InterpreterError).code).toBe(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS);
    expect((caughtError as InterpreterError).data.functionName).toBe("exp");
  });

  it("should throw error for expm1 with non-numeric argument", () => {
    let caughtError: unknown;
    try {
      createInterpreter(`variable invalid: Number = expm1("not a number");`).interpret();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(InterpreterError);
    expect((caughtError as InterpreterError).code).toBe(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS);
    expect((caughtError as InterpreterError).data.functionName).toBe("expm1");
  });

  it("should throw error for ln with non-numeric argument", () => {
    let caughtError: unknown;
    try {
      createInterpreter(`variable invalid: Number = ln("not a number");`).interpret();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(InterpreterError);
    expect((caughtError as InterpreterError).code).toBe(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS);
    expect((caughtError as InterpreterError).data.functionName).toBe("ln");
  });

  it("should throw error for log10 with non-numeric argument", () => {
    let caughtError: unknown;
    try {
      createInterpreter(`variable invalid: Number = log10("not a number");`).interpret();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(InterpreterError);
    expect((caughtError as InterpreterError).code).toBe(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS);
    expect((caughtError as InterpreterError).data.functionName).toBe("log10");
  });

  it("should throw error for log2 with non-numeric argument", () => {
    let caughtError: unknown;
    try {
      createInterpreter(`variable invalid: Number = log2("not a number");`).interpret();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(InterpreterError);
    expect((caughtError as InterpreterError).code).toBe(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS);
    expect((caughtError as InterpreterError).data.functionName).toBe("log2");
  });

  it("should throw error for log1p with non-numeric argument", () => {
    let caughtError: unknown;
    try {
      createInterpreter(`variable invalid: Number = log1p("not a number");`).interpret();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(InterpreterError);
    expect((caughtError as InterpreterError).code).toBe(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS);
    expect((caughtError as InterpreterError).data.functionName).toBe("log1p");
  });

  it("should throw error for cbrt with non-numeric argument", () => {
    let caughtError: unknown;
    try {
      createInterpreter(`variable invalid: Number = cbrt("not a number");`).interpret();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(InterpreterError);
    expect((caughtError as InterpreterError).code).toBe(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS);
    expect((caughtError as InterpreterError).data.functionName).toBe("cbrt");
  });

  it("should throw error for sign with non-numeric argument", () => {
    let caughtError: unknown;
    try {
      createInterpreter(`variable invalid: Number = sign("not a number");`).interpret();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(InterpreterError);
    expect((caughtError as InterpreterError).code).toBe(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS);
    expect((caughtError as InterpreterError).data.functionName).toBe("sign");
  });

  it("should throw error for trunc with non-numeric argument", () => {
    let caughtError: unknown;
    try {
      createInterpreter(`variable invalid: Number = trunc("not a number");`).interpret();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(InterpreterError);
    expect((caughtError as InterpreterError).code).toBe(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS);
    expect((caughtError as InterpreterError).data.functionName).toBe("trunc");
  });

  it("should throw error for hypot with non-numeric argument", () => {
    let caughtError: unknown;
    try {
      createInterpreter(`variable invalid: Number = hypot(3, "not a number");`).interpret();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(InterpreterError);
    expect((caughtError as InterpreterError).code).toBe(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS);
    expect((caughtError as InterpreterError).data.functionName).toBe("hypot");
  });

  it("should throw error for remainder with non-numeric argument", () => {
    let caughtError: unknown;
    try {
      createInterpreter(`variable invalid: Number = remainder("not a number", 3);`).interpret();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(InterpreterError);
    expect((caughtError as InterpreterError).code).toBe(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS);
    expect((caughtError as InterpreterError).data.functionName).toBe("remainder");
  });
});

describe("Math Functions - NumberWithUnit Support for New Functions", () => {
  it("should handle inverse hyperbolic functions with NumberWithUnit (preserves unit)", () => {
    const text = `
    variable asinh_px: NumberWithUnit = asinh(2px);
    variable acosh_px: NumberWithUnit = acosh(2px);
    variable atanh_px: NumberWithUnit = atanh(0.5px);
    `;
    const vars = interpretAndGetVariables(text, ["asinh_px", "acosh_px", "atanh_px"]);

    expect(vars.asinh_px?.value).toBeCloseTo(Math.asinh(2), 5);
    expect(vars.asinh_px?.toString()).toMatch(/px$/);
    expect(vars.acosh_px?.value).toBeCloseTo(Math.acosh(2), 5);
    expect(vars.acosh_px?.toString()).toMatch(/px$/);
    expect(vars.atanh_px?.value).toBeCloseTo(Math.atanh(0.5), 5);
    expect(vars.atanh_px?.toString()).toMatch(/px$/);
  });

  it("should handle exponential functions with NumberWithUnit (preserves unit)", () => {
    const text = `
    variable exp_px: NumberWithUnit = exp(1px);
    variable expm1_px: NumberWithUnit = expm1(1px);
    `;
    const vars = interpretAndGetVariables(text, ["exp_px", "expm1_px"]);

    expect(vars.exp_px?.value).toBeCloseTo(Math.E, 5);
    expect(vars.exp_px?.toString()).toMatch(/px$/);
    expect(vars.expm1_px?.value).toBeCloseTo(Math.E - 1, 5);
    expect(vars.expm1_px?.toString()).toMatch(/px$/);
  });

  it("should handle logarithmic functions with NumberWithUnit (preserves unit)", () => {
    const text = `
    variable ln_px: NumberWithUnit = ln(10px);
    variable log10_px: NumberWithUnit = log10(100px);
    variable log2_px: NumberWithUnit = log2(8px);
    variable log1p_px: NumberWithUnit = log1p(1px);
    `;
    const vars = interpretAndGetVariables(text, ["ln_px", "log10_px", "log2_px", "log1p_px"]);

    expect(vars.ln_px?.value).toBeCloseTo(Math.log(10), 5);
    expect(vars.ln_px?.toString()).toMatch(/px$/);
    expect(vars.log10_px?.value).toBeCloseTo(2, 5);
    expect(vars.log10_px?.toString()).toMatch(/px$/);
    expect(vars.log2_px?.value).toBeCloseTo(3, 5);
    expect(vars.log2_px?.toString()).toMatch(/px$/);
    expect(vars.log1p_px?.value).toBeCloseTo(Math.log(2), 5);
    expect(vars.log1p_px?.toString()).toMatch(/px$/);
  });

  it("should handle hypot with NumberWithUnit arguments (preserves unit)", () => {
    const text = `
    variable hypot_px: NumberWithUnit = hypot(3px, 4px);
    variable hypot_mixed: NumberWithUnit = hypot(3px, 4);
    `;
    const vars = interpretAndGetVariables(text, ["hypot_px", "hypot_mixed"]);

    expect(vars.hypot_px?.value).toBeCloseTo(5, 5);
    expect(vars.hypot_px?.toString()).toBe("5px");
    expect(vars.hypot_mixed?.value).toBeCloseTo(5, 5);
    expect(vars.hypot_mixed?.toString()).toBe("5px");
  });

  it("should handle remainder with NumberWithUnit arguments (preserves unit)", () => {
    // remainder preserves unit from first argument
    const text = `
    variable rem_px: NumberWithUnit = remainder(7px, 3px);
    variable rem_mixed: NumberWithUnit = remainder(10px, 4);
    `;
    const vars = interpretAndGetVariables(text, ["rem_px", "rem_mixed"]);

    expect(vars.rem_px?.value).toBe(1);
    expect(vars.rem_mixed?.value).toBe(2);
  });
});
