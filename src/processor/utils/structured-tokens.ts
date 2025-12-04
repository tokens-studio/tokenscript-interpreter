import { isArray, isObject, isString } from "@interpreter/utils/type";

/**
 * Extract string fields from a structured value (object or array).
 * Returns a map of field paths to their string values.
 * Recursively extracts from nested objects and arrays.
 *
 * @param value - The structured value to extract from
 * @param parentPath - The parent token path
 * @returns Map of field paths to string values
 *
 * @example
 * extractStringFields({ offsetX: "{base}", offsetY: 4 }, "shadow")
 * => Map { "shadow.offsetX" => "{base}" }
 *
 * @example
 * extractStringFields([{ blur: "{size}", color: "red" }], "shadow")
 * => Map { "shadow[0].blur" => "{size}" }
 */
export function extractStringFields(value: unknown, parentPath: string): Map<string, string> {
  const result = new Map<string, string>();

  const processValue = (val: unknown, path: string) => {
    if (isString(val)) {
      result.set(path, val);
    } else if (isObject(val) || isArray(val)) {
      // Recurse into nested objects/arrays
      const nested = extractStringFields(val, path);
      for (const [nestedPath, nestedVal] of nested) {
        result.set(nestedPath, nestedVal);
      }
    }
  };

  if (isObject(value)) {
    for (const [key, val] of Object.entries(value)) {
      processValue(val, `${parentPath}.${key}`);
    }
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      processValue(value[i], `${parentPath}[${i}]`);
    }
  }

  return result;
}
