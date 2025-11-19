import type { Config } from "@interpreter/config";
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
