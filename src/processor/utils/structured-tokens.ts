import type { Config } from "@interpreter/config";
import type { InterpreterResult } from "@interpreter/interpreter";
import { BooleanSymbol, NumberSymbol } from "@interpreter/symbols";
import { isArray, isBoolean, isNumber, isObject, isString } from "@interpreter/utils/type";

/**
 * Check if a value is a primitive (string, number, boolean, null, undefined)
 */
export function isPrimitive(value: unknown): value is string | number | boolean | null | undefined {
  return (
    value === null || value === undefined || isString(value) || isNumber(value) || isBoolean(value)
  );
}

/**
 * Convert a JavaScript primitive directly to a TokenScript symbol
 */
export function primitiveToSymbol(value: unknown, config?: Config): InterpreterResult {
  if (value === null || value === undefined) {
    return String(value);
  }
  if (isNumber(value)) {
    return new NumberSymbol(value, config);
  }
  if (isBoolean(value)) {
    return new BooleanSymbol(value, config);
  }
  // String values still need to be parsed for references
  return String(value);
}

/**
 * Extract string fields from a structured value (object or array).
 * Returns a map of field paths to their string values.
 *
 * @param value - The structured value to extract from
 * @param parentPath - The parent token path
 * @returns Map of field paths to string values
 *
 * @example
 * extractStringFields({ offsetX: "{base}", offsetY: 4 }, "shadow")
 * => Map { "shadow.offsetX" => "{base}" }
 */
export function extractStringFields(value: unknown, parentPath: string): Map<string, string> {
  const result = new Map<string, string>();

  if (isObject(value)) {
    for (const [key, val] of Object.entries(value)) {
      const path = `${parentPath}.${key}`;
      if (isString(val)) {
        result.set(path, val);
      }
      // For now: skip nested objects/arrays
      // Future: could recurse for deeper structures
    }
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      const path = `${parentPath}[${i}]`;
      if (isString(item)) {
        result.set(path, item);
      }
      // For now: skip nested objects in arrays
    }
  }

  return result;
}

/**
 * Assemble a structured token from resolved sub-fields.
 * Replaces string values with their resolved counterparts.
 *
 * @param tokenName - The parent token name
 * @param resolvedFields - Map of field paths to resolved values
 * @param originalValue - The original structured value
 * @returns The assembled structure with resolved values
 *
 * @example
 * assembleStructuredToken(
 *   "shadow",
 *   Map { "shadow.offsetX" => NumberSymbol(2) },
 *   { offsetX: "{base}", offsetY: 4 }
 * )
 * => { offsetX: NumberSymbol(2), offsetY: 4 }
 */
export function assembleStructuredToken(
  tokenName: string,
  resolvedFields: Map<string, InterpreterResult>,
  originalValue: unknown,
): unknown {
  if (isObject(originalValue)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(originalValue)) {
      const path = `${tokenName}.${key}`;
      if (resolvedFields.has(path)) {
        result[key] = resolvedFields.get(path);
      } else {
        result[key] = val;
      }
    }
    return result;
  }

  if (isArray(originalValue)) {
    const result: unknown[] = [];
    for (let i = 0; i < originalValue.length; i++) {
      const path = `${tokenName}[${i}]`;
      if (resolvedFields.has(path)) {
        result.push(resolvedFields.get(path));
      } else {
        result.push(originalValue[i]);
      }
    }
    return result;
  }

  return originalValue;
}
