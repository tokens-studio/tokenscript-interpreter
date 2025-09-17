import { type ISymbolType, Operations, type SupportedFormats } from "../types";
import { InterpreterError } from "./errors";
import {
  type BaseSymbolType,
  BooleanSymbol,
  NumberSymbol,
  NumberWithUnitSymbol,
  StringSymbol,
} from "./symbols";

type MathOperand = NumberSymbol | NumberWithUnitSymbol;
type OperationFunction = (a: MathOperand, b: MathOperand) => MathOperand;
type BooleanOperationFunction = (a: ISymbolType, b: ISymbolType) => BooleanSymbol;

function decomposeUnit(operand: MathOperand): {
  value: number;
  unit: SupportedFormats | null;
} {
  if (operand instanceof NumberWithUnitSymbol) {
    return { value: operand.value as number, unit: operand.unit };
  }
  if (operand instanceof NumberSymbol) {
    return { value: operand.value as number, unit: null };
  }
  throw new InterpreterError(
    `Unsupported operand type for unit decomposition: ${(operand as BaseSymbolType).type}`,
  );
}

function recomposeUnit(value: number, units: (SupportedFormats | null)[]): MathOperand {
  const validUnits = units.filter((u) => u !== null) as SupportedFormats[];
  if (validUnits.length === 0) {
    return new NumberSymbol(value);
  }
  if (new Set(validUnits).size > 1) {
    throw new InterpreterError(`Cannot mix units: ${validUnits.join(", ")}`);
  }
  return new NumberWithUnitSymbol(value, validUnits[0]);
}

function mathWrapper(func: (a: number, b: number) => number): OperationFunction {
  return (a: MathOperand, b: MathOperand): MathOperand => {
    const opA = decomposeUnit(a);
    const opB = decomposeUnit(b);

    const resultValue = func(opA.value, opB.value);
    return recomposeUnit(resultValue, [opA.unit, opB.unit]);
  };
}

function comparisonWrapper(fn: (a: any, b: any) => boolean): BooleanOperationFunction {
  return (a: ISymbolType, b: ISymbolType): BooleanSymbol => {
    const isNumericA = a instanceof NumberSymbol || a instanceof NumberWithUnitSymbol;
    const isNumericB = b instanceof NumberSymbol || b instanceof NumberWithUnitSymbol;
    if (isNumericA && !isNumericB) {
      throw new InterpreterError(`Cannot compare ${a.type} with ${b.type}. Incompatible types.`);
    }

    const isStringA = a instanceof StringSymbol;
    const isStringB = b instanceof StringSymbol;
    if (isStringA && !isStringB) {
      throw new InterpreterError(`Cannot compare ${a.type} with ${b.type}. Incompatible types.`);
    }

    const isBooleanA = a instanceof BooleanSymbol;
    const isBooleanB = b instanceof BooleanSymbol;
    if (isBooleanA && !isBooleanB) {
      throw new InterpreterError(`Cannot compare ${a.type} with ${b.type}. Incompatible types.`);
    }

    if (
      a instanceof NumberWithUnitSymbol &&
      b instanceof NumberWithUnitSymbol &&
      a.unit !== b.unit
    ) {
      throw new InterpreterError(
        `Cannot compare NumberWithUnit of different units: ${a.unit} and ${b.unit}`,
      );
    }

    return new BooleanSymbol(fn(a.value, b.value));
  };
}

export const LOGICAL_BOOLEAN_IMPLEMENTATIONS: Record<string, BooleanOperationFunction> = {
  [Operations.LOGIC_AND]: (a: ISymbolType, b: ISymbolType) => {
    if (!(a instanceof BooleanSymbol) || !(b instanceof BooleanSymbol))
      throw new InterpreterError("&& operator requires boolean operands.");
    return new BooleanSymbol(a.value && b.value);
  },
  [Operations.LOGIC_OR]: (a: ISymbolType, b: ISymbolType) => {
    if (!(a instanceof BooleanSymbol) || !(b instanceof BooleanSymbol))
      throw new InterpreterError("|| operator requires boolean operands.");
    return new BooleanSymbol(a.value || b.value);
  },
};

export const MATH_IMPLEMENTATIONS: Record<string, OperationFunction> = {
  [Operations.ADD]: mathWrapper((a, b) => a + b),
  [Operations.SUBTRACT]: mathWrapper((a, b) => a - b),
  [Operations.MULTIPLY]: mathWrapper((a, b) => a * b),
  [Operations.DIVIDE]: mathWrapper((a, b) => {
    if (b === 0) throw new InterpreterError("Division by zero.");
    return a / b;
  }),
  [Operations.POWER]: mathWrapper((a, b) => a ** b),
};

// Comparison operations map to TokenType values directly
export const COMPARISON_IMPLEMENTATIONS: Record<string, BooleanOperationFunction> = {
  IS_EQ: comparisonWrapper((a, b) => a === b),
  IS_NOT_EQ: comparisonWrapper((a, b) => a !== b),
  GT: comparisonWrapper((a, b) => a > b),
  LT: comparisonWrapper((a, b) => a < b),
  IS_GT_EQ: comparisonWrapper((a, b) => a >= b),
  IS_LT_EQ: comparisonWrapper((a, b) => a <= b),
};

// Built-in functions
export const DEFAULT_FUNCTION_MAP: Record<string, (...args: ISymbolType[]) => ISymbolType> = {
  // Math functions - assuming they operate on NumberSymbol values
  min: (...args: ISymbolType[]): NumberSymbol => {
    const nums = args.map((arg) => {
      if (arg instanceof NumberSymbol) return arg.value as number;
      if (arg instanceof NumberWithUnitSymbol) return arg.value as number;
      if (typeof arg.value === "number") return arg.value as number;
      throw new InterpreterError("min() expects number arguments.");
    });
    return new NumberSymbol(Math.min(...nums));
  },
  max: (...args: ISymbolType[]): NumberSymbol => {
    const nums = args.map((arg) => {
      if (arg instanceof NumberSymbol) return arg.value as number;
      if (arg instanceof NumberWithUnitSymbol) return arg.value as number;
      if (typeof arg.value === "number") return arg.value as number;
      throw new InterpreterError("max() expects number arguments.");
    });
    return new NumberSymbol(Math.max(...nums));
  },
  sum: (...args: ISymbolType[]): NumberSymbol => {
    if (args.length < 2) throw new InterpreterError("sum() requires at least two arguments.");
    const sum = args.reduce((acc, arg) => {
      if (arg instanceof NumberSymbol) return acc + (arg.value as number);
      if (arg instanceof NumberWithUnitSymbol) return acc + (arg.value as number);
      if (typeof arg.value === "number") return acc + (arg.value as number);
      throw new InterpreterError("sum() expects number arguments.");
    }, 0);
    return new NumberSymbol(sum);
  },
  mod: (a: ISymbolType, b: ISymbolType): NumberSymbol => {
    let aVal: number, bVal: number;

    if (a instanceof NumberSymbol) aVal = a.value as number;
    else if (a instanceof NumberWithUnitSymbol) aVal = a.value as number;
    else if (typeof a.value === "number") aVal = a.value as number;
    else throw new InterpreterError("mod() expects number arguments.");

    if (b instanceof NumberSymbol) bVal = b.value as number;
    else if (b instanceof NumberWithUnitSymbol) bVal = b.value as number;
    else if (typeof b.value === "number") bVal = b.value as number;
    else throw new InterpreterError("mod() expects number arguments.");

    if (bVal === 0) throw new InterpreterError("mod() division by zero.");

    // Use JavaScript's remainder operator for modulo
    return new NumberSymbol(((aVal % bVal) + bVal) % bVal);
  },
  average: (...args: ISymbolType[]): NumberSymbol => {
    if (args.length === 0) throw new InterpreterError("average() requires at least one argument.");
    const sum = args.reduce((acc, arg) => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError("average() expects number arguments.");
      return acc + (arg.value as number);
    }, 0);
    return new NumberSymbol(sum / args.length);
  },
  round: (arg: ISymbolType): NumberSymbol => {
    if (!(arg instanceof NumberSymbol))
      throw new InterpreterError("round() expects a number argument.");
    const value = arg.value as number;

    // Implement banker's rounding (round to nearest even) for .5 cases
    const intPart = Math.floor(value);
    const fraction = value - intPart;

    if (fraction === 0.5) {
      // For .5, round to the nearest even integer
      return new NumberSymbol(intPart % 2 === 0 ? intPart : intPart + 1);
    }

    // Use regular Math.round for all other cases
    return new NumberSymbol(Math.round(value));
  },
  abs: (arg: ISymbolType): NumberSymbol => {
    if (!(arg instanceof NumberSymbol))
      throw new InterpreterError("abs() expects a number argument.");
    return new NumberSymbol(Math.abs(arg.value as number));
  },
  sqrt: (arg: ISymbolType): NumberSymbol => {
    if (!(arg instanceof NumberSymbol))
      throw new InterpreterError("sqrt() expects a number argument.");
    return new NumberSymbol(Math.sqrt(arg.value as number));
  },
  pow: (base: ISymbolType, exp: ISymbolType): NumberSymbol => {
    if (!(base instanceof NumberSymbol) || !(exp instanceof NumberSymbol))
      throw new InterpreterError("pow() expects two number arguments.");
    return new NumberSymbol((base.value as number) ** (exp.value as number));
  },
  parseint: (strSymbol: ISymbolType, baseSymbol?: ISymbolType): NumberSymbol => {
    if (!(strSymbol instanceof StringSymbol))
      throw new InterpreterError("parseint() first argument must be a string.");
    const base = baseSymbol instanceof NumberSymbol ? (baseSymbol.value as number) : 10;
    const parsed = Number.parseInt(strSymbol.value as string, base);
    if (Number.isNaN(parsed))
      throw new InterpreterError(
        `Invalid string for parseint: "${strSymbol.value}" with base ${base}.`,
      );
    return new NumberSymbol(parsed);
  },

  // Trigonometric functions
  sin: (arg: ISymbolType): NumberSymbol => {
    if (!(arg instanceof NumberSymbol))
      throw new InterpreterError("sin() expects a number argument.");
    return new NumberSymbol(Math.sin(arg.value as number));
  },
  cos: (arg: ISymbolType): NumberSymbol => {
    if (!(arg instanceof NumberSymbol))
      throw new InterpreterError("cos() expects a number argument.");
    return new NumberSymbol(Math.cos(arg.value as number));
  },
  tan: (arg: ISymbolType): NumberSymbol => {
    if (!(arg instanceof NumberSymbol))
      throw new InterpreterError("tan() expects a number argument.");
    return new NumberSymbol(Math.tan(arg.value as number));
  },

  // Inverse trigonometric functions
  asin: (arg: ISymbolType): NumberSymbol => {
    if (!(arg instanceof NumberSymbol))
      throw new InterpreterError("asin() expects a number argument.");
    const value = arg.value as number;
    if (value < -1 || value > 1)
      throw new InterpreterError("asin() argument must be between -1 and 1.");
    return new NumberSymbol(Math.asin(value));
  },
  acos: (arg: ISymbolType): NumberSymbol => {
    if (!(arg instanceof NumberSymbol))
      throw new InterpreterError("acos() expects a number argument.");
    const value = arg.value as number;
    if (value < -1 || value > 1)
      throw new InterpreterError("acos() argument must be between -1 and 1.");
    return new NumberSymbol(Math.acos(value));
  },
  atan: (arg: ISymbolType): NumberSymbol => {
    if (!(arg instanceof NumberSymbol))
      throw new InterpreterError("atan() expects a number argument.");
    return new NumberSymbol(Math.atan(arg.value as number));
  },

  // Logarithmic functions
  log: (arg: ISymbolType, base?: ISymbolType): NumberSymbol => {
    if (!(arg instanceof NumberSymbol))
      throw new InterpreterError("log() expects a number argument.");
    const value = arg.value as number;
    if (value <= 0) throw new InterpreterError("log() argument must be positive.");

    if (base === undefined) {
      // Natural logarithm (base e)
      return new NumberSymbol(Math.log(value));
    }

    if (!(base instanceof NumberSymbol)) throw new InterpreterError("log() base must be a number.");
    const baseValue = base.value as number;
    if (baseValue <= 0 || baseValue === 1)
      throw new InterpreterError("log() base must be positive and not equal to 1.");

    // Change of base formula: log_base(x) = ln(x) / ln(base)
    return new NumberSymbol(Math.log(value) / Math.log(baseValue));
  },

  // Additional rounding functions
  floor: (arg: ISymbolType): NumberSymbol => {
    if (!(arg instanceof NumberSymbol))
      throw new InterpreterError("floor() expects a number argument.");
    return new NumberSymbol(Math.floor(arg.value as number));
  },
  ceil: (arg: ISymbolType): NumberSymbol => {
    if (!(arg instanceof NumberSymbol))
      throw new InterpreterError("ceil() expects a number argument.");
    return new NumberSymbol(Math.ceil(arg.value as number));
  },

  // Advanced rounding function with precision using banker's rounding
  roundto: (value: ISymbolType, precision?: ISymbolType): NumberSymbol => {
    if (!(value instanceof NumberSymbol))
      throw new InterpreterError("roundTo() expects a number as first argument.");

    let precisionValue = 0; // Default to integer rounding
    if (precision !== undefined) {
      if (!(precision instanceof NumberSymbol))
        throw new InterpreterError("roundTo() expects a number as second argument.");
      precisionValue = precision.value as number;
    }

    const numValue = value.value as number;

    if (precisionValue === 0) {
      // Round to nearest integer using banker's rounding
      const intPart = Math.floor(numValue);
      const fraction = numValue - intPart;

      if (fraction === 0.5) {
        // For .5, round to the nearest even integer
        return new NumberSymbol(intPart % 2 === 0 ? intPart : intPart + 1);
      }

      // Use regular Math.round for all other cases
      return new NumberSymbol(Math.round(numValue));
    }

    // Round to specified decimal places using banker's rounding
    const factor = 10 ** precisionValue;
    const scaledValue = numValue * factor;
    const intPart = Math.floor(scaledValue);
    const fraction = scaledValue - intPart;

    let roundedScaled: number;
    if (fraction === 0.5) {
      // For .5, round to the nearest even integer
      roundedScaled = intPart % 2 === 0 ? intPart : intPart + 1;
    } else {
      // Use regular Math.round for all other cases
      roundedScaled = Math.round(scaledValue);
    }

    return new NumberSymbol(roundedScaled / factor);
  },

  // Placeholder for non-mathematical functions that return strings
  "linear-gradient": (...args: ISymbolType[]): StringSymbol => {
    const stringArgs = args.map((arg) => arg.toString()).join(", ");
    return new StringSymbol(`linear-gradient(${stringArgs})`);
  },
  rgba: (...args: ISymbolType[]): StringSymbol => {
    const stringArgs = args.map((arg) => arg.toString()).join(", ");
    return new StringSymbol(`rgba(${stringArgs})`);
  },
  pi: (): NumberSymbol => new NumberSymbol(Math.PI),
};

export const LANGUAGE_OPTIONS = {
  MAX_ITERATIONS: 1000,
  // UNINTERPRETED_KEYWORDS is defined in types.ts and should be imported there
};
