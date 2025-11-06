/**
 * Utility functions for token processing
 */

/**
 * Flattens a nested object structure into a flat key-value map with dot-separated paths.
 *
 * @param obj - The nested object to flatten
 * @param prefix - Current path prefix (used in recursion)
 * @param skipMetadata - Whether to skip keys starting with $
 * @returns Flat map of token paths to values
 *
 * @example
 * Input:  { color: { red: { $value: "#FF0000" } } }
 * Output: Map { "color.red" => "#FF0000" }
 */
export function flattenObject(
  obj: Record<string, any>,
  prefix = "",
  skipMetadata = true,
): Map<string, string> {
  const result = new Map<string, string>();

  for (const [key, value] of Object.entries(obj)) {
    // Skip metadata keys if configured
    if (skipMetadata && key.startsWith("$")) {
      continue;
    }

    const path = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      // Check for token with $value property (Design Tokens format)
      if ("$value" in value) {
        result.set(path, String(value.$value));
      }
      // Check for token with value property (legacy format)
      else if ("value" in value) {
        result.set(path, String(value.value));
      }
      // Otherwise, recurse into nested object
      else {
        const nested = flattenObject(value, path, skipMetadata);
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
export function recordToMap(record: Record<string, any>): Map<string, string> {
  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(record)) {
    map.set(key, String(value));
  }
  return map;
}

/**
 * Detects if an object has nested structure (vs flat tokens).
 */
export function isNested(obj: Record<string, any>): boolean {
  return Object.keys(obj).some(
    (key) =>
      typeof obj[key] === "object" &&
      obj[key] !== null &&
      !Array.isArray(obj[key]) &&
      !key.startsWith("$"),
  );
}
