import {
  BooleanSymbol,
  ColorSymbol,
  NullSymbol,
  NumberSymbol,
  StringSymbol,
} from "@interpreter/symbols";
import { ValidatorCode } from "../codes";
import type { NumericConstraints, StringConstraints, ValueValidator } from "../types";
import { issue } from "./issue";

/**
 * Validates NumberSymbol with optional min/max constraints.
 * NullSymbol and null values are accepted as valid.
 *
 * @example
 * number()                    // Any number
 * number({ min: 0 })          // >= 0
 * number({ min: 0, max: 1 })  // 0-1 range (opacity)
 * number({ min: 100, max: 900 }) // font-weight numeric
 */
export function number(constraints?: NumericConstraints): ValueValidator {
  return (value, ctx) => {
    if (value instanceof NullSymbol) return null;
    if (value instanceof NumberSymbol && value.value === null) return null;

    if (!(value instanceof NumberSymbol)) {
      return issue(ctx, ValidatorCode.EXPECTED_NUMBER, "Expected a number");
    }

    const num = value.value as number;

    if (constraints?.min !== undefined && num < constraints.min) {
      return issue(
        ctx,
        ValidatorCode.VALUE_TOO_SMALL,
        `Value ${num} is below minimum ${constraints.min}`,
        { value: num, min: constraints.min },
      );
    }

    if (constraints?.max !== undefined && num > constraints.max) {
      return issue(
        ctx,
        ValidatorCode.VALUE_TOO_LARGE,
        `Value ${num} exceeds maximum ${constraints.max}`,
        { value: num, max: constraints.max },
      );
    }

    return null;
  };
}

/**
 * Validates StringSymbol with optional enum constraint.
 * NullSymbol and null values are accepted as valid.
 *
 * @example
 * string()  // Any non-null string
 * string({ allowedValues: ["none", "uppercase", "lowercase"] })
 * string({ allowedValues: ["A", "B"], caseSensitive: true })
 */
export function string(constraints?: StringConstraints): ValueValidator {
  return (value, ctx) => {
    if (value instanceof NullSymbol) return null;
    if (value instanceof StringSymbol && value.value === null) return null;

    if (!(value instanceof StringSymbol)) {
      return issue(ctx, ValidatorCode.EXPECTED_STRING, "Expected a string");
    }

    const str = value.value as string;
    const allowedValues = constraints?.allowedValues;

    if (allowedValues) {
      const caseSensitive = constraints?.caseSensitive ?? false;
      const matches = caseSensitive
        ? allowedValues.includes(str)
        : allowedValues.some((v) => v.toLowerCase() === str.toLowerCase());

      if (!matches) {
        return issue(
          ctx,
          ValidatorCode.VALUE_NOT_IN_ENUM,
          `Value "${str}" must be one of: ${allowedValues.join(", ")}`,
          { value: str, allowedValues },
        );
      }
    }

    return null;
  };
}

/**
 * Validates BooleanSymbol.
 * NullSymbol and null values are accepted as valid.
 *
 * @example
 * boolean()  // true or false
 */
export function boolean(): ValueValidator {
  return (value, ctx) => {
    if (value instanceof NullSymbol) return null;
    if (value instanceof BooleanSymbol && value.value === null) return null;

    if (!(value instanceof BooleanSymbol)) {
      return issue(ctx, ValidatorCode.EXPECTED_BOOLEAN, "Expected a boolean");
    }

    return null;
  };
}

/**
 * Validates ColorSymbol.
 * NullSymbol and null values are accepted as valid.
 *
 * @example
 * color()  // Any valid color
 */
export function color(): ValueValidator {
  return (value, ctx) => {
    if (value instanceof NullSymbol) return null;
    if (value instanceof ColorSymbol && value.value === null) return null;

    if (!(value instanceof ColorSymbol)) {
      return issue(ctx, ValidatorCode.EXPECTED_COLOR, "Expected a color");
    }

    return null;
  };
}
