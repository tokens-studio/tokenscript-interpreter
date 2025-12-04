import type { Config } from "@interpreter/config";
import type { InterpreterResult } from "@interpreter/interpreter";
import { jsValueToSymbolType, TokenSymbol } from "@interpreter/symbols";
import { isArray, isObject } from "@interpreter/utils/type";
import type { ISymbolType } from "@src/types";
import { defaultObjectParsers, type ObjectParser } from ".";

export function parseValueToSymbol(
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

export function createTokenSymbol(
  value: unknown,
  tokenType: string = "unknown",
  config?: Config,
  parsers: ObjectParser[] = defaultObjectParsers,
): TokenSymbol {
  // Convert object fields to symbols
  if (isObject(value)) {
    const symbolMap: Record<string, ISymbolType> = {};
    for (const [key, val] of Object.entries(value)) {
      symbolMap[key] = parseValueToSymbol(val, config, parsers) as ISymbolType;
    }
    return new TokenSymbol(tokenType, symbolMap, config);
  }

  // Convert array elements to symbols
  if (isArray(value)) {
    const symbolArray = value.map((val) => parseValueToSymbol(val, config, parsers) as ISymbolType);
    return new TokenSymbol(tokenType, symbolArray, config);
  }

  // Fallback for other types
  return new TokenSymbol(tokenType, value as Record<string, any>, config);
}

/**
 * Helper function to recursively build values from resolved fields.
 * Handles nested objects and arrays.
 *
 * @param currentPath - The current path being processed
 * @param originalValue - The original value at this path
 * @param resolvedFields - Map of field paths to resolved values
 * @param config - Optional config
 * @param parsers - Optional custom object parsers
 * @returns ISymbolType representation of the value
 */
function buildValueFromResolvedFields(
  currentPath: string,
  originalValue: unknown,
  resolvedFields: Map<string, InterpreterResult>,
  config?: Config,
  parsers: ObjectParser[] = defaultObjectParsers,
): ISymbolType {
  // If this exact path is resolved, use it
  if (resolvedFields.has(currentPath)) {
    return resolvedFields.get(currentPath) as ISymbolType;
  }

  // Handle objects
  if (isObject(originalValue)) {
    const symbolMap: Record<string, ISymbolType> = {};
    for (const [key, val] of Object.entries(originalValue)) {
      const fieldPath = `${currentPath}.${key}`;
      symbolMap[key] = buildValueFromResolvedFields(fieldPath, val, resolvedFields, config, parsers);
    }
    return symbolMap as unknown as ISymbolType;
  }

  // Handle arrays
  if (isArray(originalValue)) {
    const symbolArray: ISymbolType[] = [];
    for (let i = 0; i < originalValue.length; i++) {
      const fieldPath = `${currentPath}[${i}]`;
      symbolArray.push(
        buildValueFromResolvedFields(fieldPath, originalValue[i], resolvedFields, config, parsers),
      );
    }
    return symbolArray as unknown as ISymbolType;
  }

  // Primitive values - convert to symbol
  return parseValueToSymbol(originalValue, config, parsers) as ISymbolType;
}

/**
 * Create a TokenSymbol from resolved fields and original structured value.
 * This combines the original value with resolved fields to build the final TokenSymbol.
 * Handles nested objects and arrays recursively.
 *
 * @param tokenName - The parent token name
 * @param resolvedFields - Map of field paths to resolved values
 * @param originalValue - The original structured value
 * @param tokenType - The token type
 * @param config - Optional config
 * @param parsers - Optional custom object parsers
 * @returns TokenSymbol with resolved values
 */
export function createTokenSymbolFromResolvedFields(
  tokenName: string,
  resolvedFields: Map<string, InterpreterResult>,
  originalValue: unknown,
  tokenType: string = "unknown",
  config?: Config,
  parsers: ObjectParser[] = defaultObjectParsers,
): TokenSymbol {
  if (isObject(originalValue)) {
    const symbolMap: Record<string, ISymbolType> = {};
    for (const [key, val] of Object.entries(originalValue)) {
      const fieldPath = `${tokenName}.${key}`;
      symbolMap[key] = buildValueFromResolvedFields(fieldPath, val, resolvedFields, config, parsers);
    }
    return new TokenSymbol(tokenType, symbolMap, config);
  }

  if (isArray(originalValue)) {
    const symbolArray: ISymbolType[] = [];
    for (let i = 0; i < originalValue.length; i++) {
      const fieldPath = `${tokenName}[${i}]`;
      symbolArray.push(
        buildValueFromResolvedFields(fieldPath, originalValue[i], resolvedFields, config, parsers),
      );
    }
    return new TokenSymbol(tokenType, symbolArray, config);
  }

  // Fallback for other types
  return new TokenSymbol(tokenType, originalValue as Record<string, any>, config);
}
