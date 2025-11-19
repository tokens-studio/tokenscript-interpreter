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
 * Create a TokenSymbol from resolved fields and original structured value.
 * This combines the original value with resolved fields to build the final TokenSymbol.
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
      if (resolvedFields.has(fieldPath)) {
        // Use the resolved value (already a symbol)
        symbolMap[key] = resolvedFields.get(fieldPath) as ISymbolType;
      } else {
        // Convert the original value to a symbol
        symbolMap[key] = parseValueToSymbol(val, config, parsers) as ISymbolType;
      }
    }
    return new TokenSymbol(tokenType, symbolMap, config);
  }

  if (isArray(originalValue)) {
    const symbolArray: ISymbolType[] = [];
    for (let i = 0; i < originalValue.length; i++) {
      const fieldPath = `${tokenName}[${i}]`;
      if (resolvedFields.has(fieldPath)) {
        // Use the resolved value (already a symbol)
        symbolArray.push(resolvedFields.get(fieldPath) as ISymbolType);
      } else {
        // Convert the original value to a symbol
        symbolArray.push(parseValueToSymbol(originalValue[i], config, parsers) as ISymbolType);
      }
    }
    return new TokenSymbol(tokenType, symbolArray, config);
  }

  // Fallback for other types
  return new TokenSymbol(tokenType, originalValue as Record<string, any>, config);
}
