import type { Config } from "@interpreter/config";
import type { ISymbolType } from "@src/types";

/**
 * ObjectParser allows custom transformation of structured values into interpreter symbols.
 * This is useful for parsing complex nested structures like { value: 1, unit: "rem" } into NumberWithUnitSymbol.
 *
 * @example
 * const numberWithUnitParser: ObjectParser = {
 *   predicate: (value) => isObject(value) && 'value' in value && 'unit' in value,
 *   toSymbol: ({ value, unit }, config) => new NumberWithUnitSymbol(value, unit, config)
 * }
 */
export type ObjectParser = {
  /**
   * Check if this parser should handle the given value
   */
  predicate: (value: unknown) => boolean;

  /**
   * Convert the matched value to an interpreter symbol
   */
  toSymbol: (value: any, config?: Config) => ISymbolType;
};
