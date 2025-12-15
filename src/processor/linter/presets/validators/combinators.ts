import { ListSymbol, NullSymbol, TokenSymbol } from "@interpreter/symbols";
import { isArray, isMap } from "@interpreter/utils/type";
import type { ISymbolType } from "@src/types";
import type { LintIssue } from "../../types";
import { LintSeverity } from "../../types";
import { ValidatorCode } from "../codes";
import type {
  FieldDef,
  ListOptions,
  StructOptions,
  ValidatorContext,
  ValueValidator,
} from "../types";

/**
 * Creates a LintIssue from validation context.
 */
function issue(
  ctx: ValidatorContext,
  code: ValidatorCode,
  message: string,
  data?: Record<string, unknown>,
): LintIssue {
  return {
    code,
    severity: ctx.severity,
    message,
    tokenName: ctx.tokenName,
    path: ctx.path.length > 0 ? [...ctx.path] : undefined,
    data,
  };
}

/**
 * Collects issues from a validation result into an array.
 */
function collectIssues(result: LintIssue | LintIssue[] | null): LintIssue[] {
  if (result === null) return [];
  return isArray(result) ? result : [result];
}

/**
 * Union validator - value must match at least one validator.
 *
 * @example
 * // font-weight: number 1-1000 OR keywords
 * or(
 *   number({ min: 1, max: 1000 }),
 *   string({ allowedValues: ["normal", "bold", "lighter", "bolder"] })
 * )
 *
 * // length-percentage
 * or(length, percentage)
 */
export function or(...validators: ValueValidator[]): ValueValidator {
  return (value, ctx) => {
    if (value instanceof NullSymbol) return null;

    const errors: LintIssue[] = [];

    for (const validator of validators) {
      const result = validator(value, ctx);
      if (result === null) {
        return null;
      }
      const issues = collectIssues(result);
      if (issues.length > 0) {
        errors.push(issues[0]);
      }
    }

    return issue(ctx, ValidatorCode.NO_VALIDATOR_MATCHED, "Value did not match any expected type", {
      attemptedValidators: validators.length,
      errors: errors.map((e) => e.code),
    });
  };
}

/**
 * Validates a single value OR a list of values.
 * Handles CSS shorthand patterns (1, 2, 3, or 4 values).
 *
 * @example
 * // border-radius: single value or 1/2/3/4 values
 * oneOrList(
 *   lengthPercentageNonNegative,
 *   { allowedCounts: [1, 2, 3, 4] }
 * )
 */
export function oneOrList(itemValidator: ValueValidator, options?: ListOptions): ValueValidator {
  return (value, ctx) => {
    if (value instanceof NullSymbol) return null;

    // Check if it's a list (ListSymbol or TokenSymbol with array value)
    const isList =
      value instanceof ListSymbol || (value instanceof TokenSymbol && isArray(value.value));

    if (isList) {
      const items = value instanceof ListSymbol ? value.value : (value as TokenSymbol).value;
      if (!isArray(items)) return null;

      const count = items.length;

      // Check count constraints
      if (options?.allowedCounts && !options.allowedCounts.includes(count)) {
        return issue(
          ctx,
          ValidatorCode.LIST_LENGTH_INVALID,
          `List has ${count} items, expected ${options.allowedCounts.join(" or ")}`,
          { count, allowedCounts: options.allowedCounts },
        );
      }

      if (options?.count !== undefined && count !== options.count) {
        return issue(
          ctx,
          ValidatorCode.LIST_LENGTH_INVALID,
          `List has ${count} items, expected exactly ${options.count}`,
          {
            count,
            expected: options.count,
          },
        );
      }

      if (options?.minCount !== undefined && count < options.minCount) {
        return issue(
          ctx,
          ValidatorCode.LIST_LENGTH_INVALID,
          `List has ${count} items, expected at least ${options.minCount}`,
          { count, minCount: options.minCount },
        );
      }

      if (options?.maxCount !== undefined && count > options.maxCount) {
        return issue(
          ctx,
          ValidatorCode.LIST_LENGTH_INVALID,
          `List has ${count} items, expected at most ${options.maxCount}`,
          {
            count,
            maxCount: options.maxCount,
          },
        );
      }

      // Validate each item
      const issues: LintIssue[] = [];
      (items as ISymbolType[]).forEach((item, index) => {
        const itemCtx = { ...ctx, path: [...ctx.path, index] };
        const result = itemValidator(item, itemCtx);
        issues.push(...collectIssues(result));
      });

      return issues.length > 0 ? issues : null;
    }

    // Single value - validate directly
    return itemValidator(value, ctx);
  };
}

/**
 * Validates a list with count constraints.
 *
 * @example
 * list(color(), { minCount: 1 })  // At least one color
 * list(number(), { count: 4 })    // Exactly 4 numbers
 * list(shadowSingle, { minCount: 1 }) // At least one shadow
 */
export function list(itemValidator: ValueValidator, options?: ListOptions): ValueValidator {
  return (value, ctx) => {
    if (value instanceof NullSymbol) return null;

    // Check if it's a list
    const isList =
      value instanceof ListSymbol || (value instanceof TokenSymbol && isArray(value.value));

    if (!isList) {
      return issue(ctx, ValidatorCode.EXPECTED_LIST, "Expected a list");
    }

    const items = value instanceof ListSymbol ? value.value : (value as TokenSymbol).value;
    if (!isArray(items)) {
      return issue(ctx, ValidatorCode.EXPECTED_LIST, "Expected a list");
    }

    const count = items.length;

    // Check count constraints
    if (options?.allowedCounts && !options.allowedCounts.includes(count)) {
      return issue(
        ctx,
        ValidatorCode.LIST_LENGTH_INVALID,
        `List has ${count} items, expected ${options.allowedCounts.join(" or ")}`,
        { count, allowedCounts: options.allowedCounts },
      );
    }

    if (options?.count !== undefined && count !== options.count) {
      return issue(
        ctx,
        ValidatorCode.LIST_LENGTH_INVALID,
        `List has ${count} items, expected exactly ${options.count}`,
        {
          count,
          expected: options.count,
        },
      );
    }

    if (options?.minCount !== undefined && count < options.minCount) {
      return issue(
        ctx,
        ValidatorCode.LIST_LENGTH_INVALID,
        `List has ${count} items, expected at least ${options.minCount}`,
        {
          count,
          minCount: options.minCount,
        },
      );
    }

    if (options?.maxCount !== undefined && count > options.maxCount) {
      return issue(
        ctx,
        ValidatorCode.LIST_LENGTH_INVALID,
        `List has ${count} items, expected at most ${options.maxCount}`,
        {
          count,
          maxCount: options.maxCount,
        },
      );
    }

    // Validate each item
    const issues: LintIssue[] = [];
    (items as ISymbolType[]).forEach((item, index) => {
      const itemCtx = { ...ctx, path: [...ctx.path, index] };
      const result = itemValidator(item, itemCtx);
      issues.push(...collectIssues(result));
    });

    return issues.length > 0 ? issues : null;
  };
}

/**
 * Validates a structured token (TokenSymbol with Map value).
 *
 * @param fields - Field validators. Can be ValueValidator or FieldDef with required flag.
 * @param options - Struct validation options
 *
 * @example
 * struct({
 *   fontSize: numberWithUnit({ min: 0 }),
 *   lineHeight: number({ min: 0 }),
 * })
 *
 * struct({
 *   fontSize: { validator: numberWithUnit({ min: 0 }), required: true },
 *   lineHeight: number({ min: 0 }),
 * }, { strict: true, warnMissing: true })
 */
export function struct(
  fields: Record<string, FieldDef | ValueValidator>,
  options?: StructOptions,
): ValueValidator {
  return (value, ctx) => {
    if (value instanceof NullSymbol) return null;

    // Must be TokenSymbol with Map value, or DictionarySymbol
    const hasMapValue =
      (value instanceof TokenSymbol && isMap(value.value)) ||
      (value !== null &&
        typeof value === "object" &&
        "value" in value &&
        isMap((value as { value: unknown }).value));

    if (!hasMapValue) {
      return issue(ctx, ValidatorCode.EXPECTED_STRUCTURED, "Expected a structured token");
    }

    const issues: LintIssue[] = [];
    const fieldMap = (value as { value: Map<string, ISymbolType> }).value;

    // Normalize field definitions
    const normalizedFields = Object.entries(fields).map(([name, def]) => ({
      name,
      validator: typeof def === "function" ? def : def.validator,
      required: typeof def === "function" ? false : (def.required ?? false),
    }));

    // Check required fields and warn on missing optional
    for (const field of normalizedFields) {
      const hasField = fieldMap.has(field.name);

      if (field.required && !hasField) {
        issues.push({
          code: ValidatorCode.REQUIRED_FIELD_MISSING,
          severity: ctx.severity,
          message: `Required field "${field.name}" is missing`,
          tokenName: ctx.tokenName,
          path: [...ctx.path, field.name],
        });
      } else if (!field.required && !hasField && options?.warnMissing) {
        issues.push({
          code: ValidatorCode.FIELD_MISSING,
          severity: LintSeverity.WARNING,
          message: `Optional field "${field.name}" is not set`,
          tokenName: ctx.tokenName,
          path: [...ctx.path, field.name],
        });
      }
    }

    // Validate present fields
    for (const field of normalizedFields) {
      const fieldValue = fieldMap.get(field.name);
      if (fieldValue !== undefined) {
        const fieldCtx = { ...ctx, path: [...ctx.path, field.name] };
        const result = field.validator(fieldValue, fieldCtx);
        issues.push(...collectIssues(result));
      }
    }

    // Check for unknown fields (strict mode)
    if (options?.strict) {
      const knownFields = new Set(normalizedFields.map((f) => f.name));
      for (const key of fieldMap.keys()) {
        if (!knownFields.has(key)) {
          issues.push({
            code: ValidatorCode.UNKNOWN_FIELD,
            severity: ctx.severity,
            message: `Unknown field "${key}"`,
            tokenName: ctx.tokenName,
            path: [...ctx.path, key],
          });
        }
      }
    }

    return issues.length > 0 ? issues : null;
  };
}

/**
 * Shorthand for list with minCount: 1.
 * Useful for array-of-objects patterns like shadow.
 *
 * @example
 * arrayOf(shadowSingle)  // At least one shadow object
 */
export function arrayOf(itemValidator: ValueValidator): ValueValidator {
  return list(itemValidator, { minCount: 1 });
}
