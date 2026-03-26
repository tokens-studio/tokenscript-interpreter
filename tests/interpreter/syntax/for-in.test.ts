import { InterpreterError } from "@interpreter/errors";
import {
  createInterpreter,
  interpretAndGetVariable,
  interpretDirect,
  interpretExpectError,
} from "@tests/interpreter/test-helpers";
import { describe, expect, it } from "vitest";

describe("for...in loop", () => {
  describe("basic iteration", () => {
    it("should iterate over a list and auto-collect results", () => {
      const interpreter = createInterpreter(`for x in range(3) [x * 10;]`);
      const result = interpreter.interpret();
      expect(result?.toString()).toBe("0, 10, 20");
    });

    it("should handle single element list", () => {
      const interpreter = createInterpreter(`for x in range(1) [x + 42;]`);
      const result = interpreter.interpret();
      expect(result?.toString()).toBe("42");
    });

    it("should handle empty list", () => {
      const interpreter = createInterpreter(`for x in range(0) [x;]`);
      const result = interpreter.interpret();
      expect(result?.toString()).toBe("");
    });

    it("should collect last expression per iteration", () => {
      const interpreter = createInterpreter(`
        for x in range(1, 2) [
          variable y: Number = x + 1;
          y * 2;
        ]
      `);
      const result = interpreter.interpret();
      expect(result?.toString()).toBe("4");
    });
  });

  describe("index variable", () => {
    it("should support item, index destructuring", () => {
      const interpreter = createInterpreter(`for val, idx in range(3) [idx;]`);
      const result = interpreter.interpret();
      expect(result?.toString()).toBe("0, 1, 2");
    });

    it("should bind correct item and index", () => {
      const interpreter = createInterpreter(`for val, idx in range(1, 3) [val + idx;]`);
      const result = interpreter.interpret();
      // range(1,3) = [1, 2], indices = [0, 1]
      // val+idx: 1+0=1, 2+1=3
      expect(result?.toString()).toBe("1, 3");
    });
  });

  describe("scoping", () => {
    it("should not leak item variable to outer scope", () => {
      const result = interpretAndGetVariable(
        `
        variable before: Number = 99;
        for x in range(3) [x;];
        `,
        "x",
      );
      expect(result).toBeNull();
    });

    it("should error when item variable shadows outer variable (ADR-005)", () => {
      expect(() =>
        interpretExpectError(`
          variable i: Number = 42;
          for i in range(3) [i * 10;];
        `),
      ).toThrow(InterpreterError);
    });

    it("should error when index variable shadows outer variable", () => {
      expect(() =>
        interpretExpectError(`
          variable idx: Number = 99;
          for x, idx in range(2) [x;];
        `),
      ).toThrow(InterpreterError);
    });

    it("should error when item and index have the same name", () => {
      expect(() =>
        interpretExpectError(`for x, x in range(2) [x;]`),
      ).toThrow(InterpreterError);
    });

    it("should allow reassigning outer variables from for body", () => {
      const result = interpretAndGetVariable(
        `
        variable sum: Number = 0;
        for x in range(1, 4) [sum = sum + x;];
        `,
        "sum",
      );
      expect(result?.value).toBe(6);
    });
  });

  describe("return inside for body", () => {
    it("should propagate return out of the loop", () => {
      const interpreter = createInterpreter(`for x in range(3) [return 42;]`);
      const result = interpreter.interpret();
      expect(result?.value).toBe(42);
    });
  });

  describe("error cases", () => {
    it("should error when collection is not a list (number)", () => {
      expect(() =>
        interpretExpectError(`for x in 42 [x;]`),
      ).toThrow(InterpreterError);
    });

    it("should error when collection is a string", () => {
      expect(() =>
        interpretExpectError(`for c in "hello" [c;]`),
      ).toThrow(InterpreterError);
    });
  });

  describe("nested for...in", () => {
    it("should handle nested loops with different variable names", () => {
      // Outer iterates over range, inner doubles
      const interpreter = createInterpreter(`
        variable result: Number = 0;
        for i in range(3) [
          for j in range(2) [
            result = result + 1;
          ];
        ];
      `);
      interpreter.interpret();
      // 3 outer × 2 inner = 6 increments
      const result = (interpreter as any).symbolTable.get("result");
      expect(result?.value).toBe(6);
    });
  });

  describe("contextual 'in' keyword", () => {
    it("should not break CSS inches unit", () => {
      const result = interpretDirect(`2in + 3in`);
      expect(result).toBe("5in");
    });
  });
});

describe("range() builtin", () => {
  it("range(count) should generate [0..count-1]", () => {
    const interpreter = createInterpreter(`range(3)`);
    const result = interpreter.interpret();
    expect(result?.toString()).toBe("0, 1, 2");
  });

  it("range(start, end) should generate [start..end-1]", () => {
    const interpreter = createInterpreter(`range(2, 5)`);
    const result = interpreter.interpret();
    expect(result?.toString()).toBe("2, 3, 4");
  });

  it("range(0) should return empty list", () => {
    const interpreter = createInterpreter(`range(0)`);
    const result = interpreter.interpret();
    expect(result?.toString()).toBe("");
  });

  it("range(start, start) should return empty list", () => {
    const interpreter = createInterpreter(`range(3, 3)`);
    const result = interpreter.interpret();
    expect(result?.toString()).toBe("");
  });

  it("range(5, 2) should return empty list (no reverse)", () => {
    const interpreter = createInterpreter(`range(5, 2)`);
    const result = interpreter.interpret();
    expect(result?.toString()).toBe("");
  });

  it("range(-5, -2) should work with negative numbers", () => {
    const interpreter = createInterpreter(`range(-5, -2)`);
    const result = interpreter.interpret();
    expect(result?.toString()).toBe("-5, -4, -3");
  });

  it("range(-1) should error (negative count)", () => {
    expect(() =>
      interpretExpectError(`range(-1)`),
    ).toThrow();
  });

  it("range(1.5) should error (non-integer)", () => {
    expect(() =>
      interpretExpectError(`range(1.5)`),
    ).toThrow();
  });

  describe("for...in + range integration", () => {
    it("should work together: for i in range(3) [i * 10;]", () => {
      const interpreter = createInterpreter(`for i in range(3) [i * 10;]`);
      const result = interpreter.interpret();
      expect(result?.toString()).toBe("0, 10, 20");
    });

    it("should work with range(start, end)", () => {
      const interpreter = createInterpreter(`for i in range(1, 4) [i * i;]`);
      const result = interpreter.interpret();
      expect(result?.toString()).toBe("1, 4, 9");
    });
  });
});
