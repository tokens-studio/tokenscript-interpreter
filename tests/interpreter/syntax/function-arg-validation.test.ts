import { Config } from "@interpreter/config";
import type { FunctionSpecification } from "@interpreter/config/managers/functions/schema";
import { FunctionsErrorCode, InterpreterError } from "@interpreter/errors";
import { describe, expect, it } from "vitest";
import { interpret, interpretDirect, interpretExpectError } from "../test-helpers";

// ============================================
// Test schemas
// ============================================

const DOUBLE_FUNCTION: FunctionSpecification = {
  name: "Double",
  type: "function",
  keyword: "double",
  description: "Doubles a number",
  input: {
    type: "object",
    properties: {
      value: { type: "number", description: "The number to double" },
    },
  },
  script: {
    type: "tokenscript",
    script: `variable args: List = {input};
variable val: Number = args.get(0);
return val * 2;`,
  },
};

const ADD_FUNCTION: FunctionSpecification = {
  name: "Add",
  type: "function",
  keyword: "add",
  description: "Adds two numbers",
  input: {
    type: "object",
    properties: {
      a: { type: "number" },
      b: { type: "number" },
    },
  },
  script: {
    type: "tokenscript",
    script: `variable args: List = {input};
return args.get(0) + args.get(1);`,
  },
};

const NO_INPUT_FUNCTION: FunctionSpecification = {
  name: "Always42",
  type: "function",
  keyword: "always42",
  description: "Returns 42",
  script: {
    type: "tokenscript",
    script: "return 42;",
  },
};

function createConfigWithSchemas(...specs: Array<{ uri: string; schema: FunctionSpecification }>) {
  const config = new Config();
  config.registerSchemas(specs);
  return config;
}

// ============================================
// Schema function argument validation
// ============================================

describe("Schema function argument validation", () => {
  it("should throw when calling a 1-arg schema function with no arguments", () => {
    const config = createConfigWithSchemas({ uri: "/fn/double/0", schema: DOUBLE_FUNCTION });

    try {
      interpretExpectError("double()", {}, config);
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(InterpreterError);
      expect((e as InterpreterError).code).toBe(FunctionsErrorCode.REQUIRES_MIN_ARGUMENTS);
    }
  });

  it("should throw when calling a 2-arg schema function with no arguments", () => {
    const config = createConfigWithSchemas({ uri: "/fn/add/0", schema: ADD_FUNCTION });

    try {
      interpretExpectError("add()", {}, config);
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(InterpreterError);
      expect((e as InterpreterError).code).toBe(FunctionsErrorCode.REQUIRES_MIN_ARGUMENTS);
    }
  });

  it("should throw when calling a 2-arg schema function with only 1 argument", () => {
    const config = createConfigWithSchemas({ uri: "/fn/add/0", schema: ADD_FUNCTION });

    try {
      interpretExpectError("add(5)", {}, config);
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(InterpreterError);
      expect((e as InterpreterError).code).toBe(FunctionsErrorCode.REQUIRES_MIN_ARGUMENTS);
    }
  });

  it("should succeed when calling a 1-arg schema function with correct args", () => {
    const config = createConfigWithSchemas({ uri: "/fn/double/0", schema: DOUBLE_FUNCTION });
    expect(interpretDirect("double(5)", {}, config)).toBe("10");
  });

  it("should succeed when calling a 2-arg schema function with correct args", () => {
    const config = createConfigWithSchemas({ uri: "/fn/add/0", schema: ADD_FUNCTION });
    expect(interpretDirect("add(3, 7)", {}, config)).toBe("10");
  });

  it("should not validate arg count for functions without input spec", () => {
    const config = createConfigWithSchemas({ uri: "/fn/always42/0", schema: NO_INPUT_FUNCTION });
    expect(interpretDirect("always42()", {}, config)).toBe("42");
  });

  it("should allow extra arguments beyond what the spec defines", () => {
    const config = createConfigWithSchemas({ uri: "/fn/double/0", schema: DOUBLE_FUNCTION });
    expect(interpretDirect("double(5, 99)", {}, config)).toBe("10");
  });
});

// ============================================
// Builtin math function missing argument guard
// ============================================

describe("Builtin math functions with missing arguments", () => {
  const unaryFunctions = [
    "abs",
    "sqrt",
    "floor",
    "ceil",
    "round",
    "trunc",
    "sin",
    "cos",
    "tan",
    "atan",
    "sinh",
    "cosh",
    "tanh",
    "asinh",
    "exp",
    "expm1",
    "cbrt",
    "sign",
    "ln",
    "log10",
    "log2",
    "log1p",
  ];

  for (const fn of unaryFunctions) {
    it(`${fn}() should throw FN_EXPECTS_NUMBER_ARGUMENTS`, () => {
      try {
        interpretExpectError(`return ${fn}();`);
        expect.unreachable(`${fn}() should have thrown`);
      } catch (e) {
        expect(e).toBeInstanceOf(InterpreterError);
        expect((e as InterpreterError).code).toBe(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS);
      }
    });
  }

  const binaryFunctions = ["pow", "mod", "remainder", "atan2"];

  for (const fn of binaryFunctions) {
    it(`${fn}() with no args should throw`, () => {
      expect(() => interpretExpectError(`return ${fn}();`)).toThrow(InterpreterError);
    });

    it(`${fn}(1) with one arg should throw`, () => {
      expect(() => interpretExpectError(`return ${fn}(1);`)).toThrow(InterpreterError);
    });
  }

  it("min() should throw FN_REQUIRES_MIN_ARGUMENTS", () => {
    try {
      interpretExpectError("return min();");
      expect.unreachable("should have thrown");
    } catch (e) {
      expect((e as InterpreterError).code).toBe(FunctionsErrorCode.REQUIRES_MIN_ARGUMENTS);
    }
  });

  it("max() should throw FN_REQUIRES_MIN_ARGUMENTS", () => {
    try {
      interpretExpectError("return max();");
      expect.unreachable("should have thrown");
    } catch (e) {
      expect((e as InterpreterError).code).toBe(FunctionsErrorCode.REQUIRES_MIN_ARGUMENTS);
    }
  });

  it("builtins with correct args still work", () => {
    expect(interpret("atan(1)")).toBe(String(Math.atan(1)));
    expect(interpret("abs(-5)")).toBe("5");
    expect(interpret("pow(2, 3)")).toBe("8");
    expect(interpret("min(1, 2, 3)")).toBe("1");
  });
});
