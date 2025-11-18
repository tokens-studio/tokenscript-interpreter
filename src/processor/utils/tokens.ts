import { getFirstKey, isObject } from "@/src/interpreter/utils/type";

/**
 * Structured token data containing value and optional type information
 */
export interface TokenData {
  $value: unknown;
  $type?: string;
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
      const tokenValue = getFirstKey(["$value", "value"], objValue);

      if (tokenValue !== undefined) {
        // Capture $type if present
        const tokenType = objValue.$type;
        const tokenData: TokenData = {
          $value: tokenValue,
          ...(tokenType !== undefined && { $type: String(tokenType) }),
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

/**
 * Converts a Record to a Map with TokenData values
 */
export function recordToMap(record: Record<string, unknown>): Map<string, TokenData> {
  const map = new Map<string, TokenData>();
  for (const [key, value] of Object.entries(record)) {
    map.set(key, { $value: value });
  }
  return map;
}

/**
 * Detects if an object has nested structure (vs flat tokens).
 */
export function isNested(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).some((key) => {
    const value = obj[key];
    return (
      typeof value === "object" && value !== null && !Array.isArray(value) && !key.startsWith("$")
    );
  });
}
