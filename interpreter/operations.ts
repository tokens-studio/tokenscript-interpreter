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

function decomposeUnit(operand: MathOperand): { value: number; unit: SupportedFormats | null } {
  if (operand instanceof NumberWithUnitSymbol) {
    return { value: operand.value as number, unit: operand.unit };
  }
  if (operand instanceof NumberSymbol) {
    return { value: operand.value as number, unit: null };
  }
  throw new InterpreterError(
    `Unsupported operand type for unit decomposition: ${(operand as BaseSymbolType).type}`
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

function mathWrapper(func: (v1: number, v2: number) => number): OperationFunction {
  return (a: MathOperand, b: MathOperand): MathOperand => {
    const opA = decomposeUnit(a);
    const opB = decomposeUnit(b);

    const resultValue = func(opA.value, opB.value);
    return recomposeUnit(resultValue, [opA.unit, opB.unit]);
  };
}

function comparisonWrapper(func: (v1: any, v2: any) => boolean): BooleanOperationFunction {
  return (a: ISymbolType, b: ISymbolType): BooleanSymbol => {
    // Check for type compatibility first
    const isNumericA = a instanceof NumberSymbol || a instanceof NumberWithUnitSymbol;
    const isNumericB = b instanceof NumberSymbol || b instanceof NumberWithUnitSymbol;
    const isStringA = a instanceof StringSymbol;
    const isStringB = b instanceof StringSymbol;
    const isBooleanA = a instanceof BooleanSymbol;
    const isBooleanB = b instanceof BooleanSymbol;

    // Only allow comparisons between compatible types
    if (isNumericA && !isNumericB) {
      throw new InterpreterError(`Cannot compare ${a.type} with ${b.type}. Incompatible types.`);
    }
    if (isStringA && !isStringB) {
      throw new InterpreterError(`Cannot compare ${a.type} with ${b.type}. Incompatible types.`);
    }
    if (isBooleanA && !isBooleanB) {
      throw new InterpreterError(`Cannot compare ${a.type} with ${b.type}. Incompatible types.`);
    }

    // For comparisons, we often compare raw values if types are compatible (e.g. Number and NumberWithUnit)
    const valA = a.value;
    const valB = b.value;

    if (a instanceof NumberWithUnitSymbol && b instanceof NumberSymbol) {
      // Allow comparison between NumberWithUnit and Number
    } else if (a instanceof NumberSymbol && b instanceof NumberWithUnitSymbol) {
      // Allow comparison between Number and NumberWithUnit
    } else if (a instanceof NumberWithUnitSymbol && b instanceof NumberWithUnitSymbol) {
      if (a.unit !== b.unit) {
        throw new InterpreterError(
          `Cannot compare NumberWithUnit of different units: ${a.unit} and ${b.unit}`
        );
      }
    }
    // If types are compatible, rely on their direct .value comparison
    return new BooleanSymbol(func(valA, valB));
  };
}

export const OPERATION_IMPLEMENTATIONS: Record<
  string,
  OperationFunction | BooleanOperationFunction | ((a: ISymbolType, b: ISymbolType) => BooleanSymbol)
> = {
  [Operations.ADD]: mathWrapper((v1, v2) => v1 + v2),
  [Operations.SUBTRACT]: mathWrapper((v1, v2) => v1 - v2),
  [Operations.MULTIPLY]: mathWrapper((v1, v2) => v1 * v2),
  [Operations.DIVIDE]: mathWrapper((v1, v2) => {
    if (v2 === 0) throw new InterpreterError("Division by zero.");
    return v1 / v2;
  }),
  [Operations.POWER]: mathWrapper((v1, v2) => v1 ** v2),

  // Logical operations for Booleans
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

// Comparison operations map to TokenType values directly
export const COMPARISON_IMPLEMENTATIONS: Record<string, BooleanOperationFunction> = {
  IS_EQ: comparisonWrapper((v1, v2) => v1 === v2),
  IS_NOT_EQ: comparisonWrapper((v1, v2) => v1 !== v2),
  GT: comparisonWrapper((v1, v2) => v1 > v2),
  LT: comparisonWrapper((v1, v2) => v1 < v2),
  IS_GT_EQ: comparisonWrapper((v1, v2) => v1 >= v2),
  IS_LT_EQ: comparisonWrapper((v1, v2) => v1 <= v2),
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
    return new NumberSymbol(Math.round(arg.value as number));
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
  parse_int: (strSymbol: ISymbolType, baseSymbol?: ISymbolType): NumberSymbol => {
    if (!(strSymbol instanceof StringSymbol))
      throw new InterpreterError("parse_int() first argument must be a string.");
    const base = baseSymbol instanceof NumberSymbol ? (baseSymbol.value as number) : 10;
    const parsed = Number.parseInt(strSymbol.value as string, base);
    if (Number.isNaN(parsed))
      throw new InterpreterError(
        `Invalid string for parse_int: "${strSymbol.value}" with base ${base}.`
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

  // Advanced rounding function with precision
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
      // Round to nearest integer
      return new NumberSymbol(Math.round(numValue));
    }
    // Round to specified decimal places
    const factor = 10 ** precisionValue;
    return new NumberSymbol(Math.round(numValue * factor) / factor);
  },

  // Placeholder for non-mathematical functions that return strings
  "linear-gradient": (...args: ISymbolType[]): StringSymbol => {
    const stringArgs = args.map((arg) => arg.toString()).join(", ");
    return new StringSymbol(`linear-gradient(${stringArgs})`);
  },
  pi: (): NumberSymbol => new NumberSymbol(Math.PI),
};

export const LANGUAGE_OPTIONS = {
  MAX_ITERATIONS: 1000,
  // UNINTERPRETED_KEYWORDS is defined in types.ts and should be imported there
};
