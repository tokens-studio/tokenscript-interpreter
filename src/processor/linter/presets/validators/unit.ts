import { NullSymbol, NumberSymbol, NumberWithUnitSymbol } from "@interpreter/symbols";
import { ValidatorCode } from "../codes";
import type { UnitConstraints, ValueValidator } from "../types";
import { issue } from "./issue";

/**
 * Validates NumberWithUnitSymbol or plain NumberSymbol with unit and value constraints.
 * NullSymbol and null values are accepted as valid.
 *
 * @example
 * numberWithUnit()                                      // Any number with or without unit
 * numberWithUnit({ min: 0 })                            // >= 0
 * numberWithUnit({ allowedUnits: ["px", "em", "%"] })   // Only these units
 * numberWithUnit({ disallowedUnits: ["%"] })            // Any unit except %
 * numberWithUnit({ requireUnit: true })                 // Must have a unit
 * numberWithUnit({ min: 0, allowedUnits: ["px", "rem"] })
 */
export function numberWithUnit(constraints?: UnitConstraints): ValueValidator {
  return (value, ctx) => {
    if (value instanceof NullSymbol) return null;

    const isNumberWithUnit = value instanceof NumberWithUnitSymbol;
    const isNumber = value instanceof NumberSymbol;

    if (!isNumberWithUnit && !isNumber) {
      return issue(
        ctx,
        ValidatorCode.EXPECTED_NUMBER_WITH_UNIT,
        "Expected a number or number with unit",
      );
    }

    // Null value is valid
    if ((value as NumberSymbol | NumberWithUnitSymbol).value === null) return null;

    const num = (value as NumberSymbol | NumberWithUnitSymbol).value as number;

    // Check if unit is required
    if (constraints?.requireUnit && !isNumberWithUnit) {
      return issue(ctx, ValidatorCode.EXPECTED_NUMBER_WITH_UNIT, "Expected a number with unit", {
        value: num,
      });
    }

    // Check numeric constraints
    if (constraints?.min !== undefined && num < constraints.min) {
      return issue(
        ctx,
        ValidatorCode.VALUE_TOO_SMALL,
        `Value ${num} is below minimum ${constraints.min}`,
        {
          value: num,
          min: constraints.min,
        },
      );
    }

    if (constraints?.max !== undefined && num > constraints.max) {
      return issue(
        ctx,
        ValidatorCode.VALUE_TOO_LARGE,
        `Value ${num} exceeds maximum ${constraints.max}`,
        {
          value: num,
          max: constraints.max,
        },
      );
    }

    // Check unit constraints (only for NumberWithUnitSymbol)
    if (isNumberWithUnit) {
      const unit = (value as NumberWithUnitSymbol).unit;

      if (constraints?.allowedUnits && !constraints.allowedUnits.includes(unit)) {
        return issue(
          ctx,
          ValidatorCode.UNIT_NOT_ALLOWED,
          `Unit "${unit}" not allowed. Use: ${constraints.allowedUnits.join(", ")}`,
          { unit, allowedUnits: constraints.allowedUnits },
        );
      }

      if (constraints?.disallowedUnits?.includes(unit)) {
        return issue(ctx, ValidatorCode.UNIT_DISALLOWED, `Unit "${unit}" is not allowed`, {
          unit,
          disallowedUnits: constraints.disallowedUnits,
        });
      }
    }

    return null;
  };
}
