import type { SymbolMetadata } from "@src/types";
import { getKeyAlt, isObject, isString } from "@/src/interpreter/utils/type";

/**
 * Structured token data containing value and optional type information
 */
export interface TokenData {
  $value: unknown;
  $type?: string;
  /**
   * Optional metadata attached to the token.
   * This is passed through to the TokenSymbol and preserved during cloning.
   * Not accessible to the tokenscript language.
   */
  $metadata?: SymbolMetadata;
}

export function getTokenValue(data: string | TokenData): unknown {
  return isString(data) ? data : data.$value;
}

export function setTokenValue(value: string | TokenData): TokenData {
  return isString(value) ? { $value: value } : value;
}

/**
 * Flattens a nested tokens object structure into a flat key-value map with dot-separated paths.
 * Now preserves structured values and captures $type information.
 *
 * @param obj - The nested object to flatten
 * @param prefixAccumulator - Recursion prefix accumulator
 * @returns Flat map of token paths to TokenData
 *
 * @example
 * Input:  { color: { red: { $value: "#FF0000" } } }
 * Output: Map { "color.red" => { $value: "#FF0000" } }
 *
 * @example
 * Input:  { shadow: { $type: "shadow", $value: { offsetX: 0, offsetY: 4 } } }
 * Output: Map { "shadow" => { $value: { offsetX: 0, offsetY: 4 }, $type: "shadow" } }
 */
export function flattenTokensObject(
  obj: Record<string, unknown>,
  prefixAccumulator = "",
): Map<string, TokenData> {
  const result = new Map<string, TokenData>();

  for (const [prefix, value] of Object.entries(obj)) {
    if (prefix.startsWith("$")) {
      continue;
    }

    const path = prefixAccumulator ? `${prefixAccumulator}.${prefix}` : prefix;

    if (isObject(value)) {
      const objValue = value as Record<string, unknown>;
      const tokenValue = getKeyAlt(["$value", "value"], objValue);

      if (tokenValue !== undefined) {
        // Capture $type and $metadata if present
        const tokenType = objValue.$type;
        const tokenMetadata = objValue.$metadata as SymbolMetadata | undefined;
        const tokenData: TokenData = {
          $value: tokenValue,
          ...(tokenType !== undefined && { $type: String(tokenType) }),
          ...(tokenMetadata !== undefined && { $metadata: tokenMetadata }),
        };
        result.set(path, tokenData);
      }
      // Recurse into structure
      else {
        const nested = flattenTokensObject(objValue, path);
        for (const [nestedKey, nestedValue] of nested) {
          result.set(nestedKey, nestedValue);
        }
      }
    }
    // Primitive values are stored directly
    else {
      result.set(path, { $value: value });
    }
  }

  return result;
}

export function normalizeToTokenData(value: unknown): TokenData {
  if (typeof value === "string") {
    return { $value: value };
  }
  if (isObject(value) && "$value" in value) {
    const obj = value as Record<string, unknown>;
    const metadata = obj.$metadata as SymbolMetadata | undefined;
    return {
      $value: obj.$value,
      ...(isString(obj.$type) && { $type: obj.$type }),
      ...(metadata !== undefined && { $metadata: metadata }),
    };
  }
  return { $value: value };
}

export function recordToMap(record: Record<string, unknown>): Map<string, TokenData> {
  const map = new Map<string, TokenData>();
  for (const [key, value] of Object.entries(record)) {
    map.set(key, normalizeToTokenData(value));
  }
  return map;
}

export function isNested(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).some((key) => {
    const value = obj[key];
    return isObject(value) && !key.startsWith("$");
  });
}
