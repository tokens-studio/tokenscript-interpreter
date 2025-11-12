import type { interpreterResult } from "@interpreter/interpreter";
import { DictionarySymbol } from "@interpreter/symbols";

export type FlattenCallback<T> = (key: string, value: interpreterResult) => T;

/**
 * Flatten a DictionarySymbol into key-value pairs
 *
 * @param result - The interpreterResult to flatten (only DictionarySymbol will be flattened)
 * @param prefix - The prefix to prepend to keys
 * @param callback - Callback function that receives each flattened key-value pair
 *
 * @example
 * const result: Record<string, unknown> = {};
 * flattenChildrenObject(dictionarySymbol, "root", (key, value) => {
 *   result[key] = value;
 * });
 */
export function flattenChildrenObject<T>(
  result: interpreterResult,
  prefix: string,
  callback: FlattenCallback<T>,
): void {
  if (result instanceof DictionarySymbol) {
    flattenChildrenMap(result.value, prefix, callback);
  }
}

/**
 * Flatten a Map structure into key-value pairs
 *
 * @param map - The map to flatten (from Dictionary.value)
 * @param prefix - The prefix to prepend to keys
 * @param callback - Callback function that receives each flattened key-value pair
 *
 * @example
 * const result = new Map<string, unknown>();
 * flattenChildrenMap(dictionarySymbol.value, "root", (key, value) => {
 *   result.set(key, value);
 * });
 */
export function flattenChildrenMap<T>(
  map: Map<string, interpreterResult>,
  prefix: string,
  callback: FlattenCallback<T>,
): void {
  for (const [key, value] of map.entries()) {
    const newKey = `${prefix}.${key}`;

    if (typeof value === "undefined") {
      continue;
    }

    if (value instanceof DictionarySymbol) {
      flattenChildrenMap(value.value, newKey, callback);
    } else {
      callback(newKey, value);
    }
  }
}
