import type { Config } from "@interpreter/config";
import type { InterpreterResult } from "@interpreter/interpreter";
import {
  BooleanSymbol,
  jsValueToSymbolType,
  NumberSymbol,
  TokenSymbol,
} from "@interpreter/symbols";
import { isArray, isBoolean, isNumber, isObject, isString } from "@interpreter/utils/type";
import type { ISymbolType } from "@src/types";
import { defaultObjectParsers, type ObjectParser } from "../parsers/object-parsers";

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

/**
 * Convert JavaScript values to interpreter symbols recursively.
 * This ensures that all values in a structured token can be used by the interpreter.
 *
 * @param value - The value to convert (can be primitive, object, array, or already a symbol)
 * @param config - Optional interpreter config
 * @param parsers - Optional array of custom object parsers
 * @returns The value converted to a symbol type
 */
function convertToSymbol(
  value: unknown,
  config?: Config,
  parsers: ObjectParser[] = defaultObjectParsers,
): ISymbolType | unknown {
  // If already a symbol, return as-is
  if (value && typeof value === "object" && "getTypeName" in value) {
    return value;
  }

  // Try custom object parsers first
  for (const parser of parsers) {
    if (parser.predicate(value)) {
      return parser.toSymbol(value, config);
    }
  }

  // Fallback to default jsValueToSymbolType for primitives, objects, and arrays
  return jsValueToSymbolType(value, config);
}

/**
 * Wrap a structured token value in a TokenSymbol for use in the reference cache.
 * This allows other tokens to reference it and call methods like .get() on it.
 * All field values are converted to interpreter symbols using the provided parsers.
 *
 * @param assembledValue - The assembled structured value (object or array)
 * @param tokenType - The token type (from $type field, or 'unknown')
 * @param config - Optional interpreter config
 * @param parsers - Optional array of custom object parsers (defaults to defaultObjectParsers)
 * @returns A TokenSymbol wrapping the structured value with symbol-converted fields
 *
 * @example
 * wrapStructuredTokenAsSymbol({ offsetX: 0 }, "shadow")
 * => TokenSymbol with Map { "offsetX" => NumberSymbol(0) }
 *
 * @example
 * wrapStructuredTokenAsSymbol(
 *   { offsetX: { value: 1, unit: "rem" }, offsetY: 1 },
 *   "shadow",
 *   undefined,
 *   [numberWithUnitParser]
 * )
 * => TokenSymbol with Map { "offsetX" => NumberWithUnitSymbol(1, "rem"), "offsetY" => NumberSymbol(1) }
 */
export function wrapStructuredTokenAsSymbol(
  assembledValue: unknown,
  tokenType: string = "unknown",
  config?: Config,
  parsers: ObjectParser[] = defaultObjectParsers,
): TokenSymbol {
  // Convert all fields to symbols
  if (isObject(assembledValue)) {
    const symbolMap: Record<string, ISymbolType> = {};
    for (const [key, val] of Object.entries(assembledValue)) {
      symbolMap[key] = convertToSymbol(val, config, parsers) as ISymbolType;
    }
    return new TokenSymbol(tokenType, symbolMap, config);
  }

  if (isArray(assembledValue)) {
    const symbolArray = assembledValue.map(
      (val) => convertToSymbol(val, config, parsers) as ISymbolType,
    );
    return new TokenSymbol(tokenType, symbolArray, config);
  }

  // Fallback for other types
  return new TokenSymbol(tokenType, assembledValue as Record<string, any>, config);
}
