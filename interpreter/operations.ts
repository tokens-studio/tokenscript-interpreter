import { type ISymbolType, Operations, type SupportedFormats } from "../types";
import type { Config } from "./config/config";
import { InterpreterError } from "./errors";
import {
  type BaseSymbolType,
  BooleanSymbol,
  NumberSymbol,
  NumberWithUnitSymbol,
  StringSymbol,
} from "./symbols";

type MathOperand = NumberSymbol | NumberWithUnitSymbol;
type OperationFunction = (a: MathOperand, b: MathOperand, config?: Config) => MathOperand;
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

function recomposeUnit(
  value: number,
  units: (SupportedFormats | null)[],
  _config?: Config,
): MathOperand {
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
  return (a: MathOperand, b: MathOperand, config?: Config): MathOperand => {
    // If we have a config with unit manager, try to convert to common format
    if (config?.unitManager) {
      try {
        const converted = config.unitManager.convertToCommonFormat([a, b]);
        if (converted.length === 2) {
          const convertedA = converted[0] as MathOperand;
          const convertedB = converted[1] as MathOperand;

          const opA = decomposeUnit(convertedA);
          const opB = decomposeUnit(convertedB);

          const resultValue = func(opA.value, opB.value);
          return recomposeUnit(resultValue, [opA.unit, opB.unit], config);
        }
      } catch (_error) {
        // Fall back to original behavior if unit conversion fails
      }
    }

    const opA = decomposeUnit(a);
    const opB = decomposeUnit(b);

    const resultValue = func(opA.value, opB.value);
    return recomposeUnit(resultValue, [opA.unit, opB.unit], config);
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

function powerWrapper(func: (a: number, b: number) => number): OperationFunction {
  return (a: MathOperand, b: MathOperand, config?: Config): MathOperand => {
    // Power operations should not allow unit conversion as it doesn't make dimensional sense
    const opA = decomposeUnit(a);
    const opB = decomposeUnit(b);

    // Reject if both operands have units
    if (opA.unit && opB.unit) {
      throw new InterpreterError(
        `Cannot raise ${opA.unit} to the power of ${opB.unit}. Unit exponents are not supported.`,
      );
    }

    const resultValue = func(opA.value, opB.value);
    return recomposeUnit(resultValue, [opA.unit, opB.unit], config);
  };
}

function multiplyDivideWrapper(func: (a: number, b: number) => number): OperationFunction {
  return (a: MathOperand, b: MathOperand, config?: Config): MathOperand => {
    // For multiplication/division, handle percentages specially
    if (config?.unitManager) {
      // Check if one operand is a percentage
      const aIsPercent =
        a instanceof NumberWithUnitSymbol &&
        config.unitManager.getSpecByKeyword(a.unit)?.type === "relative";
      const bIsPercent =
        b instanceof NumberWithUnitSymbol &&
        config.unitManager.getSpecByKeyword(b.unit)?.type === "relative";

      if (aIsPercent && !bIsPercent) {
        // a% * b = (a/100) * b with b's unit (if any)
        const resultValue = func((a.value as number) / 100, b.value as number);
        return b instanceof NumberWithUnitSymbol
          ? new NumberWithUnitSymbol(resultValue, b.unit)
          : new NumberSymbol(resultValue);
      } else if (bIsPercent && !aIsPercent) {
        // a * b% = a * (b/100) with a's unit (if any)
        const resultValue = func(a.value as number, (b.value as number) / 100);
        return a instanceof NumberWithUnitSymbol
          ? new NumberWithUnitSymbol(resultValue, a.unit)
          : new NumberSymbol(resultValue);
      }
    }

    // Fall back to standard unit conversion for non-percentage cases
    return mathWrapper(func)(a, b, config);
  };
}

export const MATH_IMPLEMENTATIONS: Record<string, OperationFunction> = {
  [Operations.ADD]: mathWrapper((a, b) => a + b),
  [Operations.SUBTRACT]: mathWrapper((a, b) => a - b),
  [Operations.MULTIPLY]: multiplyDivideWrapper((a, b) => a * b),
  [Operations.DIVIDE]: multiplyDivideWrapper((a, b) => {
    if (b === 0) throw new InterpreterError("Division by zero.");
    return a / b;
  }),
  [Operations.POWER]: powerWrapper((a, b) => a ** b),
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
