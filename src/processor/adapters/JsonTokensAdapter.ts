import { isObject } from "@/src/interpreter/utils/type";
import type { AdapterOptions, TokenAdapter } from "./types";
import { flattenObject, isNested, recordToMap } from "./utils";

/**
 * Adapter for processing nested JSON tokens (Design Tokens format)
 *
 * Handles both:
 * - Nested structure: { color: { red: { $value: "#FF0000" } } }
 * - Flat structure: { "color.red": "#FF0000" }
 *
 * @example
 * const adapter = JsonTokensAdapter();
 * const tokens = adapter({ color: { red: { $value: "#FF0000" } } });
 * // => Map { "color.red" => "#FF0000" }
 */
export function JsonTokensAdapter(options: AdapterOptions = {}): TokenAdapter<Record<string, any>> {
  const { prefix = "", skipMetadata = true } = options;

  return (input: Record<string, any>): Map<string, string> => {
    if (!isObject(input)) {
      throw new Error("JsonTokensAdapter: Expected an object");
    }

    const tokens: Map<string, string> = isNested(input)
      ? flattenObject(input, "", skipMetadata)
      : recordToMap(input);

    // Apply prefix if specified
    if (prefix) {
      const prefixed = new Map<string, string>();
      for (const [key, value] of tokens) {
        prefixed.set(`${prefix}.${key}`, value);
      }
      return prefixed;
    }

    return tokens;
  };
}
