import type { LintIssue, LintSeverity } from "../types";

/**
 * Context passed to value validators during validation.
 */
export interface ValidatorContext {
  /** The token being validated */
  tokenName: string;
  /** Path to the current field within a structured token */
  path: (string | number)[];
  /** Default severity for issues */
  severity: LintSeverity;
}

/**
 * A value validator checks a resolved value and returns issues or null for valid.
 *
 * @param value - The resolved symbol value to validate
 * @param ctx - Validation context with token name, path, and severity
 * @returns LintIssue(s) if invalid, null if valid
 */
export type ValueValidator = (
  value: unknown,
  ctx: ValidatorContext,
) => LintIssue | LintIssue[] | null;

/**
 * Constraints for numeric validators (number, numberWithUnit)
 */
export interface NumericConstraints {
  /** Minimum allowed value (inclusive) */
  min?: number;
  /** Maximum allowed value (inclusive) */
  max?: number;
}

/**
 * Constraints for numberWithUnit validator
 */
export interface UnitConstraints extends NumericConstraints {
  /** Only allow these units (e.g., ["px", "em", "%"]) */
  allowedUnits?: string[];
  /** Disallow these units (e.g., ["%"]) */
  disallowedUnits?: string[];
  /** Require a unit (reject plain numbers). Default: false */
  requireUnit?: boolean;
}

/**
 * Constraints for string validator
 */
export interface StringConstraints {
  /** Only allow these exact values (enum validation) */
  allowedValues?: string[];
  /** Case-sensitive comparison (default: false) */
  caseSensitive?: boolean;
}

/**
 * Field definition for structured token validation
 */
export interface FieldDef {
  /** Validator for this field */
  validator: ValueValidator;
  /** Whether the field is required (default: false) */
  required?: boolean;
}

/**
 * Options for struct validator
 */
export interface StructOptions {
  /** Error on unknown fields not defined in schema (default: false) */
  strict?: boolean;
  /** Warn when optional fields are missing (default: false) */
  warnMissing?: boolean;
}

/**
 * Options for list validators
 */
export interface ListOptions {
  /** Exact count required */
  count?: number;
  /** Minimum count (inclusive) */
  minCount?: number;
  /** Maximum count (inclusive) */
  maxCount?: number;
  /** Specific allowed counts (e.g., [1, 2, 4] for CSS shorthand) */
  allowedCounts?: number[];
}
