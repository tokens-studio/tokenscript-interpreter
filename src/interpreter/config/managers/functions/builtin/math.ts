import {
  FunctionsErrorCode,
  InterpreterError,
  isLanguageError,
  serializeError,
} from "@interpreter/errors";
import { NumberSymbol, NumberWithUnitSymbol } from "@interpreter/symbols";
import type { ISymbolType } from "@src/types";
import type { UnitManager } from "../unit/manager";

type FunctionImpl = (...args: ISymbolType[]) => ISymbolType;

/**
 * Extracts a numeric value from a symbol.
 * Accepts NumberSymbol, NumberWithUnitSymbol, or any symbol with a numeric value.
 */
function extractNumber(arg: ISymbolType, functionName: string): number {
  if (arg instanceof NumberSymbol) return arg.value as number;
  if (arg instanceof NumberWithUnitSymbol) return arg.value as number;
  if (typeof arg.value === "number") return arg.value as number;
  throw new InterpreterError(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS, {
    data: { functionName },
  });
}

/**
 * Applies a function over the numeric value, preserving NumberWithUnitSymbol wrapper.
 */
function over(
  arg: ISymbolType,
  fn: (value: number) => number,
  functionName: string,
): NumberSymbol | NumberWithUnitSymbol {
  const value = extractNumber(arg, functionName);
  const result = fn(value);
  if (arg instanceof NumberWithUnitSymbol) {
    return new NumberWithUnitSymbol(result, arg.unit);
  }
  return new NumberSymbol(result);
}

/**
 * Applies a binary function over two numeric values.
 * Preserves the unit from the first argument if it's a NumberWithUnitSymbol.
 */
function overTwo(
  a: ISymbolType,
  b: ISymbolType,
  fn: (aVal: number, bVal: number) => number,
  functionName: string,
): NumberSymbol | NumberWithUnitSymbol {
  const aVal = extractNumber(a, functionName);
  const bVal = extractNumber(b, functionName);
  const result = fn(aVal, bVal);
  if (a instanceof NumberWithUnitSymbol) {
    return new NumberWithUnitSymbol(result, a.unit);
  }
  return new NumberSymbol(result);
}

/**
 * Applies a reducer function over multiple numeric values.
 * Preserves the unit from the first NumberWithUnitSymbol argument.
 */
function overMany(
  args: ISymbolType[],
  fn: (nums: number[]) => number,
  functionName: string,
  minArgs?: number,
): NumberSymbol | NumberWithUnitSymbol {
  if (minArgs !== undefined && args.length < minArgs) {
    throw new InterpreterError(FunctionsErrorCode.REQUIRES_MIN_ARGUMENTS, {
      data: { functionName, minArgs },
    });
  }
  const nums = args.map((arg) => extractNumber(arg, functionName));
  const result = fn(nums);
  const firstUnitArg = args.find((arg) => arg instanceof NumberWithUnitSymbol) as
    | NumberWithUnitSymbol
    | undefined;
  if (firstUnitArg) {
    return new NumberWithUnitSymbol(result, firstUnitArg.unit);
  }
  return new NumberSymbol(result);
}

/**
 * Creates a sum function with optional unit manager getter for unit conversion.
 * Uses a getter to allow lazy access to the unit manager.
 */
export function createSumFunction(getUnitManager?: () => UnitManager | undefined): FunctionImpl {
  return (...args: ISymbolType[]): ISymbolType => {
    if (args.length < 2)
      throw new InterpreterError(FunctionsErrorCode.REQUIRES_MIN_ARGUMENTS, {
        data: { functionName: "sum", minArgs: 2 },
      });

    const hasUnits = args.some((arg) => arg instanceof NumberWithUnitSymbol);

    if (!hasUnits) {
      const nums = args.map((arg) => extractNumber(arg, "sum"));
      return new NumberSymbol(nums.reduce((acc, val) => acc + val, 0));
    }

    const numericArgs = args.filter(
      (arg) => arg instanceof NumberSymbol || arg instanceof NumberWithUnitSymbol,
    ) as Array<NumberSymbol | NumberWithUnitSymbol>;

    if (numericArgs.length !== args.length) {
      throw new InterpreterError(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS, {
        data: { functionName: "sum" },
      });
    }

    const unitManager = getUnitManager?.();
    if (unitManager) {
      try {
        const converted = unitManager.convertToCommonFormat(numericArgs);
        const sum = converted.reduce((acc, arg) => acc + (arg.value as number), 0);

        const firstUnitArg = converted.find(
          (arg) => arg instanceof NumberWithUnitSymbol,
        ) as NumberWithUnitSymbol;

        if (firstUnitArg) {
          return new NumberWithUnitSymbol(sum, firstUnitArg.unit);
        }
        return new NumberSymbol(sum);
      } catch (error) {
        throw new InterpreterError(FunctionsErrorCode.UNIT_CONVERSION_FAILED, {
          data: {
            functionName: "sum",
            error: isLanguageError(error) ? error : serializeError(error),
          },
        });
      }
    }

    // Fallback: sum without conversion
    const firstUnitArg = args.find(
      (arg) => arg instanceof NumberWithUnitSymbol,
    ) as NumberWithUnitSymbol;

    const nums = args.map((arg) => extractNumber(arg, "sum"));
    const sum = nums.reduce((acc, val) => acc + val, 0);

    if (firstUnitArg) {
      return new NumberWithUnitSymbol(sum, firstUnitArg.unit);
    }
    return new NumberSymbol(sum);
  };
}

export const mathFunctions: Record<string, FunctionImpl> = {
  min: (...args: ISymbolType[]) => overMany(args, (nums) => Math.min(...nums), "min", 1),

  max: (...args: ISymbolType[]) => overMany(args, (nums) => Math.max(...nums), "max", 1),

  clamp: (value: ISymbolType, min: ISymbolType, max: ISymbolType): NumberSymbol | NumberWithUnitSymbol => {
    const valueNum = extractNumber(value, "clamp");
    const minNum = extractNumber(min, "clamp");
    const maxNum = extractNumber(max, "clamp");

    if (minNum > maxNum) {
      throw new InterpreterError(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE, {
        data: { functionName: "clamp", constraint: "min must be less than or equal to max" },
      });
    }

    const result = Math.min(Math.max(valueNum, minNum), maxNum);

    if (value instanceof NumberWithUnitSymbol) {
      return new NumberWithUnitSymbol(result, value.unit);
    }
    return new NumberSymbol(result);
  },

  mod: (a: ISymbolType, b: ISymbolType) =>
    overTwo(
      a,
      b,
      (aVal, bVal) => {
        if (bVal === 0)
          throw new InterpreterError(FunctionsErrorCode.DIVISION_BY_ZERO, {
            data: { functionName: "mod" },
          });
        return ((aVal % bVal) + bVal) % bVal;
      },
      "mod",
    ),

  average: (...args: ISymbolType[]) =>
    overMany(args, (nums) => nums.reduce((acc, val) => acc + val, 0) / nums.length, "average", 1),

  round: (arg: ISymbolType) => over(arg, Math.round, "round"),
  abs: (arg: ISymbolType) => over(arg, Math.abs, "abs"),
  sqrt: (arg: ISymbolType) => over(arg, Math.sqrt, "sqrt"),
  floor: (arg: ISymbolType) => over(arg, Math.floor, "floor"),
  ceil: (arg: ISymbolType) => over(arg, Math.ceil, "ceil"),
  cbrt: (arg: ISymbolType) => over(arg, Math.cbrt, "cbrt"),
  sign: (arg: ISymbolType) => over(arg, Math.sign, "sign"),
  trunc: (arg: ISymbolType) => over(arg, Math.trunc, "trunc"),
  exp: (arg: ISymbolType) => over(arg, Math.exp, "exp"),
  expm1: (arg: ISymbolType) => over(arg, Math.expm1, "expm1"),

  pow: (base: ISymbolType, exp: ISymbolType) => overTwo(base, exp, (b, e) => b ** e, "pow"),

  round_to: (value: ISymbolType, precision?: ISymbolType) => {
    const precisionValue = precision !== undefined ? extractNumber(precision, "round_to") : 0;
    const fn =
      precisionValue === 0
        ? Math.round
        : (v: number) => {
            const factor = 10 ** precisionValue;
            return Math.round(v * factor) / factor;
          };
    return over(value, fn, "round_to");
  },

  hypot: (...args: ISymbolType[]) => overMany(args, (nums) => Math.hypot(...nums), "hypot", 1),

  remainder: (a: ISymbolType, b: ISymbolType) =>
    overTwo(
      a,
      b,
      (aVal, bVal) => {
        if (bVal === 0)
          throw new InterpreterError(FunctionsErrorCode.DIVISION_BY_ZERO, {
            data: { functionName: "remainder" },
          });
        return aVal % bVal;
      },
      "remainder",
    ),

  // Trigonometric functions
  sin: (arg: ISymbolType) => over(arg, Math.sin, "sin"),
  cos: (arg: ISymbolType) => over(arg, Math.cos, "cos"),
  tan: (arg: ISymbolType) => over(arg, Math.tan, "tan"),
  atan: (arg: ISymbolType) => over(arg, Math.atan, "atan"),

  asin: (arg: ISymbolType) => {
    const value = extractNumber(arg, "asin");
    if (value < -1 || value > 1)
      throw new InterpreterError(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE, {
        data: { functionName: "asin", constraint: "between -1 and 1" },
      });
    return over(arg, Math.asin, "asin");
  },

  acos: (arg: ISymbolType) => {
    const value = extractNumber(arg, "acos");
    if (value < -1 || value > 1)
      throw new InterpreterError(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE, {
        data: { functionName: "acos", constraint: "between -1 and 1" },
      });
    return over(arg, Math.acos, "acos");
  },

  atan2: (y: ISymbolType, x: ISymbolType): NumberSymbol => {
    const yVal = extractNumber(y, "atan2");
    const xVal = extractNumber(x, "atan2");
    return new NumberSymbol(Math.atan2(yVal, xVal));
  },

  // Hyperbolic functions
  sinh: (arg: ISymbolType) => over(arg, Math.sinh, "sinh"),
  cosh: (arg: ISymbolType) => over(arg, Math.cosh, "cosh"),
  tanh: (arg: ISymbolType) => over(arg, Math.tanh, "tanh"),
  asinh: (arg: ISymbolType) => over(arg, Math.asinh, "asinh"),

  acosh: (arg: ISymbolType) => {
    const value = extractNumber(arg, "acosh");
    if (value < 1) {
      throw new InterpreterError(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE, {
        data: {
          functionName: "acosh",
          constraint: "greater than or equal to 1",
        },
      });
    }
    return over(arg, Math.acosh, "acosh");
  },

  atanh: (arg: ISymbolType) => {
    const value = extractNumber(arg, "atanh");
    if (value <= -1 || value >= 1) {
      throw new InterpreterError(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE, {
        data: {
          functionName: "atanh",
          constraint: "between -1 and 1 (exclusive)",
        },
      });
    }
    return over(arg, Math.atanh, "atanh");
  },

  // Logarithmic functions
  log: (arg: ISymbolType, base?: ISymbolType): NumberSymbol | NumberWithUnitSymbol => {
    const value = extractNumber(arg, "log");
    if (value <= 0)
      throw new InterpreterError(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE, {
        data: { functionName: "log", constraint: "positive" },
      });
    if (base === undefined) {
      return over(arg, Math.log, "log");
    }
    const baseValue = extractNumber(base, "log");
    if (baseValue <= 0 || baseValue === 1)
      throw new InterpreterError(FunctionsErrorCode.INVALID_BASE, {
        data: {
          functionName: "log",
          constraint: "positive and not equal to 1",
        },
      });
    return over(arg, (v) => Math.log(v) / Math.log(baseValue), "log");
  },

  ln: (arg: ISymbolType) => {
    const value = extractNumber(arg, "ln");
    if (value <= 0) {
      throw new InterpreterError(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE, {
        data: { functionName: "ln", constraint: "positive" },
      });
    }
    return over(arg, Math.log, "ln");
  },

  log10: (arg: ISymbolType) => {
    const value = extractNumber(arg, "log10");
    if (value <= 0) {
      throw new InterpreterError(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE, {
        data: { functionName: "log10", constraint: "positive" },
      });
    }
    return over(arg, Math.log10, "log10");
  },

  log2: (arg: ISymbolType) => {
    const value = extractNumber(arg, "log2");
    if (value <= 0) {
      throw new InterpreterError(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE, {
        data: { functionName: "log2", constraint: "positive" },
      });
    }
    return over(arg, Math.log2, "log2");
  },

  log1p: (arg: ISymbolType) => {
    const value = extractNumber(arg, "log1p");
    if (value < -1) {
      throw new InterpreterError(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE, {
        data: {
          functionName: "log1p",
          constraint: "greater than or equal to -1",
        },
      });
    }
    return over(arg, Math.log1p, "log1p");
  },

  // Constants
  pi: (): NumberSymbol => new NumberSymbol(Math.PI),
};
