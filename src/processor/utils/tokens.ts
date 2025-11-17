import { getFirstKey, isObject } from "@/src/interpreter/utils/type";

/**
 * Flattens a nested tokens object structure into a flat key-value map with dot-separated paths.
 *
 * @param obj - The nested object to flatten
 * @param prefixAccumulator - Recursion prefix accumulator
 * @returns Flat map of token paths to values
 *
 * @example
 * Input:  { color: { red: { $value: "#FF0000" } } }
 * Output: Map { "color.red" => "#FF0000" }
 */
export function flattenTokensObject(
  obj: Record<string, unknown>,
  prefixAccumulator = "",
): Map<string, string> {
  const result = new Map<string, string>();

  for (const [prefix, value] of Object.entries(obj)) {
    if (prefix.startsWith("$")) {
      continue;
    }

    const path = prefixAccumulator ? `${prefixAccumulator}.${prefix}` : prefix;

    if (isObject(value)) {
      const objValue = value as Record<string, unknown>;
      const tokenValue = getFirstKey(["$value", "value"], objValue);

      if (tokenValue) {
        result.set(path, String(tokenValue));
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
      result.set(path, String(value));
    }
  }

  return result;
}

/**
 * Converts a Record to a Map with string values
 */
export function recordToMap(record: Record<string, unknown>): Map<string, string> {
  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(record)) {
    map.set(key, String(value));
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
