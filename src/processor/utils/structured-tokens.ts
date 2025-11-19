import { isArray, isObject, isString } from "@interpreter/utils/type";

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
