
import { ISymbolType, Operations, SupportedFormats } from '../types';
import { NumberSymbol, NumberWithUnitSymbol, StringSymbol, BooleanSymbol, ListSymbol, BaseSymbolType } from './symbols';
import { InterpreterError } from './errors';

type MathOperand = NumberSymbol | NumberWithUnitSymbol;
type OperationFunction = (a: MathOperand, b: MathOperand) => MathOperand;
type BooleanOperationFunction = (a: ISymbolType, b: ISymbolType) => BooleanSymbol;

function decomposeUnit(operand: MathOperand): { value: number, unit: SupportedFormats | null } {
  if (operand instanceof NumberWithUnitSymbol) {
    return { value: operand.value as number, unit: operand.unit };
  }
  if (operand instanceof NumberSymbol) {
    return { value: operand.value as number, unit: null };
  }
  throw new InterpreterError(`Unsupported operand type for unit decomposition: ${(operand as BaseSymbolType).type}`);
}

function recomposeUnit(value: number, units: (SupportedFormats | null)[]): MathOperand {
  const validUnits = units.filter(u => u !== null) as SupportedFormats[];
  if (validUnits.length === 0) {
    return new NumberSymbol(value);
  }
  if (new Set(validUnits).size > 1) {
    throw new InterpreterError(`Cannot mix units: ${validUnits.join(', ')}`);
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
    // For comparisons, we often compare raw values if types are compatible (e.g. Number and NumberWithUnit)
    let valA = a.value;
    let valB = b.value;

    if (a instanceof NumberWithUnitSymbol && b instanceof NumberSymbol) {
        // Potentially disallow direct comparison or convert b to NumberWithUnit with same unit if contextually appropriate
        // For now, comparing values directly if one is unitless and other has unit might be misleading.
        // Let's assume simple value comparison for now, but this might need refinement based on language spec.
    } else if (a instanceof NumberSymbol && b instanceof NumberWithUnitSymbol) {
        // similar to above
    } else if (a instanceof NumberWithUnitSymbol && b instanceof NumberWithUnitSymbol) {
        if (a.unit !== b.unit) {
            throw new InterpreterError(`Cannot compare NumberWithUnit of different units: ${a.unit} and ${b.unit}`);
        }
    }
    // If types are not numeric, rely on their direct .value comparison
    return new BooleanSymbol(func(valA, valB));
  };
}


export const OPERATION_IMPLEMENTATIONS: Record<string, OperationFunction | BooleanOperationFunction | ((a: ISymbolType, b: ISymbolType) => BooleanSymbol) > = {
  [Operations.ADD]: mathWrapper((v1, v2) => v1 + v2),
  [Operations.SUBTRACT]: mathWrapper((v1, v2) => v1 - v2),
  [Operations.MULTIPLY]: mathWrapper((v1, v2) => v1 * v2),
  [Operations.DIVIDE]: mathWrapper((v1, v2) => {
    if (v2 === 0) throw new InterpreterError("Division by zero.");
    return v1 / v2;
  }),
  [Operations.POWER]: mathWrapper((v1, v2) => Math.pow(v1, v2)),
  
  // Logical operations for Booleans
  [Operations.LOGIC_AND]: (a, b) => {
    if (!(a instanceof BooleanSymbol) || !(b instanceof BooleanSymbol)) throw new InterpreterError("&& operator requires boolean operands.");
    return new BooleanSymbol(a.value && b.value);
  },
  [Operations.LOGIC_OR]: (a, b) => {
    if (!(a instanceof BooleanSymbol) || !(b instanceof BooleanSymbol)) throw new InterpreterError("|| operator requires boolean operands.");
    return new BooleanSymbol(a.value || b.value);
  },
};

// Comparison operations map to TokenType values directly
export const COMPARISON_IMPLEMENTATIONS: Record<string, BooleanOperationFunction> = {
    "IS_EQ": comparisonWrapper((v1, v2) => v1 === v2),
    "IS_NOT_EQ": comparisonWrapper((v1, v2) => v1 !== v2),
    "GT": comparisonWrapper((v1, v2) => v1 > v2),
    "LT": comparisonWrapper((v1, v2) => v1 < v2),
    "IS_GT_EQ": comparisonWrapper((v1, v2) => v1 >= v2),
    "IS_LT_EQ": comparisonWrapper((v1, v2) => v1 <= v2),
};


// Built-in functions
export const DEFAULT_FUNCTION_MAP: Record<string, (...args: ISymbolType[]) => ISymbolType> = {
  // Math functions - assuming they operate on NumberSymbol values
  "min": (...args: ISymbolType[]): NumberSymbol => {
    const nums = args.map(arg => {
      if (arg instanceof NumberSymbol) return arg.value as number;
      if (arg instanceof NumberWithUnitSymbol) return arg.value as number;
      if (typeof arg.value === 'number') return arg.value as number;
      throw new InterpreterError("min() expects number arguments.");
    });
    return new NumberSymbol(Math.min(...nums));
  },
  "max": (...args: ISymbolType[]): NumberSymbol => {
    const nums = args.map(arg => {
      if (arg instanceof NumberSymbol) return arg.value as number;
      if (arg instanceof NumberWithUnitSymbol) return arg.value as number;
      if (typeof arg.value === 'number') return arg.value as number;
      throw new InterpreterError("max() expects number arguments.");
    });
    return new NumberSymbol(Math.max(...nums));
  },
  "sum": (...args: ISymbolType[]): NumberSymbol => {
    const sum = args.reduce((acc, arg) => {
      if (arg instanceof NumberSymbol) return acc + (arg.value as number);
      if (arg instanceof NumberWithUnitSymbol) return acc + (arg.value as number);
      if (typeof arg.value === 'number') return acc + (arg.value as number);
      throw new InterpreterError("sum() expects number arguments.");
    }, 0);
    return new NumberSymbol(sum);
  },
  "average": (...args: ISymbolType[]): NumberSymbol => {
    if (args.length === 0) throw new InterpreterError("average() requires at least one argument.");
    const sum = args.reduce((acc, arg) => {
      if (!(arg instanceof NumberSymbol)) throw new InterpreterError("average() expects number arguments.");
      return acc + (arg.value as number);
    }, 0);
    return new NumberSymbol(sum / args.length);
  },
  "round": (arg: ISymbolType): NumberSymbol => {
    if (!(arg instanceof NumberSymbol)) throw new InterpreterError("round() expects a number argument.");
    return new NumberSymbol(Math.round(arg.value as number));
  },
  "abs": (arg: ISymbolType): NumberSymbol => {
    if (!(arg instanceof NumberSymbol)) throw new InterpreterError("abs() expects a number argument.");
    return new NumberSymbol(Math.abs(arg.value as number));
  },
  "sqrt": (arg: ISymbolType): NumberSymbol => {
    if (!(arg instanceof NumberSymbol)) throw new InterpreterError("sqrt() expects a number argument.");
    return new NumberSymbol(Math.sqrt(arg.value as number));
  },
  "pow": (base: ISymbolType, exp: ISymbolType): NumberSymbol => {
    if (!(base instanceof NumberSymbol) || !(exp instanceof NumberSymbol)) throw new InterpreterError("pow() expects two number arguments.");
    return new NumberSymbol(Math.pow(base.value as number, exp.value as number));
  },
  "parse_int": (strSymbol: ISymbolType, baseSymbol?: ISymbolType): NumberSymbol => {
    if (!(strSymbol instanceof StringSymbol)) throw new InterpreterError("parse_int() first argument must be a string.");
    const base = baseSymbol instanceof NumberSymbol ? baseSymbol.value as number : 10;
    const parsed = parseInt(strSymbol.value as string, base);
    if (isNaN(parsed)) throw new InterpreterError(`Invalid string for parse_int: "${strSymbol.value}" with base ${base}.`);
    return new NumberSymbol(parsed);
  },
  // Placeholder for non-mathematical functions that return strings
  "linear-gradient": (...args: ISymbolType[]): StringSymbol => {
    const stringArgs = args.map(arg => arg.toString()).join(', ');
    return new StringSymbol(`linear-gradient(${stringArgs})`);
  },
   "pi": (): NumberSymbol => new NumberSymbol(Math.PI),
};

export const LANGUAGE_OPTIONS = {
  MAX_ITERATIONS: 1000,
  // UNINTERPRETED_KEYWORDS is defined in types.ts and should be imported there
};
