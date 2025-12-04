import { isArray, isObject, isString } from "@interpreter/utils/type";
import { defaultObjectParsers, type ObjectParser } from "../object-parsers";

/**
 * Check if a value matches any object parser predicate.
 * Object parsers handle special object structures like { value: 8, unit: "px" }.
 */
function matchesObjectParser(value: unknown, parsers: ObjectParser[]): boolean {
  if (!isObject(value)) return false;
  return parsers.some((parser) => parser.predicate(value));
}

/**
 * Extract string fields from a structured value (object or array).
 * Returns a map of field paths to their string values.
 * Recursively extracts from nested objects and arrays, but skips objects
 * that match an object parser (e.g., { value: 8, unit: "px" }).
 *
 * @param value - The structured value to extract from
 * @param parentPath - The parent token path
 * @param objectParsers - Optional array of object parsers to check against
 * @returns Map of field paths to string values
 *
 * @example
 * extractStringFields({ offsetX: "{base}", offsetY: 4 }, "shadow")
 * => Map { "shadow.offsetX" => "{base}" }
 *
 * @example
 * extractStringFields([{ blur: "{size}", color: "red" }], "shadow")
 * => Map { "shadow[0].blur" => "{size}" }
 *
 * @example
 * // Object parsers prevent extraction from parsed objects
 * extractStringFields({ small: { value: 8, unit: "px" } }, "spacing", parsers)
 * => Map {} // empty, because { value, unit } matches NumberWithUnit parser
 */
export function extractStringFields(
  value: unknown,
  parentPath: string,
  objectParsers: ObjectParser[] = defaultObjectParsers,
): Map<string, string> {
  const result = new Map<string, string>();

  const processValue = (val: unknown, path: string) => {
    if (isString(val)) {
      result.set(path, val);
    } else if (isObject(val)) {
      // Skip objects that match an object parser (they'll be handled as atomic values)
      if (matchesObjectParser(val, objectParsers)) {
        return;
      }
      // Recurse into nested objects
      const nested = extractStringFields(val, path, objectParsers);
      for (const [nestedPath, nestedVal] of nested) {
        result.set(nestedPath, nestedVal);
      }
    } else if (isArray(val)) {
      // Recurse into arrays
      const nested = extractStringFields(val, path, objectParsers);
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
